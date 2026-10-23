import { z } from 'zod'
import { EthAmount, IsoDateTime, Network } from './common'
import { EditionKind } from './nfts'

export const QuoteLine = z.object({
  nftId: z.string(),
  editionId: z.string(),
  editionKind: EditionKind,
  name: z.string(),
  tokenId: z.string(),
  imageUrl: z.string(),
  imageAlt: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: EthAmount,
  lineTotal: EthAmount,
  nftVersion: z.number().int(),
})
export type QuoteLine = z.infer<typeof QuoteLine>

export const QuoteIssue = z.object({
  nftId: z.string(),
  editionId: z.string(),
  kind: z.enum(['price-changed', 'insufficient-availability', 'sold-out']),
  message: z.string(),
  previousUnitPrice: EthAmount.optional(),
  currentUnitPrice: EthAmount.optional(),
  available: z.number().int().optional(),
})
export type QuoteIssue = z.infer<typeof QuoteIssue>

export const Coupon = z.object({
  code: z.string(),
  description: z.string(),
})

/**
 * Server-side price calculation. The client never computes totals on its
 * own; it renders the quote and sends `quoteId` when placing the order.
 */
export const Quote = z.object({
  id: z.string(),
  network: Network,
  lines: z.array(QuoteLine),
  coupon: Coupon.nullable(),
  subtotal: EthAmount,
  discount: EthAmount,
  networkFee: EthAmount,
  total: EthAmount,
  /** Lines whose price/availability no longer match the cart. */
  issues: z.array(QuoteIssue),
  /** False when issues block checkout. */
  purchasable: z.boolean(),
  createdAt: IsoDateTime,
  expiresAt: IsoDateTime,
})
export type Quote = z.infer<typeof Quote>

export const QuoteRequest = z.object({
  network: Network.default('ethereum'),
})
export type QuoteRequest = z.input<typeof QuoteRequest>
