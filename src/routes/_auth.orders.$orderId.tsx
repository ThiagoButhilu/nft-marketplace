import { Link, createFileRoute } from '@tanstack/react-router'
import { CircleX, Loader2, Lock, SearchX } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { Order } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { NETWORK_LABELS } from '@/components/catalog/search'
import { Receipt } from '@/components/order/receipt'
import { Button } from '@/components/ui/button'
import { formatEth } from '@/lib/eth'
import { useOrder } from '@/queries/orders'
import { useRealtimeStatus } from '@/realtime/status'

export const Route = createFileRoute('/_auth/orders/$orderId')({
  component: OrderPage,
})

/**
 * Order status page. The receipt is only rendered for an order the server
 * reports as `confirmed`; pending and declined have their own screens.
 * Works on direct access and after refresh (status comes from the API).
 */
function OrderPage() {
  const { orderId } = Route.useParams()
  const order = useOrder(orderId)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const status = order.data?.status

  // When the status settles, move focus to the new heading (announced).
  useEffect(() => {
    if (!status || status === 'pending') return
    const receiptHeading = document.getElementById('receipt-title')
    if (receiptHeading) receiptHeading.focus()
    else headingRef.current?.focus()
  }, [status])

  if (order.isPending) {
    return (
      <div className="page-container py-20" aria-busy>
        <div className="skeleton mx-auto h-[600px] max-w-[578px]" aria-hidden />
        <p role="status" className="sr-only">
          Carregando pedido…
        </p>
      </div>
    )
  }

  // Only a first load without data is an error page; a failed background
  // refresh keeps showing the last known status (see PendingOrder).
  if (order.isError && !order.data) {
    const error = toApiError(order.error)
    const forbidden = error.code === 'FORBIDDEN'
    const missing = error.code === 'NOT_FOUND'
    return (
      <section
        role="alert"
        className="page-container flex flex-col items-center gap-4 py-24 text-center"
      >
        {forbidden ? (
          <Lock className="size-12 text-brand-accent" aria-hidden />
        ) : (
          <SearchX className="size-12 text-brand-accent" aria-hidden />
        )}
        <h1 className="text-heading font-bold">
          {forbidden
            ? 'Este pedido pertence a outra conta'
            : missing
              ? 'Pedido não encontrado'
              : 'Não foi possível carregar o pedido'}
        </h1>
        <p className="max-w-md text-sm text-text-secondary">
          {forbidden || missing
            ? 'Confira o endereço ou volte ao mercado.'
            : error.message}
        </p>
        {forbidden || missing ? (
          <Button asChild>
            <Link to="/">Voltar ao mercado</Link>
          </Button>
        ) : (
          <Button
            onClick={() => void order.refetch()}
            disabled={order.isFetching}
          >
            Tentar novamente
          </Button>
        )}
      </section>
    )
  }

  const data = order.data
  return (
    <div className="bg-ink/60 py-10 md:py-[140px]">
      <div className="page-container">
        {data.status === 'confirmed' ? (
          <Receipt order={data} />
        ) : data.status === 'pending' ? (
          <PendingOrder
            order={data}
            headingRef={headingRef}
            refreshFailed={order.isError}
          />
        ) : (
          <DeclinedOrder order={data} headingRef={headingRef} />
        )}
      </div>
    </div>
  )
}

function OrderCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto flex w-full max-w-[578px] flex-col items-center gap-4 border-b-[10px] border-brand bg-card px-6 py-12 text-center">
      {children}
    </section>
  )
}

function PendingOrder({
  order,
  headingRef,
  refreshFailed,
}: {
  order: Order
  headingRef: React.RefObject<HTMLHeadingElement | null>
  refreshFailed: boolean
}) {
  const realtime = useRealtimeStatus()
  return (
    <OrderCard>
      <Loader2
        className="size-12 animate-spin text-brand-accent motion-reduce:animate-none"
        aria-hidden
      />
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-bold outline-none"
      >
        Aguardando confirmação da rede
      </h1>
      <p
        role="status"
        className="max-w-sm text-sm leading-6 text-text-secondary"
      >
        Pedido de {formatEth(order.total)} enviado para a{' '}
        {NETWORK_LABELS[order.network]}. Você pode sair desta página: o pedido
        continua sendo processado e não será cobrado duas vezes.
      </p>
      <p className="text-xs text-text-secondary">
        {realtime === 'connected'
          ? 'Atualização ao vivo ativa.'
          : 'Sem conexão em tempo real: verificando o status periodicamente.'}
      </p>
      {refreshFailed && (
        <p role="alert" className="text-xs text-destructive">
          Não conseguimos atualizar o status agora. Continuaremos tentando
          automaticamente.
        </p>
      )}
    </OrderCard>
  )
}

function DeclinedOrder({
  order,
  headingRef,
}: {
  order: Order
  headingRef: React.RefObject<HTMLHeadingElement | null>
}) {
  return (
    <OrderCard>
      <CircleX className="size-12 text-destructive" aria-hidden />
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-bold outline-none"
      >
        Pagamento recusado
      </h1>
      <p
        role="status"
        className="max-w-sm text-sm leading-6 text-text-secondary"
      >
        {order.failureReason ?? 'A carteira recusou o pagamento.'} Nenhum valor
        foi cobrado e seus itens continuam no carrinho.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/checkout">Tentar novamente</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/cart">Ver carrinho</Link>
        </Button>
      </div>
    </OrderCard>
  )
}
