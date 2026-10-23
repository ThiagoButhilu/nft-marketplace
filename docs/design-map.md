# Design map

Source: Figma "Marketplace de NFTs GreenMint" (brand in the layout: **Kurio**), read through the
Figma MCP from a copy in the candidate's drafts. Frame screenshots live in
[`docs/figma`](./figma) and the raw layer tree in [`figma-metadata.xml`](./figma/figma-metadata.xml).

## Tokens

Defined in [`src/index.css`](../src/index.css) and mapped onto the shadcn/ui variables.

| Figma variable | Value | Tailwind | shadcn role |
| --- | --- | --- | --- |
| `color/ink` | `#140D0A` | `bg-ink` | `background`, `primary-foreground` |
| `color/surface-card` | `#241612` | `bg-surface-card` | `card`, `popover`, `muted` |
| `color/surface-dark` | `#38220F` | `bg-surface-dark` | `secondary`, `accent` (footer band) |
| `color/primary` | `#D28A4C` | `bg-brand` | `primary` (buttons, active tab) |
| `color/text-accent` | `#E89B55` | `text-brand-accent` | prices, links, `ring` |
| `color/secondary` | `#B39463` | `text-brand-secondary` | — |
| `color/text-primary` | `#F7F3EC` | `text-text-primary` | `foreground` |
| `color/text-secondary` | `#CFB28C` | `text-text-secondary` | `muted-foreground` |
| `color/border` | `#3F2319` | `border-line` | `border`, `input` |
| `color/border-soft` | `#55321F` | `border-line-soft` | — |
| `color/background-elevated` | `#FBFBFB` | `bg-elevated` | — |

Additions not in the palette (documented deviation): `destructive #F2725B` and
`success #7FC99A`, chosen for at least 4.5:1 contrast on `ink`.

Typography: a single family, **Roboto Mono** (self-hosted with
`@fontsource-variable/roboto-mono`). Styles used by the frames:

| Style | Size / line height / weight | Usage |
| --- | --- | --- |
| Display/43 Bold | 43 / 70 / 700 | Hero title (`text-display`) |
| Heading/24 Bold | 24 / auto / 700 | Section headings (`text-heading`) |
| Body Large/16–18 | 16–18 / 16–24 / 400–700 | Titles, prices, totals |
| Body/14–15 | 14–15 / 16–40 / 400–700 | Body, labels, inputs, tables |
| Caption/12–13 | 12–13 / 14–22 | Meta, helper text |
| Tiny/9–10 | 9–10 / auto | Wallet chips, badges |

Layout: 1440px desktop frame with a 1200px content column (`max-w-page`, 120px gutters), 414px
mobile frame with 24–28px gutters. Corners are nearly square on controls (≈4px) and rounded on
artwork (≈12px).

## Frames → routes

| Figma frame | Node | Route | Auth |
| --- | --- | --- | --- |
| Desktop / Início | `2:2` | `/` + search params `q, collection, network, minPrice, maxPrice, tab, sort, page` | — |
| Mobile / Início | `14:5226` | `/` | — |
| Desktop / Detalhes do NFT | `10:244` | `/nft/$nftId?edition=` | — |
| Mobile / Detalhes do NFT | `15:5536` | `/nft/$nftId` | — |
| Desktop / Carrinho de NFTs | `11:1278` | `/cart` | — (guest cart) |
| Mobile / Carrinho de NFTs | `16:360` | `/cart` | — |
| Desktop / Pagamento | `11:2862` | `/checkout` | ✔ |
| Mobile / Pagamento | `16:748` | `/checkout` | ✔ |
| Desktop / Confirmação de Pedido | `11:4385` | `/orders/$orderId` (modal-style receipt) | ✔ |
| Desktop / Login | `9:115` | `/login?redirect=` (dialog over home ≥ md) | — |
| Mobile / Login | `16:1022` | `/login` (full page) | — |
| Desktop / Cadastro | `9:1022` | `/signup?redirect=` (dialog over home ≥ md) | — |
| Mobile / Cadastro | `16:1228` | `/signup` (full page) | — |
| Desktop / Perfil do Colecionador | `9:1238` | `/account/profile` | ✔ |
| Desktop / Carteiras | `9:1670` | `/account/wallets` | ✔ |
| — (sidebar "Lista de interesse", mobile tab ♥) | — | `/account/favorites` | ✔ |
| — | — | 404 for anything else | — |

No mobile frames for profile, wallets or confirmation: they reuse the desktop composition in
a single column, with the account sidebar turned into a horizontal tab list.

## Shared components seen in the frames

- **Header**: KURIO logo, nav (Início · Mercado · Criadores · Aprenda), search, cart with
  badge, "Entrar" button / user menu. Mobile: search bar + filter button at the top and a
  bottom tab bar (Início, Favoritos, scan, Carrinho, Perfil).
- **NFT card**: artwork, name, price in ETH, optional strike-through old price and "RARO"
  badge; hover actions (add to cart, favorite, quick view).
- **Catalog sidebar**: Coleções (with counts), Faixa de preço (dual slider + Aplicar),
  Rede (Ethereum / Polygon / Solana), "NFT em destaque" promo.
- **Tabs** (Todos os NFTs · Novos lançamentos · Em alta), **sort select**, **pagination**.
- **Quantity stepper**, **edition chips** (1/1 · 1/10 · 1/50 · ABERTA).
- **Order summary**: promo code, subtotal, launch discount, network fee ("Taxa estimada"),
  total, CTA.
- **Form field**: label with orange `*`, 40px input, password visibility toggle, `.eth`
  select prefix.
- **Account sidebar**: Dados do perfil, Carteiras, Atividade, Lista de interesse, Ofertas,
  Arquivos baixados, Suporte, Sair.
- **Footer**: three feature columns, newsletter, contact band, link columns, socials,
  compatible wallets chip.

## Out of scope in the frames (rendered, never pretending success)

Criadores, Aprenda, Atividade, Ofertas, Arquivos baixados, Suporte, blog posts, footer
links, social login (Google/Facebook), "Esqueceu a senha?", newsletter, share buttons
and the mobile scan button. They are shown as disabled controls or as links to a "coming soon"
page with a clear message.

## Open items

- Screenshots for **Mobile / Carrinho** (`16:360`) and **Mobile / Pagamento** (`16:748`)
  could not be exported: the Figma Starter plan hit its MCP rate limit. Fetch them when the
  quota resets.
- NFT artwork in `public/nfts` is **cropped from the frame screenshots**
  (`scripts/crop-figma-assets.mjs`). Replace it with the original image fills via Figma
  `download_assets` when the quota resets.
- The Pagamento frame mixes collector and wallet fields. The form will reuse the saved wallets
  and keep the collector fields from the frame. Details go in `ARCHITECTURE.md`.
