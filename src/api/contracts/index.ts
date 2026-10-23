export * from './common'
export * from './auth'
export * from './nfts'
export * from './cart'
export * from './quote'
export * from './orders'
export * from './account'
export * from './events'

/** REST routes, relative to the API base URL. */
export const API_ROUTES = {
  session: '/auth/session',
  login: '/auth/login',
  signup: '/auth/signup',
  logout: '/auth/logout',
  nfts: '/nfts',
  nft: (id: string) => `/nfts/${encodeURIComponent(id)}`,
  featured: '/nfts/featured',
  favorites: '/favorites',
  favorite: (nftId: string) => `/favorites/${encodeURIComponent(nftId)}`,
  cart: '/cart',
  cartItems: '/cart/items',
  cartItem: (nftId: string, editionId: string) =>
    `/cart/items/${encodeURIComponent(nftId)}/${encodeURIComponent(editionId)}`,
  cartCoupon: '/cart/coupon',
  cartAcknowledge: '/cart/acknowledge',
  quote: '/quote',
  orders: '/orders',
  order: (id: string) => `/orders/${encodeURIComponent(id)}`,
  profile: '/profile',
  profileAvatar: '/profile/avatar',
  profilePassword: '/profile/password',
  wallets: '/wallets',
  wallet: (id: string) => `/wallets/${encodeURIComponent(id)}`,
  walletConnect: (id: string) => `/wallets/${encodeURIComponent(id)}/connect`,
} as const
