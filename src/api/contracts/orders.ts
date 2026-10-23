import { z } from 'zod'
import { Email } from './auth'
import { EthAmount, IsoDateTime, Network, WalletProvider } from './common'
import { QuoteLine } from './quote'

export const OrderStatus = z.enum(['pending', 'confirmed', 'declined'])
export type OrderStatus = z.infer<typeof OrderStatus>

export const TERMINAL_ORDER_STATUSES: ReadonlyArray<OrderStatus> = [
  'confirmed',
  'declined',
]

export const CollectorDetails = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(48),
  username: z.string().trim().min(3, 'Informe o nome de usuário').max(24),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(48),
  email: Email,
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,}$/i, 'Nome ENS inválido'),
  referralCode: z
    .string()
    .trim()
    .min(4, 'Informe o código de indicação')
    .max(16),
  note: z.string().trim().max(280).optional(),
})
export type CollectorDetails = z.infer<typeof CollectorDetails>

export const CreateOrderRequest = z.object({
  quoteId: z.string(),
  walletId: z.string(),
  network: Network,
  collector: CollectorDetails,
})
export type CreateOrderRequest = z.infer<typeof CreateOrderRequest>

/**
 * Immutable snapshot taken when the order is created. Later catalog
 * changes never touch these values.
 */
export const Order = z.object({
  id: z.string(),
  status: OrderStatus,
  /** Increments on every status change; used to order `order.updated` events. */
  version: z.number().int().min(1),
  idempotencyKey: z.string(),
  network: Network,
  wallet: z.object({
    id: z.string(),
    provider: WalletProvider,
    label: z.string(),
    address: z.string(),
  }),
  lines: z.array(QuoteLine),
  couponCode: z.string().nullable(),
  subtotal: EthAmount,
  discount: EthAmount,
  networkFee: EthAmount,
  total: EthAmount,
  /** Simulated transaction hash; null until the chain sees it. */
  transactionHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
})
export type Order = z.infer<typeof Order>

export const OrderList = z.object({ items: z.array(Order) })
