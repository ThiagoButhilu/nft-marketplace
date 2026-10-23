import { X } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { toApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { notices } from '@/lib/notices'
import { cn } from '@/lib/utils'
import { useApplyCoupon, useRemoveCoupon } from '@/queries/cart'

/** Promo code field; server errors (invalid / expired) render under the input. */
export function CouponForm({
  appliedCode,
  description,
  compact = false,
}: {
  appliedCode: string | null
  description?: string
  compact?: boolean
}) {
  const id = useId()
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return setError('Informe um código promocional.')
    setError(null)
    apply.mutate(trimmed, {
      onSuccess: (cart) => {
        setCode('')
        notices.push({
          tone: 'success',
          title: `Cupom ${cart.couponCode} aplicado`,
        })
      },
      onError: (err) => {
        const apiError = toApiError(err)
        setError(apiError.fieldErrors.code?.[0] ?? apiError.message)
      },
    })
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-sm border border-brand/60 bg-surface-dark/60 px-3 py-2">
        <p className="text-sm">
          <span className="font-bold text-brand-accent">{appliedCode}</span>
          {description && (
            <span className="block text-xs text-text-secondary">
              {description}
            </span>
          )}
        </p>
        <Button
          variant="ghost"
          size="sm"
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate(undefined, {
              onSuccess: () =>
                notices.push({
                  tone: 'info',
                  title: `Cupom ${appliedCode} removido`,
                }),
              onError: (err) =>
                notices.push({
                  tone: 'error',
                  title: 'Não foi possível remover o cupom',
                  description: toApiError(err).message,
                }),
            })
          }
          aria-label={`Remover cupom ${appliedCode}`}
        >
          <X aria-hidden />
          Remover
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate>
      <label
        htmlFor={id}
        className={cn('text-sm font-bold', compact && 'sr-only')}
      >
        Código promocional
      </label>
      <div className="mt-2 flex">
        <input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Digite o código promocional..."
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-10 min-w-0 flex-1 rounded-l-sm border border-r-0 border-brand bg-transparent px-2 text-xs uppercase placeholder:normal-case placeholder:text-brand-secondary aria-invalid:border-destructive"
        />
        <Button
          type="submit"
          className="w-[100px] rounded-l-none text-base"
          disabled={apply.isPending}
        >
          {apply.isPending ? '…' : 'Aplicar'}
        </Button>
      </div>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </form>
  )
}
