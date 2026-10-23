import { zodResolver } from '@hookform/resolvers/zod'
import { useIsMutating } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  CollectorDetails,
  type Network,
  type WalletConnection,
} from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { CartAlerts } from '@/components/cart/cart-alerts'
import { CouponForm } from '@/components/cart/coupon-form'
import { SummarySkeleton, SummaryValues } from '@/components/cart/order-summary'
import { CollectorForm } from '@/components/checkout/collector-form'
import { checkoutDrafts } from '@/components/checkout/draft'
import { ReviewDialog } from '@/components/checkout/review-dialog'
import { WalletNetworkPanel } from '@/components/checkout/wallet-network'
import { Button } from '@/components/ui/button'
import { formatEth } from '@/lib/eth'
import { useProfile, useWallets } from '@/queries/account'
import { useCart, useQuote } from '@/queries/cart'
import {
  CREATE_ORDER_KEY,
  checkoutAttempts,
  useCheckoutRecovery,
  usePendingOrders,
} from '@/queries/orders'
import { useSession } from '@/queries/session'
import { IMAGE_SIZES, responsiveImage } from '@/lib/images'

export const Route = createFileRoute('/_auth/checkout')({
  component: CheckoutPage,
})

type CollectorField = keyof CollectorDetails
const COLLECTOR_FIELDS: CollectorField[] = [
  'displayName',
  'username',
  'profileName',
  'email',
  'ensName',
  'referralCode',
  'note',
]

function CheckoutPage() {
  const userId = useSession()!.user.id
  const cart = useCart()
  const profile = useProfile()
  const wallets = useWallets()
  const pending = usePendingOrders()
  const [draft] = useState(() => checkoutDrafts.load(userId))
  const navigate = useNavigate()
  const submitting = useIsMutating({ mutationKey: CREATE_ORDER_KEY }) > 0
  const recovery = useCheckoutRecovery()

  // An unfinished attempt whose order exists server-side (the response was
  // lost to a timeout, a dropped connection or a refresh): go to that order
  // instead of letting the user buy again.
  const recovered = recovery.recovered
  useEffect(() => {
    if (!recovered) return
    const attempt = checkoutAttempts.load(userId)
    if (attempt)
      checkoutAttempts.save(userId, { ...attempt, orderId: recovered.id })
    void navigate({
      to: '/orders/$orderId',
      params: { orderId: recovered.id },
      replace: true,
    })
  }, [recovered, userId, navigate])

  const [network, setNetwork] = useState<Network>(draft?.network ?? 'ethereum')
  const [walletId, setWalletId] = useState<string | undefined>(draft?.walletId)
  const [connection, setConnection] = useState<WalletConnection | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [showCoupon, setShowCoupon] = useState(false)
  const [blockMessage, setBlockMessage] = useState<string | null>(null)

  const walletList = useMemo(() => wallets.data?.items ?? [], [wallets.data])
  const primary = walletList.find((w) => w.role === 'primary')
  const secondary = walletList.find((w) => w.role === 'secondary')
  const wallet = walletList.find((w) => w.id === walletId)
  const lines = cart.data?.lines ?? []
  const quote = useQuote(network, { enabled: lines.length > 0 })

  const form = useForm<CollectorDetails>({
    resolver: zodResolver(CollectorDetails),
    mode: 'onTouched',
    defaultValues: { note: '', ...draft?.collector },
  })

  // Default wallet: the draft's (if it still exists), else the primary one.
  useEffect(() => {
    if (!walletList.length) return
    if (!walletId || !walletList.some((w) => w.id === walletId))
      setWalletId((primary ?? walletList[0]).id)
  }, [walletList, walletId, primary])

  // Prefill from the profile once, unless a draft already holds the user's input.
  useEffect(() => {
    if (draft?.collector || !profile.data) return
    form.reset({
      displayName: profile.data.displayName,
      username: profile.data.username,
      email: profile.data.email,
      ensName: profile.data.ensName ?? '',
      profileName: profile.data.displayName,
      referralCode: primary?.referralCode ?? '',
      note: '',
    })
  }, [profile.data, primary, draft, form])

  // Persist the draft on every change (survives refresh and session expiry).
  useEffect(() => {
    const save = () =>
      checkoutDrafts.save(userId, {
        collector: form.getValues(),
        walletId,
        network,
      })
    save()
    const subscription = form.watch(save)
    return () => subscription.unsubscribe()
  }, [form, userId, walletId, network])

  const changeNetwork = (next: Network) => {
    setNetwork(next)
    setConnection(null) // a connection is bound to one network
  }

  const pendingOrder = pending.data?.items[0]
  const priceChanged =
    quote.data?.issues.some((i) => i.kind === 'price-changed') ?? false

  const openReview = form.handleSubmit(() => {
    setBlockMessage(null)
    const problem = !wallet
      ? 'Selecione uma carteira em “Carteira e rede”.'
      : !connection ||
          connection.walletId !== wallet.id ||
          connection.network !== network
        ? 'Conecte a carteira selecionada antes de confirmar.'
        : !quote.data
          ? 'Aguarde o cálculo do resumo.'
          : !quote.data.purchasable
            ? priceChanged
              ? 'Aceite os novos preços antes de confirmar.'
              : 'Ajuste os itens indisponíveis no carrinho.'
            : null
    if (problem) setBlockMessage(problem)
    else setReviewOpen(true)
  })

  const applyFieldErrors = (fieldErrors: Record<string, string[]>) => {
    for (const [path, messages] of Object.entries(fieldErrors)) {
      const field = path.replace(/^collector\./, '') as CollectorField
      if (COLLECTOR_FIELDS.includes(field))
        form.setError(
          field,
          { type: 'server', message: messages[0] },
          { shouldFocus: true },
        )
    }
  }

  if (cart.isPending || wallets.isPending) return <CheckoutSkeleton />
  if (cart.isError || wallets.isError) {
    const error = toApiError(cart.error ?? wallets.error)
    return (
      <section role="alert" className="page-container py-20 text-center">
        <h1 className="text-heading font-bold">
          Não foi possível carregar o pagamento
        </h1>
        <p className="mt-2 text-sm text-text-secondary">{error.message}</p>
        <Button
          className="mt-4"
          onClick={() => void Promise.all([cart.refetch(), wallets.refetch()])}
        >
          Tentar novamente
        </Button>
      </section>
    )
  }
  if (
    !lines.length &&
    !pendingOrder &&
    (submitting || recovery.checking || recovered)
  ) {
    return (
      <section
        role="status"
        className="page-container flex flex-col items-center gap-4 py-24 text-center"
      >
        <Loader2
          className="size-10 animate-spin text-brand-accent motion-reduce:animate-none"
          aria-hidden
        />
        <h1 className="text-heading font-bold">Verificando seu pedido…</h1>
        <p className="max-w-md text-sm text-text-secondary">
          Estamos confirmando com o servidor o status da sua última compra.
          Nenhuma cobrança duplicada será feita.
        </p>
      </section>
    )
  }
  if (!lines.length && !pendingOrder) {
    return (
      <section className="page-container py-20 text-center">
        <h1 className="text-heading font-bold">Seu carrinho está vazio</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Adicione NFTs ao carrinho para finalizar uma compra.
        </p>
        <Button asChild className="mt-4">
          <Link to="/" hash="catalogo">
            Explorar NFTs
          </Link>
        </Button>
      </section>
    )
  }

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
            <Link to="/cart" className="hover:text-brand-accent">
              Mercado
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      <h1 className="sr-only">Pagamento</h1>

      {pendingOrder && (
        <div
          role="status"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-brand/60 bg-surface-dark/50 p-4 text-sm"
        >
          <span>
            Você tem um pedido aguardando confirmação da rede (
            {formatEth(pendingOrder.total)}). Aguarde a conclusão antes de fazer
            outra compra.
          </span>
          <Button asChild size="sm">
            <Link to="/orders/$orderId" params={{ orderId: pendingOrder.id }}>
              Acompanhar pedido
            </Link>
          </Button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,763px)_405px] lg:justify-between">
        <form
          onSubmit={(e) => e.preventDefault()}
          noValidate
          aria-label="Dados do colecionador"
        >
          <CollectorForm
            form={form}
            wallet={wallet}
            network={network}
            onNetworkChange={changeNetwork}
            useSecondary={!!secondary && walletId === secondary.id}
            hasSecondary={!!secondary}
            onUseSecondaryChange={(useIt) => {
              setWalletId(useIt ? secondary?.id : primary?.id)
              setConnection(null)
            }}
          />
        </form>

        <aside aria-label="Resumo do pedido" className="space-y-6">
          <section aria-labelledby="your-nfts">
            <h2 id="your-nfts" className="text-lg font-bold">
              Seus NFTs
            </h2>
            <div
              aria-hidden
              className="mt-3 flex justify-between text-base font-bold"
            >
              <span>NFTs</span>
              <span>Subtotal</span>
            </div>
            <ul className="mt-2 space-y-3">
              {(quote.data?.lines ?? lines).map((line) => (
                <li
                  key={`${line.nftId}:${line.editionId}`}
                  className="flex items-center gap-3 bg-card p-1 pr-4"
                >
                  <img
                    {...responsiveImage(line.imageUrl, IMAGE_SIZES.list)}
                    alt=""
                    width={64}
                    height={64}
                    className="size-16 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-5 font-bold">
                      {line.name}
                    </p>
                    <p className="text-[13px] whitespace-nowrap text-text-secondary">
                      ID do token: {line.tokenId}
                    </p>
                  </div>
                  <span className="text-xs whitespace-nowrap text-text-secondary">
                    (x {line.quantity})
                  </span>
                  <span className="text-base font-bold whitespace-nowrap text-brand-accent tabular-nums">
                    {formatEth(line.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {cart.data && <CartAlerts cart={cart.data} quote={quote.data} />}

          <div>
            {cart.data?.couponCode || showCoupon ? (
              <CouponForm
                appliedCode={cart.data?.couponCode ?? null}
                description={quote.data?.coupon?.description}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowCoupon(true)}
                className="w-full text-center text-[15px] hover:text-brand-accent"
              >
                Tem um código promocional?{' '}
                <span className="underline underline-offset-4">
                  Aplique aqui
                </span>
              </button>
            )}
          </div>

          <div aria-live="polite" aria-busy={quote.isFetching}>
            {quote.data ? (
              <SummaryValues quote={quote.data} />
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

          <section aria-labelledby="wallet-title">
            <h2
              id="wallet-title"
              className="mb-4 text-center text-lg font-bold"
            >
              Carteira e rede
            </h2>
            <WalletNetworkPanel
              wallets={walletList}
              walletId={walletId}
              onWalletChange={setWalletId}
              network={network}
              connection={connection}
              onConnectionChange={setConnection}
            />
          </section>

          <div>
            <Button
              type="button"
              className="h-11 w-full text-base font-medium"
              onClick={() => void openReview()}
              disabled={!!pendingOrder || quote.isFetching}
              aria-describedby={blockMessage ? 'checkout-block' : undefined}
            >
              Confirmar compra
            </Button>
            {blockMessage && (
              <p
                id="checkout-block"
                role="alert"
                className="mt-2 text-center text-sm text-destructive"
              >
                {blockMessage}
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Always mounted: it remembers an ambiguous attempt so a retry resends it unchanged. */}
      {quote.data && wallet && (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          quote={quote.data}
          collector={form.getValues()}
          wallet={wallet}
          network={network}
          connection={connection}
          onFieldErrors={applyFieldErrors}
          onAmbiguous={() => void recovery.check()}
        />
      )}
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div
      aria-hidden
      className="page-container grid gap-12 pt-14 lg:grid-cols-[minmax(0,763px)_405px] lg:justify-between"
    >
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="skeleton h-[66px] rounded-sm" />
        ))}
      </div>
      <SummarySkeleton />
    </div>
  )
}
