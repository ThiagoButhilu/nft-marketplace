import { HttpResponse, delay, http } from 'msw'
import {
  API_ROUTES,
  AddCartItemRequest,
  ApplyCouponRequest,
  ChangePasswordRequest,
  ConnectWalletRequest,
  CreateOrderRequest,
  IDEMPOTENCY_KEY_HEADER,
  LoginRequest,
  NftListQuery,
  OrderStatus,
  QuoteRequest,
  SignupRequest,
  UpdateAvatarRequest,
  UpdateCartItemRequest,
  UpdateProfileRequest,
  WalletInput,
} from '@/api/contracts'
import { scenario } from '../scenarios'
import * as accounts from '../server/accounts'
import * as cart from '../server/cart'
import * as catalog from '../server/catalog'
import { MockApiError } from '../server/errors'
import * as orders from '../server/orders'
import { API_PREFIX, endpoint, ok, parseBody } from './endpoint'

// Origin-relative on purpose: a leading `*` would also match module URLs such
// as `/src/api/endpoints.ts` during development.
const api = (path: string) => `${API_PREFIX}${path}`

function requireCartKey(cartKey: string | null) {
  if (!cartKey)
    throw new MockApiError(
      400,
      'VALIDATION_ERROR',
      'Cabeçalho X-Cart-Id ausente.',
    )
  return cartKey
}

function parseListQuery(url: URL) {
  const params = url.searchParams
  const list = (key: string) => {
    const values = params
      .getAll(key)
      .flatMap((v) => v.split(','))
      .filter(Boolean)
    return values.length ? values : undefined
  }
  return NftListQuery.parse({
    q: params.get('q') || undefined,
    collection: list('collection'),
    network: list('network'),
    minPrice: params.get('minPrice') || undefined,
    maxPrice: params.get('maxPrice') || undefined,
    tab: params.get('tab') || undefined,
    sort: params.get('sort') || undefined,
    page: params.get('page') || undefined,
    pageSize: params.get('pageSize') || undefined,
  })
}

type Id = { id: string }

export const restHandlers = [
  // --- Session -----------------------------------------------------------
  http.get(
    api(API_ROUTES.session),
    endpoint({ auth: 'required' }, ({ token }) =>
      ok(accounts.getSession(token!)),
    ),
  ),
  http.post(
    api(API_ROUTES.login),
    endpoint({ auth: 'none' }, async ({ request }) =>
      ok(await accounts.login(await parseBody(request, LoginRequest))),
    ),
  ),
  http.post(
    api(API_ROUTES.signup),
    endpoint({ auth: 'none' }, async ({ request }) =>
      ok(await accounts.signup(await parseBody(request, SignupRequest)), 201),
    ),
  ),
  http.post(
    api(API_ROUTES.logout),
    endpoint({ auth: 'none' }, ({ request }) => {
      const token = request.headers
        .get('Authorization')
        ?.replace(/^Bearer /, '')
      if (token) accounts.logout(token)
      return { status: 204 }
    }),
  ),

  // --- Catalog -----------------------------------------------------------
  http.get(
    api(API_ROUTES.featured),
    endpoint({ auth: 'none' }, () => ok(catalog.getFeatured())),
  ),
  http.get(
    api(API_ROUTES.nfts),
    endpoint({ auth: 'none' }, ({ url }) =>
      ok(catalog.listNfts(parseListQuery(url))),
    ),
  ),
  http.get(
    api('/nfts/:id'),
    endpoint<Id>({ auth: 'none' }, ({ params }) =>
      ok(catalog.toDetail(catalog.getNftRecord(params.id))),
    ),
  ),

  // --- Favorites ---------------------------------------------------------
  http.get(
    api(API_ROUTES.favorites),
    endpoint({ auth: 'required' }, ({ userId }) =>
      ok(accounts.listFavorites(userId!)),
    ),
  ),
  http.put(
    api('/favorites/:id'),
    endpoint<Id>({ auth: 'required' }, ({ userId, params }) =>
      ok(accounts.setFavorite(userId!, params.id, true)),
    ),
  ),
  http.delete(
    api('/favorites/:id'),
    endpoint<Id>({ auth: 'required' }, ({ userId, params }) =>
      ok(accounts.setFavorite(userId!, params.id, false)),
    ),
  ),

  // --- Cart & quote ------------------------------------------------------
  http.get(
    api(API_ROUTES.cart),
    endpoint({ auth: 'optional' }, ({ cartKey }) =>
      ok(
        cartKey
          ? cart.getCart(cartKey)
          : {
              id: '',
              lines: [],
              couponCode: null,
              itemCount: 0,
              updatedAt: new Date().toISOString(),
            },
      ),
    ),
  ),
  http.post(
    api(API_ROUTES.cartItems),
    endpoint({ auth: 'optional' }, async ({ cartKey, request }) =>
      ok(
        cart.addItem(
          requireCartKey(cartKey),
          await parseBody(request, AddCartItemRequest),
        ),
      ),
    ),
  ),
  http.patch(
    api('/cart/items/:nftId/:editionId'),
    endpoint<{ nftId: string; editionId: string }>(
      { auth: 'optional' },
      async ({ cartKey, params, request }) => {
        const { quantity } = await parseBody(request, UpdateCartItemRequest)
        return ok(
          cart.updateItem(
            requireCartKey(cartKey),
            params.nftId,
            params.editionId,
            quantity,
          ),
        )
      },
    ),
  ),
  http.delete(
    api('/cart/items/:nftId/:editionId'),
    endpoint<{ nftId: string; editionId: string }>(
      { auth: 'optional' },
      ({ cartKey, params }) =>
        ok(
          cart.removeItem(
            requireCartKey(cartKey),
            params.nftId,
            params.editionId,
          ),
        ),
    ),
  ),
  http.put(
    api(API_ROUTES.cartCoupon),
    endpoint({ auth: 'optional' }, async ({ cartKey, request }) =>
      ok(
        cart.applyCoupon(
          requireCartKey(cartKey),
          (await parseBody(request, ApplyCouponRequest)).code,
        ),
      ),
    ),
  ),
  http.delete(
    api(API_ROUTES.cartCoupon),
    endpoint({ auth: 'optional' }, ({ cartKey }) =>
      ok(cart.removeCoupon(requireCartKey(cartKey))),
    ),
  ),
  http.post(
    api(API_ROUTES.cartAcknowledge),
    endpoint({ auth: 'optional' }, ({ cartKey }) =>
      ok(cart.acknowledgePrices(requireCartKey(cartKey))),
    ),
  ),
  http.post(
    api(API_ROUTES.quote),
    endpoint({ auth: 'optional' }, async ({ cartKey, request }) => {
      const { network } = await parseBody(request, QuoteRequest)
      return ok(cart.createQuote(requireCartKey(cartKey), network))
    }),
  ),

  // --- Orders ------------------------------------------------------------
  http.post(
    api(API_ROUTES.orders),
    endpoint({ auth: 'required' }, async ({ userId, request }) => {
      const key = request.headers.get(IDEMPOTENCY_KEY_HEADER)
      if (!key || key.length < 8) {
        throw new MockApiError(
          400,
          'VALIDATION_ERROR',
          'Cabeçalho Idempotency-Key ausente ou inválido.',
        )
      }
      const input = await parseBody(request, CreateOrderRequest)
      const { order, replayed } = orders.createOrder(userId!, key, input)
      if (
        !replayed &&
        scenario.config.orderCreateTimeout &&
        scenario.consumeOnce('order-timeout')
      ) {
        // The order exists server-side, but this response never arrives.
        await delay('infinite')
        return HttpResponse.error()
      }
      return ok(order, replayed ? 200 : 201)
    }),
  ),
  http.get(
    api(API_ROUTES.orders),
    endpoint({ auth: 'required' }, ({ userId, url }) => {
      const status = url.searchParams.get('status')
      return ok({
        items: orders.listOrders(
          userId!,
          status ? OrderStatus.parse(status) : undefined,
        ),
      })
    }),
  ),
  http.get(
    api('/orders/:id'),
    endpoint<Id>({ auth: 'required' }, ({ userId, params }) =>
      ok(orders.getOrder(userId!, params.id)),
    ),
  ),

  // --- Profile -----------------------------------------------------------
  http.get(
    api(API_ROUTES.profile),
    endpoint({ auth: 'required' }, ({ userId }) =>
      ok(accounts.getProfile(userId!)),
    ),
  ),
  http.patch(
    api(API_ROUTES.profile),
    endpoint({ auth: 'required' }, async ({ userId, request }) =>
      ok(
        accounts.updateProfile(
          userId!,
          await parseBody(request, UpdateProfileRequest),
        ),
      ),
    ),
  ),
  http.put(
    api(API_ROUTES.profileAvatar),
    endpoint({ auth: 'required' }, async ({ userId, request }) =>
      ok(
        accounts.updateAvatar(
          userId!,
          (await parseBody(request, UpdateAvatarRequest)).dataUrl,
        ),
      ),
    ),
  ),
  http.delete(
    api(API_ROUTES.profileAvatar),
    endpoint({ auth: 'required' }, ({ userId }) =>
      ok(accounts.updateAvatar(userId!, null)),
    ),
  ),
  http.post(
    api(API_ROUTES.profilePassword),
    endpoint({ auth: 'required' }, async ({ userId, request }) => {
      await accounts.changePassword(
        userId!,
        await parseBody(request, ChangePasswordRequest),
      )
      return { status: 204 }
    }),
  ),

  // --- Wallets -----------------------------------------------------------
  http.get(
    api(API_ROUTES.wallets),
    endpoint({ auth: 'required' }, ({ userId }) =>
      ok({ items: accounts.listWallets(userId!) }),
    ),
  ),
  http.post(
    api(API_ROUTES.wallets),
    endpoint({ auth: 'required' }, async ({ userId, request }) =>
      ok(
        accounts.createWallet(userId!, await parseBody(request, WalletInput)),
        201,
      ),
    ),
  ),
  http.put(
    api('/wallets/:id'),
    endpoint<Id>({ auth: 'required' }, async ({ userId, params, request }) =>
      ok(
        accounts.updateWallet(
          userId!,
          params.id,
          await parseBody(request, WalletInput),
        ),
      ),
    ),
  ),
  http.post(
    api('/wallets/:id/connect'),
    endpoint<Id>({ auth: 'required' }, async ({ userId, params, request }) => {
      const { network } = await parseBody(request, ConnectWalletRequest)
      return ok(accounts.connectWallet(userId!, params.id, network))
    }),
  ),

  // Unknown API routes: JSON 404 instead of falling through to the dev server.
  http.all(
    api('/*'),
    endpoint({ auth: 'none' }, () => {
      throw new MockApiError(404, 'NOT_FOUND', 'Rota da API inexistente.')
    }),
  ),
]
