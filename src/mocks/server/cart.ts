import type {
  AddCartItemRequest,
  Cart,
  CartLine,
  Network,
  Quote,
  QuoteIssue,
} from '@/api/contracts'
import { NETWORK_FEES } from '../fixtures/accounts'
import { getNftRecord } from './catalog'
import { fingerprint } from './crypto'
import { MockApiError, notFound } from './errors'
import { eth, sumEth, toEth } from './money'
import { store, type CartRecord } from './store'

export const userCartKey = (userId: string) => `user:${userId}`
export const guestCartKey = (cartId: string) => `guest:${cartId}`

const QUOTE_TTL_MS = 5 * 60 * 1000

function emptyCart(key: string): CartRecord {
  return {
    key,
    id: key.split(':')[1],
    lines: [],
    couponCode: null,
    updatedAt: new Date().toISOString(),
  }
}

function getCartRecord(key: string) {
  return store.db.carts[key] ?? emptyCart(key)
}

function saveCart(cart: CartRecord) {
  store.mutate((db) => {
    cart.updatedAt = new Date().toISOString()
    db.carts[cart.key] = cart
  })
}

function findEdition(nftId: string, editionId: string) {
  const nft = getNftRecord(nftId)
  const edition = nft.editions.find((e) => e.id === editionId)
  if (!edition) throw notFound('Edição')
  return { nft, edition }
}

function assertQuantity(nftId: string, editionId: string, quantity: number) {
  const { nft, edition } = findEdition(nftId, editionId)
  const limit = Math.min(edition.available, nft.maxPerOrder)
  if (edition.available === 0) {
    throw new MockApiError(
      409,
      'AVAILABILITY_CONFLICT',
      'Esta edição está esgotada.',
      undefined,
      {
        nftId,
        editionId,
        available: 0,
      },
    )
  }
  if (quantity > limit) {
    throw new MockApiError(
      409,
      'AVAILABILITY_CONFLICT',
      `Quantidade máxima para esta edição: ${limit}.`,
      { quantity: [`Máximo de ${limit} unidade(s).`] },
      {
        nftId,
        editionId,
        available: edition.available,
        maxPerOrder: nft.maxPerOrder,
      },
    )
  }
  return nft
}

export function getCart(key: string): Cart {
  const record = getCartRecord(key)
  const lines: CartLine[] = record.lines.map((line) => {
    const { nft, edition } = findEdition(line.nftId, line.editionId)
    const priceChanged = !eth(line.seenUnitPrice).eq(nft.price)
    return {
      nftId: nft.id,
      editionId: edition.id,
      editionKind: edition.kind,
      name: nft.name,
      tokenId: nft.tokenId,
      imageUrl: nft.imageUrl,
      imageAlt: nft.imageAlt,
      network: nft.network,
      quantity: line.quantity,
      unitPrice: nft.price,
      lineTotal: toEth(eth(nft.price).times(line.quantity)),
      available: edition.available,
      maxPerOrder: nft.maxPerOrder,
      nftVersion: nft.version,
      priceChanged,
      previousUnitPrice: priceChanged ? line.seenUnitPrice : null,
    }
  })
  return {
    id: record.id,
    lines,
    couponCode: record.couponCode,
    itemCount: lines.reduce((acc, l) => acc + l.quantity, 0),
    updatedAt: record.updatedAt,
  }
}

export function addItem(key: string, input: AddCartItemRequest) {
  const cart = getCartRecord(key)
  const existing = cart.lines.find(
    (l) => l.nftId === input.nftId && l.editionId === input.editionId,
  )
  const quantity = (existing?.quantity ?? 0) + input.quantity
  const nft = assertQuantity(input.nftId, input.editionId, quantity)
  if (existing) existing.quantity = quantity
  else cart.lines.push({ ...input, seenUnitPrice: nft.price })
  saveCart(cart)
  return getCart(key)
}

export function updateItem(
  key: string,
  nftId: string,
  editionId: string,
  quantity: number,
) {
  const cart = getCartRecord(key)
  const line = cart.lines.find(
    (l) => l.nftId === nftId && l.editionId === editionId,
  )
  if (!line) throw notFound('Item do carrinho')
  assertQuantity(nftId, editionId, quantity)
  line.quantity = quantity
  saveCart(cart)
  return getCart(key)
}

export function removeItem(key: string, nftId: string, editionId: string) {
  const cart = getCartRecord(key)
  cart.lines = cart.lines.filter(
    (l) => !(l.nftId === nftId && l.editionId === editionId),
  )
  saveCart(cart)
  return getCart(key)
}

/** The visitor saw the new prices: clears the `priceChanged` flags. */
export function acknowledgePrices(key: string) {
  const cart = getCartRecord(key)
  for (const line of cart.lines)
    line.seenUnitPrice = getNftRecord(line.nftId).price
  saveCart(cart)
  return getCart(key)
}

function findCoupon(code: string) {
  const coupon = store.db.coupons.find(
    (c) => c.code === code.trim().toUpperCase(),
  )
  if (!coupon) {
    throw new MockApiError(
      422,
      'COUPON_INVALID',
      'Código promocional inválido.',
      {
        code: ['Código promocional inválido.'],
      },
    )
  }
  if (Date.parse(coupon.expiresAt) <= Date.now()) {
    throw new MockApiError(
      422,
      'COUPON_EXPIRED',
      'Este código promocional expirou.',
      {
        code: ['Este código promocional expirou.'],
      },
    )
  }
  return coupon
}

export function applyCoupon(key: string, code: string) {
  const coupon = findCoupon(code)
  const cart = getCartRecord(key)
  cart.couponCode = coupon.code
  saveCart(cart)
  return getCart(key)
}

export function removeCoupon(key: string) {
  const cart = getCartRecord(key)
  cart.couponCode = null
  saveCart(cart)
  return getCart(key)
}

/** Moves a visitor's cart into the user's, capped by availability. */
export function mergeGuestCart(guestCartId: string, userId: string) {
  const guest = store.db.carts[guestCartKey(guestCartId)]
  if (!guest) return
  const target = getCartRecord(userCartKey(userId))
  for (const line of guest.lines) {
    const { nft, edition } = findEdition(line.nftId, line.editionId)
    const existing = target.lines.find(
      (l) => l.nftId === line.nftId && l.editionId === line.editionId,
    )
    const limit = Math.min(edition.available, nft.maxPerOrder)
    const quantity = Math.min((existing?.quantity ?? 0) + line.quantity, limit)
    if (quantity <= 0) continue
    if (existing) existing.quantity = quantity
    else target.lines.push({ ...line, quantity })
  }
  target.couponCode ??= guest.couponCode
  store.mutate((db) => {
    delete db.carts[guest.key]
  })
  saveCart(target)
}

/** Removes exactly the purchased quantities after a confirmed order. */
export function removePurchased(
  userId: string,
  purchased: Array<{ nftId: string; editionId: string; quantity: number }>,
) {
  const cart = getCartRecord(userCartKey(userId))
  for (const item of purchased) {
    const line = cart.lines.find(
      (l) => l.nftId === item.nftId && l.editionId === item.editionId,
    )
    if (line) line.quantity -= item.quantity
  }
  cart.lines = cart.lines.filter((l) => l.quantity > 0)
  cart.couponCode = cart.lines.length ? cart.couponCode : null
  saveCart(cart)
}

// --- Quote ----------------------------------------------------------------

function computeQuote(key: string, network: Network) {
  const cart = getCart(key)
  const issues: QuoteIssue[] = []
  for (const line of cart.lines) {
    if (line.available === 0) {
      issues.push({
        nftId: line.nftId,
        editionId: line.editionId,
        kind: 'sold-out',
        message: `${line.name} esgotou.`,
        available: 0,
      })
    } else if (line.quantity > line.available) {
      issues.push({
        nftId: line.nftId,
        editionId: line.editionId,
        kind: 'insufficient-availability',
        message: `Restam apenas ${line.available} unidade(s) de ${line.name}.`,
        available: line.available,
      })
    }
    if (line.priceChanged) {
      issues.push({
        nftId: line.nftId,
        editionId: line.editionId,
        kind: 'price-changed',
        message: `O preço de ${line.name} mudou de ${line.previousUnitPrice} para ${line.unitPrice} ETH.`,
        previousUnitPrice: line.previousUnitPrice ?? undefined,
        currentUnitPrice: line.unitPrice,
      })
    }
  }

  const subtotal = sumEth(cart.lines.map((l) => eth(l.lineTotal)))
  const coupon = cart.couponCode
    ? store.db.coupons.find((c) => c.code === cart.couponCode)
    : undefined
  const couponActive = coupon && Date.parse(coupon.expiresAt) > Date.now()
  let discount = eth(0)
  if (couponActive) {
    discount =
      coupon.kind === 'percent'
        ? subtotal.times(coupon.value).div(100).round(6, 0)
        : eth(coupon.value).gt(subtotal)
          ? subtotal
          : eth(coupon.value)
  }
  const networkFee = cart.lines.length ? eth(NETWORK_FEES[network]) : eth(0)
  const total = subtotal.minus(discount).plus(networkFee)

  const lines = cart.lines.map((l) => ({
    nftId: l.nftId,
    editionId: l.editionId,
    editionKind: l.editionKind,
    name: l.name,
    tokenId: l.tokenId,
    imageUrl: l.imageUrl,
    imageAlt: l.imageAlt,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    lineTotal: l.lineTotal,
    nftVersion: l.nftVersion,
  }))

  const values = {
    network,
    lines,
    coupon: couponActive
      ? { code: coupon.code, description: coupon.description }
      : null,
    subtotal: toEth(subtotal),
    discount: toEth(discount),
    networkFee: toEth(networkFee),
    total: toEth(total),
  }
  return {
    values,
    issues,
    purchasable: cart.lines.length > 0 && issues.length === 0,
    fingerprint: fingerprint(values),
  }
}

export function createQuote(key: string, network: Network): Quote {
  const computed = computeQuote(key, network)
  const now = Date.now()
  const id = store.nextId('qt')
  store.mutate((db) => {
    // Keep only the latest quote per cart.
    for (const [qid, q] of Object.entries(db.quotes))
      if (q.cartKey === key) delete db.quotes[qid]
    db.quotes[id] = {
      id,
      cartKey: key,
      network,
      fingerprint: computed.fingerprint,
      expiresAt: now + QUOTE_TTL_MS,
    }
  })
  return {
    id,
    ...computed.values,
    issues: computed.issues,
    purchasable: computed.purchasable,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
  }
}

/**
 * Revalidates a quote against the current cart and catalog. Throws with a
 * fresh quote in `details` whenever anything moved.
 */
export function revalidateQuote(
  key: string,
  quoteId: string,
  network: Network,
) {
  const stored = store.db.quotes[quoteId]
  const current = computeQuote(key, network)
  const stale =
    !stored ||
    stored.cartKey !== key ||
    stored.expiresAt <= Date.now() ||
    stored.fingerprint !== current.fingerprint
  if (
    !current.purchasable &&
    current.values.lines.length > 0 &&
    current.issues.some((i) => i.kind !== 'price-changed')
  ) {
    throw new MockApiError(
      409,
      'AVAILABILITY_CONFLICT',
      'A disponibilidade mudou. Revise o pedido.',
      undefined,
      {
        quote: createQuote(key, network),
      },
    )
  }
  if (stale || !current.purchasable) {
    throw new MockApiError(
      409,
      'QUOTE_OUTDATED',
      'Os valores do pedido mudaram. Revise e confirme novamente.',
      undefined,
      {
        quote: createQuote(key, network),
      },
    )
  }
  return current.values
}
