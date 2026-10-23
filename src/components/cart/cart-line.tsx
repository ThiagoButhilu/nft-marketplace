import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CartLine } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { QuantityStepper } from '@/components/common/quantity-stepper'
import { editionLabel } from '@/components/nft/editions'
import { formatEth } from '@/lib/eth'
import { notices } from '@/lib/notices'
import { cn } from '@/lib/utils'
import { useRemoveCartItem, useUpdateCartItem } from '@/queries/cart'
import { IMAGE_SIZES, responsiveImage } from '@/lib/images'

const QUANTITY_DEBOUNCE_MS = 400

/** Desktop column template shared by the header row and every line. */
export const CART_GRID = 'md:grid-cols-[minmax(0,1fr)_120px_120px_130px_48px]'

/**
 * One cart line. Quantity changes show immediately and are sent once the
 * user stops clicking, so a burst of clicks becomes one request with the
 * final value (never several requests computed from a stale quantity).
 */
export function CartLineRow({
  line,
  onRemoved,
}: {
  line: CartLine
  onRemoved: (line: CartLine) => void
}) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const [draft, setDraft] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const quantity = draft ?? line.quantity
  const max = Math.max(1, Math.min(line.available, line.maxPerOrder))
  const editionText =
    line.editionKind === 'open'
      ? 'aberta'
      : editionLabel({ kind: line.editionKind })

  useEffect(() => () => clearTimeout(timer.current), [])

  const changeQuantity = (next: number) => {
    setDraft(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (next === line.quantity) return setDraft(null)
      update.mutate(
        { nftId: line.nftId, editionId: line.editionId, quantity: next },
        {
          onSuccess: () =>
            notices.push({
              tone: 'success',
              title: `Quantidade de ${line.name}: ${next}`,
            }),
          onError: (error) =>
            notices.push({
              tone: 'error',
              title: `Não foi possível alterar ${line.name}`,
              description: toApiError(error).message,
            }),
          onSettled: () => setDraft(null),
        },
      )
    }, QUANTITY_DEBOUNCE_MS)
  }

  const onRemove = () =>
    remove.mutate(
      { nftId: line.nftId, editionId: line.editionId },
      {
        onSuccess: () => {
          notices.push({
            tone: 'success',
            title: `${line.name} removido do carrinho`,
          })
          onRemoved(line)
        },
        onError: (error) =>
          notices.push({
            tone: 'error',
            title: `Não foi possível remover ${line.name}`,
            description: toApiError(error).message,
          }),
      },
    )

  const pending = update.isPending || remove.isPending
  const overStock = line.quantity > line.available

  return (
    <li
      aria-busy={pending}
      className={cn(
        'grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 bg-card p-3 transition-opacity md:min-h-[70px] md:gap-y-0 md:p-0 md:pr-2',
        CART_GRID,
        pending && 'opacity-70',
      )}
    >
      <div className="flex min-w-0 items-center gap-4 max-md:contents">
        <img
          {...responsiveImage(line.imageUrl, IMAGE_SIZES.list)}
          alt=""
          width={70}
          height={70}
          loading="lazy"
          className="size-16 shrink-0 object-cover max-md:rounded-xl md:size-[70px]"
        />
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold">
            <Link
              to="/nft/$nftId"
              params={{ nftId: line.nftId }}
              search={{ edicao: line.editionId.split(':')[1] }}
              className="hover:text-brand-accent"
            >
              {line.name}
            </Link>
          </h3>
          <p className="flex items-center gap-2 text-sm text-text-secondary">
            ID do token: {line.tokenId}
            <span className="shrink-0 rounded-full border border-line-soft px-1.5 text-[11px] text-text-secondary">
              <span className="sr-only">Edição </span>
              {editionText}
            </span>
          </p>
          {line.priceChanged && line.previousUnitPrice && (
            <p className="mt-1 text-xs font-bold text-brand-accent">
              Preço alterado:{' '}
              <span className="line-through">
                {formatEth(line.previousUnitPrice)}
              </span>{' '}
              → {formatEth(line.unitPrice)}
            </p>
          )}
          {overStock && (
            <p className="mt-1 text-xs text-destructive">
              {line.available === 0
                ? 'Esgotado: remova o item para continuar.'
                : `Restam apenas ${line.available}. Ajuste a quantidade.`}
            </p>
          )}
        </div>
      </div>

      <p className="text-base text-brand-accent max-md:col-start-2 max-md:text-sm">
        <span className="sr-only">Preço unitário: </span>
        <span className="md:hidden text-text-secondary" aria-hidden>
          Unitário{' '}
        </span>
        {formatEth(line.unitPrice)}
      </p>

      <QuantityStepper
        value={quantity}
        max={max}
        onChange={changeQuantity}
        label={line.name}
        size="sm"
        disabled={remove.isPending || line.available === 0}
        className="max-md:col-start-1 max-md:row-start-3 max-md:col-span-2"
      />

      <p className="text-base font-bold text-brand-accent max-md:col-start-2 max-md:row-start-3 max-md:justify-self-end max-md:pr-12">
        <span className="sr-only">Total da linha: </span>
        {formatEth(line.lineTotal)}
      </p>

      <button
        type="button"
        onClick={onRemove}
        disabled={remove.isPending}
        aria-label={`Remover ${line.name} (edição ${editionText}) do carrinho`}
        className="grid size-10 place-items-center justify-self-end rounded-sm text-text-secondary transition-colors hover:text-destructive disabled:opacity-50 max-md:col-start-2 max-md:row-start-3"
      >
        <Trash2 className="size-5" aria-hidden />
      </button>
    </li>
  )
}

export function CartLinesSkeleton() {
  return (
    <ul aria-hidden className="space-y-3">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="flex h-[70px] items-center gap-4 bg-card">
          <div className="skeleton size-[70px]" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-1/3 rounded-sm" />
            <div className="skeleton h-3 w-1/4 rounded-sm" />
          </div>
        </li>
      ))}
    </ul>
  )
}
