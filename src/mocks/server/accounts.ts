import type {
  ChangePasswordRequest,
  LoginRequest,
  Profile,
  Session,
  SignupRequest,
  UpdateProfileRequest,
  User,
  Wallet,
  WalletConnection,
  WalletInput,
} from '@/api/contracts'
import { MAX_AVATAR_BYTES } from '@/api/contracts'
import { scenario } from '../scenarios'
import { getNftRecord } from './catalog'
import { mergeGuestCart } from './cart'
import { hashPassword, randomToken, verifyPassword } from './crypto'
import { MockApiError, notFound } from './errors'
import { store, type SessionRecord, type UserRecord } from './store'

export function toUser(user: UserRecord): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}

function toSession(session: SessionRecord): Session {
  return {
    token: session.token,
    expiresAt: new Date(session.expiresAt).toISOString(),
    user: toUser(store.db.users[session.userId]),
  }
}

/** Resolves a bearer token. Distinguishes unknown tokens from expired ones. */
export function resolveSession(token: string): SessionRecord {
  const session = store.db.sessions[token]
  if (!session)
    throw new MockApiError(
      401,
      'UNAUTHENTICATED',
      'Sessão inválida. Entre novamente.',
    )
  if (session.expiresAt <= Date.now()) {
    throw new MockApiError(
      401,
      'SESSION_EXPIRED',
      'Sua sessão expirou. Entre novamente.',
    )
  }
  return session
}

export function findValidSession(token: string | null) {
  if (!token) return null
  const session = store.db.sessions[token]
  return session && session.expiresAt > Date.now() ? session : null
}

function openSession(userId: string, guestCartId?: string): Session {
  const now = Date.now()
  const session: SessionRecord = {
    token: randomToken(),
    userId,
    createdAt: now,
    expiresAt: now + scenario.config.sessionTtlMs,
  }
  store.mutate((db) => {
    db.sessions[session.token] = session
  })
  if (guestCartId) mergeGuestCart(guestCartId, userId)
  return toSession(session)
}

export function getSession(token: string) {
  return toSession(resolveSession(token))
}

export async function login(input: LoginRequest) {
  const user = Object.values(store.db.users).find(
    (u) => u.email === input.email,
  )
  const ok =
    user &&
    (await verifyPassword(input.password, user.passwordSalt, user.passwordHash))
  if (!user || !ok) {
    throw new MockApiError(
      401,
      'INVALID_CREDENTIALS',
      'E-mail ou senha incorretos.',
    )
  }
  return openSession(user.id, input.guestCartId)
}

function assertUnique(email: string, username: string, exceptUserId?: string) {
  const others = Object.values(store.db.users).filter(
    (u) => u.id !== exceptUserId,
  )
  if (others.some((u) => u.email === email)) {
    throw new MockApiError(
      409,
      'EMAIL_TAKEN',
      'Este e-mail já está cadastrado.',
      {
        email: ['Este e-mail já está cadastrado.'],
      },
    )
  }
  if (others.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new MockApiError(
      409,
      'USERNAME_TAKEN',
      'Este nome de usuário já está em uso.',
      {
        username: ['Este nome de usuário já está em uso.'],
      },
    )
  }
}

export async function signup(input: SignupRequest) {
  assertUnique(input.email, input.username)
  const id = store.nextId('usr')
  const passwordSalt = randomToken(8)
  const passwordHash = await hashPassword(input.password, passwordSalt)
  store.mutate((db) => {
    db.users[id] = {
      id,
      username: input.username,
      email: input.email,
      displayName: input.username,
      ensName: null,
      walletNickname: null,
      avatarUrl: null,
      passwordSalt,
      passwordHash,
      updatedAt: new Date().toISOString(),
    }
    db.favorites[id] = []
    db.wallets[id] = []
  })
  return openSession(id, input.guestCartId)
}

export function logout(token: string) {
  store.mutate((db) => {
    delete db.sessions[token]
  })
}

/** Mock control: expires every active session (or one user's). */
export function expireSessions(userId?: string) {
  store.mutate((db) => {
    for (const session of Object.values(db.sessions)) {
      if (!userId || session.userId === userId)
        session.expiresAt = Date.now() - 1
    }
  })
}

// --- Profile --------------------------------------------------------------

export function getProfile(userId: string): Profile {
  const user = store.db.users[userId]
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    ensName: user.ensName,
    walletNickname: user.walletNickname,
    avatarUrl: user.avatarUrl,
    updatedAt: user.updatedAt,
  }
}

export function updateProfile(userId: string, input: UpdateProfileRequest) {
  assertUnique(input.email, input.username, userId)
  store.mutate((db) => {
    Object.assign(db.users[userId], input, {
      updatedAt: new Date().toISOString(),
    })
  })
  return getProfile(userId)
}

export function updateAvatar(userId: string, dataUrl: string | null) {
  if (dataUrl) {
    const bytes = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75)
    if (bytes > MAX_AVATAR_BYTES) {
      throw new MockApiError(
        422,
        'VALIDATION_ERROR',
        'A imagem deve ter no máximo 512 KB.',
        {
          dataUrl: ['A imagem deve ter no máximo 512 KB.'],
        },
      )
    }
  }
  store.mutate((db) => {
    db.users[userId].avatarUrl = dataUrl
    db.users[userId].updatedAt = new Date().toISOString()
  })
  return getProfile(userId)
}

export async function changePassword(
  userId: string,
  input: ChangePasswordRequest,
) {
  const user = store.db.users[userId]
  if (
    !(await verifyPassword(
      input.currentPassword,
      user.passwordSalt,
      user.passwordHash,
    ))
  ) {
    throw new MockApiError(422, 'VALIDATION_ERROR', 'Senha atual incorreta.', {
      currentPassword: ['Senha atual incorreta.'],
    })
  }
  if (input.currentPassword === input.newPassword) {
    throw new MockApiError(
      422,
      'VALIDATION_ERROR',
      'A nova senha deve ser diferente da atual.',
      {
        newPassword: ['A nova senha deve ser diferente da atual.'],
      },
    )
  }
  const passwordSalt = randomToken(8)
  const passwordHash = await hashPassword(input.newPassword, passwordSalt)
  store.mutate((db) => {
    Object.assign(db.users[userId], {
      passwordSalt,
      passwordHash,
      updatedAt: new Date().toISOString(),
    })
  })
}

// --- Wallets --------------------------------------------------------------

export function listWallets(userId: string): Wallet[] {
  return store.db.wallets[userId] ?? []
}

export function getWallet(userId: string, walletId: string) {
  const wallet = listWallets(userId).find((w) => w.id === walletId)
  if (!wallet) throw notFound('Carteira')
  return wallet
}

/** The same address cannot back two wallets of one account. */
function assertUniqueAddress(
  userId: string,
  address: string,
  exceptWalletId?: string,
) {
  const taken = listWallets(userId).some(
    (w) =>
      w.id !== exceptWalletId &&
      w.address.toLowerCase() === address.toLowerCase(),
  )
  if (taken) {
    throw new MockApiError(
      409,
      'CONFLICT',
      'Este endereço já está em outra carteira sua.',
      {
        address: ['Este endereço já está em outra carteira sua.'],
      },
    )
  }
}

export function createWallet(userId: string, input: WalletInput) {
  if (listWallets(userId).some((w) => w.role === input.role)) {
    const label = input.role === 'primary' ? 'principal' : 'secundária'
    throw new MockApiError(
      409,
      'CONFLICT',
      `Você já tem uma carteira ${label}. Edite a existente.`,
    )
  }
  assertUniqueAddress(userId, input.address)
  const wallet: Wallet = {
    ...input,
    id: store.nextId('wal'),
    updatedAt: new Date().toISOString(),
  }
  store.mutate((db) => {
    db.wallets[userId] = [...listWallets(userId), wallet]
  })
  return wallet
}

export function updateWallet(
  userId: string,
  walletId: string,
  input: WalletInput,
) {
  const current = getWallet(userId, walletId)
  if (
    input.role !== current.role &&
    listWallets(userId).some((w) => w.role === input.role)
  ) {
    throw new MockApiError(
      409,
      'CONFLICT',
      'Já existe uma carteira com esse papel.',
    )
  }
  assertUniqueAddress(userId, input.address, walletId)
  const updated: Wallet = {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  }
  store.mutate((db) => {
    db.wallets[userId] = listWallets(userId).map((w) =>
      w.id === walletId ? updated : w,
    )
  })
  return updated
}

export function connectWallet(
  userId: string,
  walletId: string,
  network: Wallet['network'],
): WalletConnection {
  const wallet = getWallet(userId, walletId)
  if (scenario.config.walletRejects) {
    throw new MockApiError(
      422,
      'WALLET_REJECTED',
      'A carteira recusou a conexão.',
    )
  }
  return {
    walletId: wallet.id,
    network,
    address: wallet.address,
    connectedAt: new Date().toISOString(),
  }
}

// --- Favorites ------------------------------------------------------------

export function listFavorites(userId: string) {
  return { nftIds: store.db.favorites[userId] ?? [] }
}

export function setFavorite(userId: string, nftId: string, favorite: boolean) {
  getNftRecord(nftId)
  store.mutate((db) => {
    const current = new Set(db.favorites[userId] ?? [])
    if (favorite) current.add(nftId)
    else current.delete(nftId)
    db.favorites[userId] = [...current]
  })
  return listFavorites(userId)
}
