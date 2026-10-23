import { request, requestVoid } from './client'
import {
  API_ROUTES,
  Cart,
  FavoriteList,
  FeaturedResponse,
  IDEMPOTENCY_KEY_HEADER,
  NftDetail,
  NftListResponse,
  Order,
  OrderList,
  Profile,
  Quote,
  Session,
  Wallet,
  WalletConnection,
  WalletList,
  type AddCartItemRequest,
  type ChangePasswordRequest,
  type CreateOrderRequest,
  type LoginRequest,
  type Network,
  type NftListQuery,
  type OrderStatus,
  type SignupRequest,
  type UpdateProfileRequest,
  type WalletInput,
} from './contracts'

type Signal = { signal?: AbortSignal }

/** Serialises the catalog query exactly as the API expects it. */
export function toNftSearchParams(query: NftListQuery) {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.collection?.length)
    params.set('collection', query.collection.join(','))
  if (query.network?.length) params.set('network', query.network.join(','))
  if (query.minPrice) params.set('minPrice', query.minPrice)
  if (query.maxPrice) params.set('maxPrice', query.maxPrice)
  params.set('tab', query.tab)
  params.set('sort', query.sort)
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  return params
}

export const authApi = {
  session: ({ signal }: Signal = {}) =>
    request(Session, { url: API_ROUTES.session, signal }),
  login: (body: LoginRequest) =>
    request(Session, { method: 'POST', url: API_ROUTES.login, data: body }),
  signup: (body: SignupRequest) =>
    request(Session, { method: 'POST', url: API_ROUTES.signup, data: body }),
  logout: () => requestVoid({ method: 'POST', url: API_ROUTES.logout }),
}

export const catalogApi = {
  list: (query: NftListQuery, { signal }: Signal = {}) =>
    request(NftListResponse, {
      url: API_ROUTES.nfts,
      params: toNftSearchParams(query),
      signal,
    }),
  featured: ({ signal }: Signal = {}) =>
    request(FeaturedResponse, { url: API_ROUTES.featured, signal }),
  detail: (id: string, { signal }: Signal = {}) =>
    request(NftDetail, { url: API_ROUTES.nft(id), signal }),
}

export const favoritesApi = {
  list: ({ signal }: Signal = {}) =>
    request(FavoriteList, { url: API_ROUTES.favorites, signal }),
  add: (nftId: string) =>
    request(FavoriteList, { method: 'PUT', url: API_ROUTES.favorite(nftId) }),
  remove: (nftId: string) =>
    request(FavoriteList, {
      method: 'DELETE',
      url: API_ROUTES.favorite(nftId),
    }),
}

export const cartApi = {
  get: ({ signal }: Signal = {}) =>
    request(Cart, { url: API_ROUTES.cart, signal }),
  add: (body: AddCartItemRequest) =>
    request(Cart, { method: 'POST', url: API_ROUTES.cartItems, data: body }),
  update: (nftId: string, editionId: string, quantity: number) =>
    request(Cart, {
      method: 'PATCH',
      url: API_ROUTES.cartItem(nftId, editionId),
      data: { quantity },
    }),
  remove: (nftId: string, editionId: string) =>
    request(Cart, {
      method: 'DELETE',
      url: API_ROUTES.cartItem(nftId, editionId),
    }),
  applyCoupon: (code: string) =>
    request(Cart, {
      method: 'PUT',
      url: API_ROUTES.cartCoupon,
      data: { code },
    }),
  removeCoupon: () =>
    request(Cart, { method: 'DELETE', url: API_ROUTES.cartCoupon }),
  acknowledgePrices: () =>
    request(Cart, { method: 'POST', url: API_ROUTES.cartAcknowledge }),
  quote: (network: Network, { signal }: Signal = {}) =>
    request(Quote, {
      method: 'POST',
      url: API_ROUTES.quote,
      data: { network },
      signal,
    }),
}

/** Order creation can legitimately take longer than regular calls. */
const ORDER_TIMEOUT_MS = 15_000

export const ordersApi = {
  create: (body: CreateOrderRequest, idempotencyKey: string) =>
    request(Order, {
      method: 'POST',
      url: API_ROUTES.orders,
      data: body,
      timeout: ORDER_TIMEOUT_MS,
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
    }),
  list: (status?: OrderStatus, { signal }: Signal = {}) =>
    request(OrderList, {
      url: API_ROUTES.orders,
      params: status ? { status } : undefined,
      signal,
    }),
  get: (id: string, { signal }: Signal = {}) =>
    request(Order, { url: API_ROUTES.order(id), signal }),
}

export const profileApi = {
  get: ({ signal }: Signal = {}) =>
    request(Profile, { url: API_ROUTES.profile, signal }),
  update: (body: UpdateProfileRequest) =>
    request(Profile, { method: 'PATCH', url: API_ROUTES.profile, data: body }),
  setAvatar: (dataUrl: string) =>
    request(Profile, {
      method: 'PUT',
      url: API_ROUTES.profileAvatar,
      data: { dataUrl },
    }),
  removeAvatar: () =>
    request(Profile, { method: 'DELETE', url: API_ROUTES.profileAvatar }),
  changePassword: (body: ChangePasswordRequest) =>
    requestVoid({
      method: 'POST',
      url: API_ROUTES.profilePassword,
      data: body,
    }),
}

export const walletsApi = {
  list: ({ signal }: Signal = {}) =>
    request(WalletList, { url: API_ROUTES.wallets, signal }),
  create: (body: WalletInput) =>
    request(Wallet, { method: 'POST', url: API_ROUTES.wallets, data: body }),
  update: (id: string, body: WalletInput) =>
    request(Wallet, { method: 'PUT', url: API_ROUTES.wallet(id), data: body }),
  connect: (id: string, network: Network) =>
    request(WalletConnection, {
      method: 'POST',
      url: API_ROUTES.walletConnect(id),
      data: { network },
    }),
}
