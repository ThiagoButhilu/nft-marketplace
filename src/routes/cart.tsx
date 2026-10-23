import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { useRef } from 'react'
import { NftListQuery, type Cart } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { CartAlerts } from '@/components/cart/cart-alerts'
import {
  CART_GRID,
  CartLineRow,
  CartLinesSkeleton,
} from '@/components/cart/cart-line'
import { CouponForm } from '@/components/cart/coupon-form'
import { SummarySkeleton, SummaryValues } from '@/components/cart/order-summary'
import { NftCard, NftCardSkeleton } from '@/components/catalog/nft-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCart, useQuote } from '@/queries/cart'
import { nftListQuery } from '@/queries/catalog'
import { useSession } from '@/queries/session'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function CartPage() {
  const cart = useCart()
  const lines = cart.data?.lines ?? []
  const quote = useQuote('ethereum', { enabled: lines.length > 0 })
  const headingRef = useRef<HTMLHeadingElement>(null)
  const session = useSession()
  const navigate = useNavigate()

  // After a removal the row disappears: keep keyboard focus in a sane place.
  const onRemoved = () => headingRef.current?.focus()

  const blockedReason = !quote.data
    ? null
    : quote.data.issues.some((i) => i.kind === 'price-changed')
      ? 'Aceite os novos preços para continuar.'
      : !quote.data.purchasable
        ? 'Ajuste os itens indisponíveis para continuar.'
        : null

  const goToCheckout = () =>
    session
      ? void navigate({ to: '/checkout' })
      : void navigate({ to: '/login', search: { redirect: '/checkout' } })

  return (
    <div className="page-container pt-6 md:pt-8">
      <nav
        aria-label="Trilha de navegação"
        className="text-[15px] font-bold max-md:hidden"
      >
        <ol className="flex gap-2">
          <li>
            <Link to="/" className="hover:text-brand-accent">
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/" hash="catalogo" className="hover:text-brand-accent">
              Mercado
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-heading font-bold outline-none md:sr-only"
      >
        Carrinho
        {cart.data && (
          <span className="sr-only">, {cart.data.itemCount} itens</span>
        )}
      </h1>

      {cart.isPending ? (
        <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,782px)_332px] lg:justify-between">
          <CartLinesSkeleton />
          <SummarySkeleton />
        </div>
      ) : cart.isError ? (
        <div
          role="alert"
          className="mt-10 flex flex-col items-center gap-3 py-12 text-center"
        >
          <p className="text-lg font-bold">
            Não foi possível carregar o carrinho
          </p>
          <p className="text-sm text-text-secondary">
            {toApiError(cart.error).message}
          </p>
          <Button
            onClick={() => void cart.refetch()}
            disabled={cart.isFetching}
          >
            Tentar novamente
          </Button>
        </div>
      ) : lines.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,782px)_332px] lg:justify-between lg:gap-12">
          <section aria-labelledby="cart-items-title" className="min-w-0">
            <h2 id="cart-items-title" className="sr-only">
              Itens do carrinho
            </h2>
            <div
              aria-hidden
              className={cn(
                'hidden border-b border-line pb-2 text-base font-bold md:grid md:gap-x-4',
                CART_GRID,
              )}
            >
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
              <span />
            </div>
            <div className="mt-3 space-y-3">
              <CartAlerts cart={cart.data} quote={quote.data} />
              <ul className="space-y-3">
                {lines.map((line) => (
                  <CartLineRow
                    key={`${line.nftId}:${line.editionId}`}
                    line={line}
                    onRemoved={onRemoved}
                  />
                ))}
              </ul>
            </div>
          </section>

          <section
            aria-labelledby="summary-title"
            className="rounded-t-[28px] bg-card p-6 max-lg:-mx-4 max-lg:pb-8 sm:max-lg:mx-0 sm:max-lg:rounded-[28px] lg:rounded-none lg:bg-transparent lg:p-0"
          >
            <h2
              id="summary-title"
              className="border-b border-line pb-2 text-lg font-bold"
            >
              Resumo da carteira
            </h2>
            <div className="mt-6">
              <CouponForm
                appliedCode={cart.data.couponCode}
                description={quote.data?.coupon?.description}
              />
            </div>
            <div
              className="mt-6"
              aria-live="polite"
              aria-busy={quote.isFetching}
            >
              {quote.data ? (
                <SummaryValues
                  quote={quote.data}
                  className={cn(quote.isFetching && 'opacity-60')}
                />
              ) : quote.isError ? (
                <div role="alert" className="space-y-2 text-sm">
                  <p>
                    Não foi possível calcular o resumo.{' '}
                    {toApiError(quote.error).message}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void quote.refetch()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : (
                <SummarySkeleton />
              )}
            </div>
            <Button
              className="mt-8 h-10 w-full font-medium"
              onClick={goToCheckout}
              disabled={!quote.data || !!blockedReason || quote.isFetching}
              aria-describedby={blockedReason ? 'checkout-blocked' : undefined}
            >
              {session ? 'Conectar e finalizar' : 'Entrar e finalizar'}
            </Button>
            {blockedReason && (
              <p
                id="checkout-blocked"
                className="mt-2 text-center text-xs text-destructive"
              >
                {blockedReason}
              </p>
            )}
            <Link
              to="/"
              hash="catalogo"
              className="mt-4 block text-center text-[15px] text-brand-accent hover:underline"
            >
              Continuar explorando
            </Link>
          </section>
        </div>
      )}

      <Recommendations cart={cart.data} />
    </div>
  )
}

function EmptyCart() {
  return (
    <section className="flex flex-col items-center gap-4 py-20 text-center">
      <ShoppingCart className="size-12 text-brand-accent" aria-hidden />
      <h2 className="text-heading font-bold">Seu carrinho está vazio</h2>
      <p className="max-w-sm text-sm leading-6 text-text-secondary">
        Explore o catálogo e adicione NFTs para vê-los aqui. Seu carrinho fica
        salvo mesmo se você recarregar a página.
      </p>
      <Button asChild>
        <Link to="/" hash="catalogo">
          Explorar NFTs
        </Link>
      </Button>
    </section>
  )
}

const TRENDING = NftListQuery.parse({ tab: 'trending', pageSize: 8 })

/** "Colecionadores também viram": trending NFTs not already in the cart. */
function Recommendations({ cart }: { cart: Cart | undefined }) {
  const { data, isPending } = useQuery(nftListQuery(TRENDING))
  const inCart = new Set(cart?.lines.map((l) => l.nftId))
  const items = (data?.items ?? []).filter((n) => !inCart.has(n.id)).slice(0, 5)
  if (!isPending && items.length === 0) return null
  return (
    <section aria-labelledby="also-viewed" className="mt-24">
      <h2
        id="also-viewed"
        className="border-b border-line pb-2 text-lg font-bold text-brand-accent"
      >
        Colecionadores também viram
      </h2>
      <ul className="-mx-4 mt-8 flex snap-x snap-mandatory [contain:paint] gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5 lg:gap-6 lg:overflow-visible">
        {(isPending ? Array.from({ length: 5 }, () => null) : items).map(
          (nft, i) => (
            <li
              key={nft?.id ?? i}
              className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-auto"
            >
              {nft ? <NftCard nft={nft} /> : <NftCardSkeleton />}
            </li>
          ),
        )}
      </ul>
    </section>
  )
}
