import { z } from 'zod'

// Safety net: any rule without an explicit message (client forms and the mock
// server's fieldErrors share these schemas) falls back to Portuguese, never
// to Zod's English defaults. User-facing rules still set their own message.
z.config(z.locales.ptBR())

/**
 * ETH amounts travel as decimal strings (never JS numbers) to keep precision.
 * Up to 18 fractional digits, matching wei precision.
 */
export const EthAmount = z
  .string()
  .regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')
export type EthAmount = z.infer<typeof EthAmount>

export const IsoDateTime = z.iso.datetime({ offset: true })

export const Network = z.enum(['ethereum', 'polygon', 'solana'])
export type Network = z.infer<typeof Network>

export const WalletProvider = z.enum(['metamask', 'walletconnect', 'coinbase'])
export type WalletProvider = z.infer<typeof WalletProvider>

export const ApiErrorCode = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'EMAIL_TAKEN',
  'USERNAME_TAKEN',
  'INVALID_CREDENTIALS',
  'AVAILABILITY_CONFLICT',
  'QUOTE_OUTDATED',
  'IDEMPOTENCY_CONFLICT',
  'CONFLICT',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'WALLET_REJECTED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
])
export type ApiErrorCode = z.infer<typeof ApiErrorCode>

/** Error envelope shared by every non-2xx response. */
export const ApiErrorBody = z.object({
  error: z.object({
    code: ApiErrorCode,
    message: z.string(),
    /** Field path → messages, for form-bound validation errors. */
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
    /** Machine-readable extra data (e.g. the fresh quote on QUOTE_OUTDATED). */
    details: z.unknown().optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof ApiErrorBody>

export function paginated<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  })
}

/** Header carrying the anonymous cart id for visitors. */
export const CART_ID_HEADER = 'X-Cart-Id'
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key'
