import type { ReactNode } from 'react'
import type { Quote } from '@/api/contracts'
import { NETWORK_LABELS } from '@/components/catalog/search'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'

/**
 * Totals exactly as the API quoted them (the client never sums values).
 * Reused by cart and checkout.
 */
export function SummaryValues({
  quote,
  className,
}: {
  quote: Quote
  className?: string
}) {
  const hasDiscount = quote.discount !== '0'
  return (
    <dl className={cn('space-y-3', className)}>
      <Row
        label="Subtotal"
        value={formatEth(quote.subtotal)}
        valueClass="text-lg"
      />
      <Row
        label={
          quote.coupon
            ? `Desconto (${quote.coupon.code})`
            : 'Desconto do lançamento'
        }
        value={
          hasDiscount ? `(-) ${formatEth(quote.discount)}` : '(-) 0.00 ETH'
        }
        valueClass={hasDiscount ? 'text-success' : undefined}
      />
      <Row
        label="Taxa de rede"
        value={formatEth(quote.networkFee)}
        valueClass="text-lg"
        note={`Taxa estimada · ${NETWORK_LABELS[quote.network]}`}
      />
      <Row
        label={<span className="text-base font-bold">Total</span>}
        value={formatEth(quote.total)}
        valueClass="text-lg font-bold text-brand-accent"
        className="border-t border-line pt-4"
      />
    </dl>
  )
}

/** dl > div > (dt + dd): the only structure assistive tech reads reliably. */
function Row({
  label,
  value,
  valueClass,
  note,
  className,
}: {
  label: ReactNode
  value: string
  valueClass?: string
  note?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-baseline justify-between gap-x-4',
        className,
      )}
    >
      <dt className="text-[15px]">{label}</dt>
      <dd className="text-right">
        <span className={cn('whitespace-nowrap tabular-nums', valueClass)}>
          {value}
        </span>
        {note && (
          <span className="mt-1 block text-xs text-brand-accent">{note}</span>
        )}
      </dd>
    </div>
  )
}

export function SummarySkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex justify-between">
          <div className="skeleton h-5 w-28 rounded-sm" />
          <div className="skeleton h-5 w-20 rounded-sm" />
        </div>
      ))}
    </div>
  )
}
