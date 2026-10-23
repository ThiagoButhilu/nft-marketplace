# Architecture

> Work in progress: UI, testing and auditing sections are added as those layers land.
> Contracts, events and mock scenarios are documented in [docs/api.md](docs/api.md); the
> Figma mapping in [docs/design-map.md](docs/design-map.md).

## Layers

```
UI (routes, components)
  └─ hooks: src/queries/*         TanStack Query: cache, mutations, invalidation
       └─ src/api/endpoints.ts    one typed function per REST operation
            └─ src/api/client.ts  Axios: auth/cart headers, timeouts, error normalisation, Zod validation
                 └─ network ──►   MSW (src/mocks) in dev/demo, a real backend otherwise
src/realtime/client.ts            socket.io-client → applies events to the Query cache
src/lib/session-store.ts          token + user, persisted; drives cache cleanup and the socket
```

The app never imports anything from `src/mocks`. Mocks are enabled only by
`VITE_ENABLE_MOCKS=true` and loaded with a dynamic import before the first render.

## Typed contracts

`src/api/contracts` holds Zod schemas shared by the mocks and the client. The client
validates **every** response (`request(schema, config)`). A contract mismatch becomes an
`ApiError` with code `INVALID_RESPONSE`, so it never turns into broken UI. Errors are normalised to `ApiError`
(`status`, `code`, `fieldErrors`, `details`, `retryable`). The client adds its own codes
for failures without a usable response: `NETWORK_ERROR`, `TIMEOUT`, `INVALID_RESPONSE` and
`CANCELED`.

## Cache policy

| Data | Key | staleTime | Notes |
| --- | --- | --- | --- |
| Catalog list | `['nfts','list', query]` | 30 s | `keepPreviousData` while new filters load; AbortSignal cancels superseded requests |
| NFT detail | `['nfts','detail', id]` | 30 s | 404 is final (no retry) |
| Featured | `['nfts','featured']` | 5 min | |
| Session | `['session', token]` | 5 min | Revalidated on boot and on window focus |
| Cart | `['cart', owner]` | 10 s | `owner` = `user:<id>` or `guest:<cartId>` |
| Quote | `['cart', owner, 'quote', network]` | 0 | Invalidated by every cart change and by `nft.updated` for items in the cart |
| Favorites, profile, wallets | `['user', userId, …]` | 30 s | |
| Orders | `['user', userId, 'order', id]` | 0 | Polls while pending: 3 s with the socket down, 15 s as a safety net |

- **Isolation.** Public data is shared. Cart data is keyed by its owner, and private data
  lives under `['user', userId]`. Each query key carries its parameters, so two filter
  combinations never share an entry and a late response cannot overwrite another one.
- **Retries.** Queries retry only transient failures (`NETWORK_ERROR`, `TIMEOUT`, 5xx), up
  to 2 times with backoff (0.5 s, 1 s, … capped at 4 s). 4xx answers are final. Mutations
  never retry automatically.
- **Cancellation.** Every query passes TanStack's `AbortSignal` to Axios. Obsolete
  responses are cancelled or ignored, because only the active key is rendered.
- **Invalidation after mutations.**
  - Cart mutations write the returned cart to the cache and invalidate the quote.
  - Profile mutations update the profile and revalidate the session (name and avatar in the header).
  - Wallet mutations invalidate the wallet list.
  - Order mutations seed the order cache and invalidate the order lists. Once an order
    settles, the cart and the order lists are invalidated too.
- **Serialisation.** Cart mutations share the scope `cart`, and favorites for one NFT share the
  scope `favorite:<id>`. Mutations in the same scope run in order, so their responses can't
  arrive out of order.
- **Optimistic update.** Favorites flip immediately. `onMutate` snapshots the list, `onError`
  restores it, and `onSettled` revalidates.

## Session

- `sessionStore` keeps `{ token, expiresAt, user }` in `localStorage`, so the session
  survives a refresh. On boot, `GET /auth/session` revalidates it.
- Axios attaches `Authorization`, or `X-Cart-Id` for visitors. It also remembers the token
  each request was sent with. An `UNAUTHENTICATED` / `SESSION_EXPIRED` answer ends the
  session only if it still matches the current token, so a late 401 from an old session
  never logs out a new one.
- When a session ends (logout, expiry, invalid token, user switch in another tab via the
  `storage` event):
  - the private queries of that user and their cart are cancelled and removed;
  - the socket of that session is torn down with all its listeners, and a new anonymous one connects;
  - the visitor cart id is rotated;
  - an expiry raises a notice.

  The router preserves the current location so the user can resume after logging in again.
- At login or signup, the visitor cart id is sent so the server merges the visitor cart.

## Cart state

The server owns the cart and every value in it. The client holds no local copy of the
lines; it renders `GET /cart` and the server quote.

- A price change keeps the line flagged as `priceChanged` until the user accepts it
  (`POST /cart/acknowledge`).
- Values are decimal strings, formatted for display with `big.js`
  (`src/lib/eth.ts`); the client never does arithmetic on them.

## Checkout and idempotency

`useCreateOrder` stores a **checkout attempt** per user in `localStorage`: the idempotency key,
a fingerprint of the payload and the resulting order id.

- Repeated clicks, a timeout (`TIMEOUT` / `NETWORK_ERROR` / 5xx) or a page refresh reuse
  the same key. The server answers with the same order, so the purchase is never duplicated.
- A different payload, such as a new quote after `QUOTE_OUTDATED`, generates a new key.
- Definitive rejections (4xx) and terminal orders clear the attempt.
- `GET /orders?status=pending` recovers a pending order after a refresh or a reconnect.
  Only `confirmed` and `declined` orders are terminal.

## Realtime and reconciliation

`RealtimeClient` (`src/realtime/client.ts`) keeps one socket per session. It sends the token in the
query, because the mock ignores the `auth` payload; it also sends `auth` for a real server.

- **Ordering.** An event is applied only if its `id` is unseen (an LRU of the last 500 ids)
  and its `version` is newer than the last one applied to that resource and than the
  cached data. Duplicates and stale events are dropped, so state never regresses.
- **`nft.updated`.** Patches the detail, every list page and the featured entries in place.
  For carts holding the NFT, it raises an accessible notice (price change, sold out or
  reduced stock) and refetches the cart and quote. The server stays the source of the
  `priceChanged` flags and the totals.
- **`order.updated`.** Dropped unless `userId` matches the current session. Otherwise it
  updates the cached order. On a terminal status it refetches the full receipt, settles
  the checkout attempt, invalidates the cart and orders, and raises a notice.
- **Reconnect.** After any reconnect, the client invalidates the catalog, the carts, the
  orders and the active order queries. Anything missed while disconnected is reconciled over REST.
- **Status.** `realtimeStatus` (`idle`, `connecting`, `connected`, `reconnecting`,
  `offline`) feeds the UI and the polling fallback of pending orders.
- **Gotcha.** `socket.io-client` captures `globalThis.WebSocket` when its module is
  evaluated. It is therefore imported dynamically after MSW patched `WebSocket` (see
  `src/main.tsx`). Importing it statically would bypass the mock.

## UI decisions and deviations from the Figma

- **shadcn/ui adapted to the brand.** Buttons and inputs use 4px corners and bold labels;
  an amber `outline` variant reproduces "Favoritar". The slider, toaster (forced dark) and
  sheet use the Figma palette. Brand social icons are simplified inline SVGs because
  lucide-react 1.x dropped brand icons.
- **Header.**
  - "Mercado" points to the catalog section (`/#catalogo`). As in the frames, it is active
    on the purchase flow, while "Início" is active on home and account pages.
  - The desktop frame only shows a search icon, so it opens an accessible search dialog
    that writes `q` to the URL.
  - On mobile, the home frame has no header: its search bar and the bottom tab bar replace it.
- **Catalog state lives in the URL**: `q`, `collection[]`, `network[]`, `minPrice`, `maxPrice`,
  `tab`, `sort` and `page`.
  - Tabs and pages are links, so back/forward and refresh restore them.
  - Every filter change resets the page, and invalid params are dropped instead of failing the route.
  - Typing in the mobile search writes to the URL after 350 ms with `replace`, so it doesn't
    create one history entry per keystroke.
- **Filters.**
  - Collection and network rows look like the frame (text rows with counts) but are native
    checkboxes. A check mark shows the selection, not just color.
  - The price slider applies on "Aplicar", as designed. Its thumbs have accessible names.
  - Below 1024px the sidebar becomes a bottom drawer with focus trap, which also holds the sort select on mobile.
  - **Addition:** removable chips of the applied filters (including the search term), since
    the frame has no visible place for an active search on desktop.
- **NFT cards.**
  - The title is the link and covers the card. Quick actions are sibling buttons, never
    nested in the link.
  - The cart quick action opens the detail page, because buying requires choosing an edition.
  - Mobile shows only the heart, as in the frame. From 768px up, the three hover actions
    appear on hover/focus.
  - Favoriting while logged out redirects to login.
- **Loading.**
  - Skeletons with shimmer keep the final dimensions, and shimmer stops with `prefers-reduced-motion`.
  - When filters change, the previous results stay visible at 60% opacity, with `aria-busy`
    and an "Atualizando…" hint.
- **Feedback.** Results count, mutations and realtime changes are announced through a
  polite live region (Sonner toasts plus a `role="status"` line).
- **Out of scope.**
  - These items lead to `/em-breve`, which states that nothing was executed: Criadores,
    Aprenda, help links, blog posts, Atividade, Minha coleção, Estúdio, the mobile scanner,
    social login and password recovery.
  - The newsletter answers with an explicit "indisponível" notice.
  - Social links open the networks in a new tab.
- **Hero carousel.** Manual dots only, without autoplay, for accessibility. The slides come
  from `/nfts/featured`.
- **Mobile.** The 2-column grid is staggered as in the frame. The blog becomes a horizontal
  snap carousel. The footer stacks.
- **Assets.** The NFT artwork is cropped from the Figma frame screenshots
  (`scripts/crop-figma-assets.mjs`) until the original exports are available.
- **NFT detail.**
  - The edition is part of the URL (`?edicao=1-10`), so a link opens the same edition.
    Without it, the page picks the first edition with stock.
  - Sold-out editions stay selectable, so their status can be read. They are struck through,
    labelled "(esgotada)", and buying is blocked with a visible reason.
  - Quantity is capped by the edition stock and the per-order limit, minus what is already
    in the cart; the server re-validates.
  - "Comprar" adds to the cart and opens it. The mobile cart button adds without leaving the page.
  - Live `nft.updated` changes update price and stock in place, with an announced "Preço
    atualizado" message.
  - On mobile, the frame's own top bar (back, zoom, favorite) and the fixed purchase bar
    replace the header and the tab bar.
  - Reviews are summarised only: the review list is outside the challenge scope.
  - The Figma pagination dots under "Mais desta coleção" are omitted. Its five items fit on
    desktop and scroll horizontally on smaller screens.
- **Cart.**
  - Rows show quantities immediately and send one `PATCH` with the final value 400 ms after
    the last click. A burst of clicks never produces requests computed from a stale quantity.
  - Every value in the summary comes from `POST /quote`, and the client never sums anything.
    The fee shown is the Ethereum estimate; checkout re-quotes for the chosen network.
  - Price changes received while the cart is open add a per-line "Preço alterado" note and
    an alert with "Aceitar novos preços". Checkout stays disabled until the change is
    accepted, and the same applies to stock problems.
  - Removing a line moves focus to the cart heading.
  - The edition is shown as a small badge next to the token id. The Figma row has no edition,
    but two editions of the same NFT can be in the cart.
  - On mobile, the table becomes cards and the summary becomes a rounded panel below the list.
    There is no mobile cart screenshot, because of the Figma rate limit.
  - Visitors see "Entrar e finalizar", which leads to login and returns to `/checkout`.
- **Login and signup.**
  - Desktop: a dialog over a decorative, `inert` marketplace backdrop, as in the frames.
    Mobile: full page, without header or tab bar.
  - "Entrar | Criar conta" are links that keep the `redirect` param.
  - The Figma fields have placeholders only, so labels are visually hidden but present
    for assistive tech. Required fields use `aria-required`, and the visible asterisk is `aria-hidden`.
  - Errors appear under each field (`aria-describedby`, `aria-invalid`), and focus goes to the first invalid field.
  - API conflicts (`EMAIL_TAKEN`, `USERNAME_TAKEN`) are mapped onto their fields. Invalid
    credentials show a form-level alert.
  - The password field has an accessible show/hide toggle. Signup states the password rule up front.
  - After login, the user goes to `redirect`, validated by `safeRedirect`: only same-app
    paths, never back to /login or /signup, so it can't be used as an open redirect.
  - Closing the dialog goes back in history, or home when there is no in-app history.
  - Social login and "Esqueceu a senha?" lead to `/em-breve`.
- **Private routes.**
  - The pathless layout `/_auth` (checkout, account, orders) redirects visitors to
    `/login?redirect=<full location>`.
  - Visiting /login while signed in redirects straight to the target.
- **Expiry.** A session ends on a 401 that matches the current token, or proactively by a
  timer at `expiresAt`. `SessionGuard` then:
  - on a private screen, sends the user to `/login?redirect=…&motivo=expirada`, which shows
    "Sua sessão expirou" and returns to the same screen after login;
  - after a logout on a private screen, goes home;
  - on public screens, leaves the user where they are, with a notice.
- **Checkout (security first).**
  - The order sends only `quoteId`, `walletId`, `network` and the collector fields; it never
    sends prices or totals. The server revalidates price, stock, coupon and fee.
  - Payment always uses a **registered wallet**. The address and type fields mirror it and
    are read-only, so no address typed on the spot is ever used.
  - The wallet connection is simulated by the API (approve or `WALLET_REJECTED`), is bound to
    wallet and network, and can be disconnected. Changing either drops it.
  - Form → "Confirmar compra" → validation → **review dialog** → "Confirmar e pagar".
    Each API answer has its own response:

    | Answer | Response |
    | --- | --- |
    | `QUOTE_OUTDATED` | The fresh quote from `details` replaces the cached one; the dialog shows old → new total and needs a new confirmation (and "Aceitar novos preços" when prices moved) |
    | `AVAILABILITY_CONFLICT` | Explains and links to the cart |
    | 422 with `fieldErrors` | Closes the review and marks the form fields |
    | `TIMEOUT` / `NETWORK_ERROR` / 5xx (ambiguous) | Says it is unknown whether the order exists, looks it up, and offers "Tentar novamente com segurança" |
    | 401 | `SessionGuard` sends the user to login; the **draft** is restored on return |
    | Other 4xx | Server message |

  - **Duplicate prevention**, in layers:
    1. The button is disabled while sending, and the dialog can't close mid-request.
    2. The idempotency key is persisted per user and derived from the payload fingerprint.
    3. An ambiguous retry resends the **exact same payload**. Rebuilding it, for example with a
       quote refetched in the background, would mint a new key.
    4. **Attempt recovery:** orders store their idempotency key, so the checkout looks up the
       order of an unfinished attempt and takes the user there. This covers a timeout, a lost
       response or a refresh mid-request.
    5. While any order is pending, the checkout is blocked with a link to it.
  - The **draft** (collector fields, wallet, network) lives in `sessionStorage` per user. It
    survives refresh and session expiry, and is deleted on logout or user switch.
- **Order page (`/orders/$orderId`, private).**
  - Pending: status from the socket, with polling as fallback (3 s without socket, 15 s as a
    safety net). Shows whether updates are live.
  - Declined: shows the reason and that the cart was kept.
  - Confirmed: the Figma receipt, rendered **only** for an order the server reports as
    `confirmed`. It shows the order snapshot (later catalog changes don't alter it) and a
    simulated explorer link.
  - Errors: 403 (another user's order, no data shown) and 404 have dedicated screens. A failed
    background refresh keeps the last known status instead of replacing it with an error.
  - Focus moves to the new heading when the status settles.

## E2E tests (Playwright)

`npm run test:e2e` builds the demo bundle (mocks enabled) and runs the suite against
`vite preview`, the same artifact that is deployed. Reports go to `playwright-report/` (HTML)
and failing tests keep a trace (`npx playwright show-trace …`).

- **Projects.**
  - `desktop` (Chromium 1440×900) runs everything.
  - `mobile` (Pixel 7 profile at 390×844, touch) runs the main flows (`@main`) and the
    visual baselines (`@visual`).
- **Isolation.** Each test gets a fresh browser context, so the mock database (localStorage)
  starts from the seeded fixtures. Tests are independent and run in parallel.
- **Driving the server, not the app.** `e2e/fixtures.ts` uses `window.__kurioMock` for
  scenarios (latency, failures, offline), catalog changes, session expiry, socket drops and
  raw events. The app only sees MSW REST responses and Socket.IO events through
  socket.io-client.
- **Time.** Session expiry uses `page.clock` (fast-forward 25 s). Latency comes from
  deterministic scenarios (`fast`, `slow`, `out-of-order`). The order-timeout test runs in
  real time on purpose: axios relies on the native XHR timeout, which the fake clock does not drive.
- **Coverage** (spec → challenge items):
  - `catalog.spec.ts`: search, combined filters, sort, pagination, history/refresh, out-of-order
    responses, invalid params, slow skeletons, empty, 503 error + retry, automatic retries.
  - `nft-detail.spec.ts`: direct access, 404 (NFT and route), unavailable edition, stock-capped
    quantity, add to cart, mobile purchase bar, keyboard edition picker.
  - `auth.spec.ts`: signup validation and conflicts, login errors, private routes with
    return, open-redirect guard, refresh, logout, user switch isolation, expiry by time and by
    401, favorites persistence and optimistic rollback.
  - `cart.spec.ts`: quantities (one PATCH per burst), removal and focus, coupons
    (invalid/expired/valid/removed), persistence and guest → login merge.
  - `checkout.spec.ts`: full purchase from the catalog to the receipt, receipt snapshot,
    partial cart removal, validation, wallet rejection/disconnect, network change, declined
    payment, repeated clicks, outdated quote, sold out, timeout with automatic recovery and
    with a manual same-key retry, expiry preserving the draft, forbidden / missing orders.
  - `realtime.spec.ts`: `nft.updated` in the catalog, duplicate and stale events,
    price change during checkout, foreign `order.updated`, disconnection + refresh with a
    pending order, reconciliation of changes missed while offline.
  - `accessibility.spec.ts`: skip link, keyboard filters with visible focus, dialog focus
    trap and Escape, drawer focus return, keyboard purchase, and an axe-core scan (WCAG 2.1 AA,
    no serious or critical violations) on home, detail, cart, login, "em breve" and checkout.
  - `responsive.spec.ts`: no horizontal overflow at 390, 768 and 1440 px on every screen.
  - `visual.spec.ts`: baselines of home, detail, cart and checkout on both projects. Fixed
    overlays and toasts are hidden through `e2e/screenshot.css`. Baselines are OS-specific
    (`*-darwin.png`); regenerate them with `npm run test:e2e:update` on another platform.
- **Bugs the suite caught and that were fixed:**
  - the socket never reconnected after an offline period (the mock now reports
    unreachable servers with an `error` event);
  - horizontal overflow on the mobile checkout grid and on horizontal scrollers in narrow
    desktop windows;
  - invalid `<dl>` structure in the summary;
  - the accessible name of the account link didn't contain its visible text.
