import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const formatAverage = (value: number) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

export function RatingStars({
  average,
  count,
  className,
}: {
  average: number
  count: number
  className?: string
}) {
  const filled = Math.round(average)
  return (
    <p className={cn('flex items-center gap-1 text-sm', className)}>
      <span className="sr-only">Avaliação {formatAverage(average)} de 5,</span>
      <span aria-hidden className="flex gap-0.5 text-text-primary">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn('size-3.5', i < filled && 'fill-current')}
          />
        ))}
      </span>
      <span className="ml-1">{count} avaliações de colecionadores</span>
    </p>
  )
}

/** Compact pill from the mobile frame: "★ 4.8 (19)". */
export function RatingPill({
  average,
  count,
}: {
  average: number
  count: number
}) {
  return (
    <p className="inline-flex items-center gap-1 rounded-full border border-brand px-2 py-0.5 text-sm">
      <Star
        className="size-3.5 fill-brand-accent text-brand-accent"
        aria-hidden
      />
      <span className="sr-only">Avaliação</span>
      <span className="font-bold">{formatAverage(average)}</span>
      <span className="text-text-secondary">
        ({count}
        <span className="sr-only"> avaliações</span>)
      </span>
    </p>
  )
}
