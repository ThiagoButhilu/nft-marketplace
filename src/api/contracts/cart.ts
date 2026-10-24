import { z } from 'zod'
import { EthAmount, IsoDateTime, Network } from './common'
import { EditionKind } from './nfts'

export const CartLine = z.object({
  nftId: z.string(),
  editionId: z.string(),
  editionKind: EditionKind,
  name: z.string(),
  tokenId: z.string(),
  imageUrl: z.string(),
  imageAlt: z.string(),
  network: Network,
  quantity: z.number().int().positive(),
  /** Current catalog price per unit. */
  unitPrice: EthAmount,
  lineTotal: EthAmount,
  /** Units still available for this edition (including the ones in the cart). */
  available: z.number().int().min(0),
  maxPerOrder: z.number().int().positive(),
  nftVersion: z.number().int(),
  /**
   * The catalog price moved since the visitor last saw it. Stays true until
   * acknowledged with POST /cart/acknowledge; checkout is blocked meanwhile.
   */
  priceChanged: z.boolean(),
  previousUnitPrice: EthAmount.nullable(),
})
export type CartLine = z.infer<typeof CartLine>

export const Cart = z.object({
  id: z.string(),
  lines: z.array(CartLine),
  couponCode: z.string().nullable(),
  itemCount: z.number().int().min(0),
  updatedAt: IsoDateTime,
})
export type Cart = z.infer<typeof Cart>

export const AddCartItemRequest = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().positive(),
})
export type AddCartItemRequest = z.infer<typeof AddCartItemRequest>

export const UpdateCartItemRequest = z.object({
  quantity: z.number().int().positive(),
})
export type UpdateCartItemRequest = z.infer<typeof UpdateCartItemRequest>

export const ApplyCouponRequest = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Informe um código')
    .max(32, 'Máximo de 32 caracteres'),
})
export type ApplyCouponRequest = z.infer<typeof ApplyCouponRequest>
