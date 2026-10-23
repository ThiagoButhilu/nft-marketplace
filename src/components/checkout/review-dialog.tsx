import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import {
  Quote,
  type CollectorDetails,
  type CreateOrderRequest,
  type Network,
  type Wallet,
  type WalletConnection,
} from '@/api/contracts'
import { toApiError, type ApiError } from '@/api/errors'
import { SummaryValues } from '@/components/cart/order-summary'
import { NETWORK_LABELS } from '@/components/catalog/search'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatEth } from '@/lib/eth'
import { notices } from '@/lib/notices'
import { useAcknowledgePrices } from '@/queries/cart'
import { queryKeys } from '@/queries/keys'
import { useCreateOrder } from '@/queries/orders'
import { useCartOwner } from '@/queries/session'
import { PROVIDER_LABELS, shortAddress } from './labels'

/** What the last confirmation attempt resulted in. */
type Outcome =
  | { kind: 'idle' }
  | { kind: 'outdated'; previousTotal: string }
  | { kind: 'unavailable' }
  | { kind: 'ambiguous'; error: ApiError }
  | { kind: 'error'; error: ApiError }

const AMBIGUOUS = new Set([
  'TIMEOUT',
  'NETWORK_ERROR',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
])

/**
 * Review step before sending the order. Every API answer has a dedicated
 * response; nothing is ever shown as confirmed by the client itself.
 */
export function ReviewDialog({
  open,
  onOpenChange,
  quote,
  collector,
  wallet,
  network,
  connection,
  onFieldErrors,
  onAmbiguous,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: Quote
  collector: CollectorDetails
  wallet: Wallet
  network: Network
  connection: WalletConnection | null
  /** 422 with field errors: close the review and show them on the form. */
  onFieldErrors: (fieldErrors: Record<string, string[]>) => void
  /** The response was lost: look for the order the server may have created. */
  onAmbiguous: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  const createOrder = useCreateOrder()
  const acknowledge = useAcknowledgePrices()
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' })
  // The exact payload of the last attempt. After an ambiguous failure the
  // retry must resend it unchanged: same payload → same idempotency key →
  // the server returns the order it may already have created. Rebuilding it
  // (e.g. with a quote refetched in the background) would mint a new key and
  // could place a second order.
  const [lastRequest, setLastRequest] = useState<CreateOrderRequest | null>(
    null,
  )

  const priceChanged = quote.issues.some((i) => i.kind === 'price-changed')
  const connected =
    connection?.walletId === wallet.id && connection.network === network
  const retryingSafely = outcome.kind === 'ambiguous' && lastRequest !== null
  const canConfirm =
    !createOrder.isPending &&
    (retryingSafely || (quote.purchasable && connected))

  const confirm = () => {
    const request: CreateOrderRequest =
      outcome.kind === 'ambiguous' && lastRequest
        ? lastRequest
        : { quoteId: quote.id, walletId: wallet.id, network, collector }
    setLastRequest(request)
    setOutcome({ kind: 'idle' })
    createOrder.mutate(request, {
      onSuccess: (order) => {
        onOpenChange(false)
        void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
      },
      onError: (error) => {
        if (
          error.code === 'QUOTE_OUTDATED' ||
          error.code === 'AVAILABILITY_CONFLICT'
        ) {
          // The server sends the fresh quote: show it and ask again.
          const fresh = Quote.safeParse(
            (error.details as { quote?: unknown } | undefined)?.quote,
          )
          if (fresh.success)
            queryClient.setQueryData(
              queryKeys.cart.quote(owner, network),
              fresh.data,
            )
          void queryClient.invalidateQueries({
            queryKey: queryKeys.cart.owner(owner),
            exact: true,
          })
          setOutcome(
            error.code === 'QUOTE_OUTDATED'
              ? { kind: 'outdated', previousTotal: quote.total }
              : { kind: 'unavailable' },
          )
          return
        }
        if (
          error.code === 'VALIDATION_ERROR' &&
          Object.keys(error.fieldErrors).length
        ) {
          onOpenChange(false)
          onFieldErrors(error.fieldErrors)
          return
        }
        if (AMBIGUOUS.has(error.code)) {
          setOutcome({ kind: 'ambiguous', error })
          onAmbiguous()
          return
        }
        setOutcome({ kind: 'error', error })
      },
    })
  }

  const acceptPrices = () =>
    acknowledge.mutate(undefined, {
      onError: (error) =>
        notices.push({
          tone: 'error',
          title: 'Não foi possível aceitar os novos preços',
          description: toApiError(error).message,
        }),
    })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Never close while the order request is in flight.
        if (!next && createOrder.isPending) return
        // Keep an ambiguous attempt around: reopening must still retry safely.
        if (!next && outcome.kind !== 'ambiguous') setOutcome({ kind: 'idle' })
        onOpenChange(next)
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto border-line bg-card sm:max-w-xl"
        aria-busy={createOrder.isPending}
      >
        <DialogHeader>
          <DialogTitle>Revise seu pedido</DialogTitle>
          <DialogDescription>
            Confira os dados antes de confirmar. Os valores vêm da cotação mais
            recente.
          </DialogDescription>
        </DialogHeader>

        <OutcomeBanner outcome={outcome} total={quote.total} />
        {priceChanged && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-brand/60 p-3 text-sm"
          >
            <span className="flex gap-2">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-brand-accent"
                aria-hidden
              />
              Há preços novos neste pedido. Aceite-os para continuar.
            </span>
            <Button
              size="sm"
              onClick={acceptPrices}
              disabled={acknowledge.isPending}
            >
              Aceitar novos preços
            </Button>
          </div>
        )}

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-text-secondary">Colecionador</dt>
          <dd>
            {collector.displayName} (@{collector.username})
          </dd>
          <dt className="text-text-secondary">E-mail</dt>
          <dd className="break-all">{collector.email}</dd>
          <dt className="text-text-secondary">Carteira</dt>
          <dd>
            {PROVIDER_LABELS[wallet.provider]} · {shortAddress(wallet.address)}
          </dd>
          <dt className="text-text-secondary">Rede</dt>
          <dd>{NETWORK_LABELS[network]}</dd>
        </dl>

        <ul className="space-y-2 border-y border-line py-3 text-sm">
          {quote.lines.map((line) => (
            <li
              key={`${line.nftId}:${line.editionId}`}
              className="flex justify-between gap-3"
            >
              <span>
                {line.name}{' '}
                <span className="text-text-secondary">(x {line.quantity})</span>
              </span>
              <span className="tabular-nums text-brand-accent">
                {formatEth(line.lineTotal)}
              </span>
            </li>
          ))}
        </ul>
        <SummaryValues quote={quote} />

        {!connected && (
          <p className="text-sm text-destructive">
            Conecte a carteira na rede {NETWORK_LABELS[network]} para confirmar.
          </p>
        )}
        {outcome.kind === 'unavailable' && (
          <p className="text-sm">
            <Link to="/cart" className="text-brand-accent underline">
              Ajustar itens no carrinho
            </Link>
          </p>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={createOrder.isPending}
          >
            Voltar e editar
          </Button>
          <Button onClick={confirm} disabled={!canConfirm} className="min-w-48">
            {createOrder.isPending ? (
              'Enviando pedido…'
            ) : outcome.kind === 'ambiguous' ? (
              <>
                <RefreshCw aria-hidden /> Tentar novamente com segurança
              </>
            ) : outcome.kind === 'outdated' ? (
              `Confirmar novo total (${formatEth(quote.total)})`
            ) : (
              `Confirmar e pagar ${formatEth(quote.total)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OutcomeBanner({
  outcome,
  total,
}: {
  outcome: Outcome
  total: string
}) {
  if (outcome.kind === 'idle') return null
  const content =
    outcome.kind === 'outdated'
      ? {
          title: 'Os valores do pedido mudaram',
          text: `O total passou de ${formatEth(outcome.previousTotal)} para ${formatEth(total)}. Revise e confirme novamente.`,
        }
      : outcome.kind === 'unavailable'
        ? {
            title: 'Algum item ficou indisponível',
            text: 'A disponibilidade mudou enquanto você finalizava. Ajuste os itens para continuar.',
          }
        : outcome.kind === 'ambiguous'
          ? {
              title: 'Não conseguimos confirmar o envio',
              text: `${outcome.error.message} Tentar novamente é seguro: o mesmo pedido será recuperado, sem cobrança duplicada.`,
            }
          : {
              title: 'Não foi possível concluir o pedido',
              text: outcome.error.message,
            }
  return (
    <div
      role="alert"
      className="rounded-sm border border-destructive/60 bg-destructive/5 p-3 text-sm"
    >
      <p className="font-bold">{content.title}</p>
      <p className="mt-1 text-text-secondary">{content.text}</p>
    </div>
  )
}
