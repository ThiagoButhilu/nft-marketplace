import { z } from 'zod'
import { Email, Password, Username } from './auth'
import { IsoDateTime, Network, WalletProvider } from './common'

export const Profile = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
  ensName: z.string().nullable(),
  walletNickname: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  updatedAt: IsoDateTime,
})
export type Profile = z.infer<typeof Profile>

export const UpdateProfileRequest = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Informe o nome de exibição')
    .max(48, 'Máximo de 48 caracteres'),
  username: Username,
  email: Email,
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,}$/i, 'Use letras, números ou hífen (mín. 3)')
    .nullable(),
  walletNickname: z
    .string()
    .trim()
    .min(2, 'Informe o apelido')
    .max(32, 'Máximo de 32 caracteres'),
})
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>

export const MAX_AVATAR_BYTES = 512 * 1024
export const AVATAR_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const

/** Avatar travels as a data URL; the mock stores it as-is. */
export const UpdateAvatarRequest = z.object({
  dataUrl: z
    .string()
    .regex(
      /^data:image\/(png|jpeg|webp);base64,/,
      'Formato de imagem inválido',
    ),
})
export type UpdateAvatarRequest = z.infer<typeof UpdateAvatarRequest>

export const ChangePasswordRequest = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: Password,
})
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequest>

export const WalletRole = z.enum(['primary', 'secondary'])
export type WalletRole = z.infer<typeof WalletRole>

export const EvmAddress = z
  .string()
  .trim()
  .regex(
    /^0x[a-fA-F0-9]{40}$/,
    'Endereço 0x inválido (40 caracteres hexadecimais)',
  )

export const Wallet = z.object({
  id: z.string(),
  role: WalletRole,
  provider: WalletProvider,
  network: Network,
  label: z.string(),
  displayName: z.string(),
  profileName: z.string(),
  address: z.string(),
  secondaryAddress: z.string().nullable(),
  ensName: z.string().nullable(),
  email: z.string(),
  referralCode: z.string(),
  updatedAt: IsoDateTime,
})
export type Wallet = z.infer<typeof Wallet>

export const WalletInput = z.object({
  role: WalletRole,
  provider: WalletProvider,
  network: Network,
  label: z
    .string()
    .trim()
    .min(2, 'Informe o apelido da carteira')
    .max(32, 'Máximo de 32 caracteres'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Informe o nome de exibição')
    .max(48, 'Máximo de 48 caracteres'),
  profileName: z
    .string()
    .trim()
    .min(2, 'Informe o nome do perfil')
    .max(48, 'Máximo de 48 caracteres'),
  address: EvmAddress,
  secondaryAddress: z
    .string()
    .trim()
    .regex(
      /^(0x[a-fA-F0-9]{40}|[a-z0-9-]{3,}\.eth)$/i,
      'Use um endereço 0x ou nome .eth',
    )
    .nullable(),
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,}$/i, 'Use letras, números ou hífen (mín. 3)')
    .nullable(),
  email: Email,
  referralCode: z
    .string()
    .trim()
    .min(4, 'Informe o código de indicação')
    .max(16, 'Máximo de 16 caracteres'),
})
export type WalletInput = z.infer<typeof WalletInput>

export const WalletList = z.object({ items: z.array(Wallet) })

export const WalletConnection = z.object({
  walletId: z.string(),
  network: Network,
  address: z.string(),
  connectedAt: IsoDateTime,
})
export type WalletConnection = z.infer<typeof WalletConnection>

export const ConnectWalletRequest = z.object({ network: Network })
export type ConnectWalletRequest = z.infer<typeof ConnectWalletRequest>

export const FavoriteList = z.object({
  nftIds: z.array(z.string()),
})
export type FavoriteList = z.infer<typeof FavoriteList>
