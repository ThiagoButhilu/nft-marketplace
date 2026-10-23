import type { Network, NftListQuery, OrderStatus } from '@/api/contracts'

/**
 * Query key factory.
 *
 * - Public data (`nfts`) is shared by everyone.
 * - Cart data is keyed by its owner: `user:<id>` or `guest:<cartId>`.
 * - Private data lives under `['user', userId]`, so ending a session removes
 *   every private entry with a single `removeQueries`.
 * - Catalog lists are keyed by the full normalised query: each combination of
 *   filters has its own entry and a late response can never overwrite another.
 */
export const queryKeys = {
  nfts: {
    all: ['nfts'] as const,
    lists: () => ['nfts', 'list'] as const,
    list: (query: NftListQuery) => ['nfts', 'list', query] as const,
    details: () => ['nfts', 'detail'] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
    featured: () => ['nfts', 'featured'] as const,
  },
  session: (token: string) => ['session', token] as const,
  cart: {
    all: ['cart'] as const,
    owner: (owner: string) => ['cart', owner] as const,
    quote: (owner: string, network: Network) =>
      ['cart', owner, 'quote', network] as const,
    quotes: (owner: string) => ['cart', owner, 'quote'] as const,
  },
  user: {
    all: (userId: string) => ['user', userId] as const,
    favorites: (userId: string) => ['user', userId, 'favorites'] as const,
    orders: (userId: string, status?: OrderStatus) =>
      ['user', userId, 'orders', { status: status ?? 'all' }] as const,
    ordersAll: (userId: string) => ['user', userId, 'orders'] as const,
    order: (userId: string, orderId: string) =>
      ['user', userId, 'order', orderId] as const,
    profile: (userId: string) => ['user', userId, 'profile'] as const,
    wallets: (userId: string) => ['user', userId, 'wallets'] as const,
  },
}

export const cartOwner = (userId: string | null, guestCartId: string) =>
  userId ? `user:${userId}` : `guest:${guestCartId}`
