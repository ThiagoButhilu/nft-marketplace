import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Round −/+ stepper from the Figma (detail and cart). Integer only; the
 * current value is announced politely when it changes.
 */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className,
}: {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  /** Context for the accessible names, e.g. "Emerald Ape #042". */
  label: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const button = cn(
    'grid shrink-0 place-items-center rounded-full bg-primary text-ink transition-colors hover:bg-brand-accent disabled:cursor-not-allowed disabled:opacity-40',
    // sm stays at 24px: the WCAG 2.2 minimum target size.
    size === 'md' ? 'size-8' : 'size-6',
  )
  const icon = size === 'md' ? 'size-5' : 'size-3.5'
  return (
    <div
      role="group"
      aria-label={`Quantidade de ${label}`}
      className={cn('flex items-center gap-3', className)}
    >
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label={`Diminuir quantidade de ${label}`}
      >
        <Minus className={icon} strokeWidth={2.5} aria-hidden />
      </button>
      <output
        aria-live="polite"
        className={cn(
          'min-w-5 text-center tabular-nums',
          size === 'md' ? 'text-lg' : 'text-[15px]',
        )}
      >
        <span className="sr-only">Quantidade: </span>
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label={`Aumentar quantidade de ${label}`}
      >
        <Plus className={icon} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  )
}
