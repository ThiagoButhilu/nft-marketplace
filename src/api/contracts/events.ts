import { z } from 'zod'
import { EthAmount, IsoDateTime } from './common'
import { OrderStatus } from './orders'

/**
 * Socket.IO events. Every event carries a stable `id` (for de-duplication),
 * the affected resource and its `version` (to drop stale events).
 */
const EventBase = z.object({
  id: z.string(),
  occurredAt: IsoDateTime,
  version: z.number().int().min(1),
})

export const NftUpdatedEvent = EventBase.extend({
  type: z.literal('nft.updated'),
  resource: z.object({ type: z.literal('nft'), id: z.string() }),
  data: z.object({
    price: EthAmount,
    compareAtPrice: EthAmount.nullable(),
    soldOut: z.boolean(),
    editions: z.array(
      z.object({ id: z.string(), available: z.number().int().min(0) }),
    ),
  }),
})
export type NftUpdatedEvent = z.infer<typeof NftUpdatedEvent>

export const OrderUpdatedEvent = EventBase.extend({
  type: z.literal('order.updated'),
  resource: z.object({ type: z.literal('order'), id: z.string() }),
  /** Owner of the order; clients drop events for any other user. */
  userId: z.string(),
  data: z.object({
    status: OrderStatus,
    transactionHash: z.string().nullable(),
    failureReason: z.string().nullable(),
  }),
})
export type OrderUpdatedEvent = z.infer<typeof OrderUpdatedEvent>

export const ServerEvent = z.discriminatedUnion('type', [
  NftUpdatedEvent,
  OrderUpdatedEvent,
])
export type ServerEvent = z.infer<typeof ServerEvent>

/** Socket.IO event names on the wire. */
export const SOCKET_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const

/**
 * Socket.IO path. Not the default `/socket.io/`: MSW strips that prefix before
 * matching, which would make the mock collide with Vite's HMR socket.
 */
export const SOCKET_PATH = '/realtime/'
