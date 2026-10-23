import { AlertTriangle } from 'lucide-react'
import type { Cart, Quote } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { notices } from '@/lib/notices'
import { useAcknowledgePrices } from '@/queries/cart'

/**
 * Explains what blocks checkout: prices that moved since the items were
 * added (must be accepted) and stock problems (must be fixed in the list).
 * Updates live through `nft.updated` → cart/quote refetch.
 */
export function CartAlerts({
  cart,
  quote,
}: {
  cart: Cart
  quote: Quote | undefined
}) {
  const acknowledge = useAcknowledgePrices()
  const changed = cart.lines.filter((l) => l.priceChanged)
  const stockIssues =
    quote?.issues.filter((i) => i.kind !== 'price-changed') ?? []
  if (!changed.length && !stockIssues.length) return null

  return (
    <div
      role="alert"
      className="space-y-3 rounded-sm border border-brand/60 bg-surface-dark/50 p-4 text-sm"
    >
      {changed.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex gap-2">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-brand-accent"
              aria-hidden
            />
            <span>
              {changed.length === 1
                ? `O preço de ${changed[0].name} mudou desde que você o adicionou.`
                : `Os preços de ${changed.length} itens mudaram desde que você os adicionou.`}{' '}
              Revise o resumo e aceite os novos valores para continuar.
            </span>
          </p>
          <Button
            size="sm"
            disabled={acknowledge.isPending}
            onClick={() =>
              acknowledge.mutate(undefined, {
                onSuccess: () =>
                  notices.push({
                    tone: 'success',
                    title: 'Novos preços aceitos',
                  }),
                onError: (error) =>
                  notices.push({
                    tone: 'error',
                    title: 'Não foi possível atualizar',
                    description: toApiError(error).message,
                  }),
              })
            }
          >
            Aceitar novos preços
          </Button>
        </div>
      )}
      {stockIssues.length > 0 && (
        <ul className="space-y-1">
          {stockIssues.map((issue) => (
            <li
              key={`${issue.nftId}-${issue.editionId}`}
              className="flex gap-2 text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
