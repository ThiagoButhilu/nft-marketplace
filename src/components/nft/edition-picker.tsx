import { useId } from 'react'
import type { Edition } from '@/api/contracts'
import { cn } from '@/lib/utils'
import { editionLabel, editionStatus } from './editions'

/**
 * Edition chips as a native radio group (arrow keys move between options).
 * Sold-out editions stay selectable so their status can be read, but are
 * struck through and flagged; buying is blocked by the purchase panel.
 */
export function EditionPicker({
  editions,
  value,
  onChange,
  className,
}: {
  editions: Edition[]
  value: string
  onChange: (editionId: string) => void
  className?: string
}) {
  const name = useId()
  const selected = editions.find((e) => e.id === value)
  return (
    <fieldset className={className}>
      <legend className="text-base font-bold">Edição:</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {editions.map((edition) => {
          const soldOut = edition.available === 0
          return (
            <label
              key={edition.id}
              className={cn(
                'relative inline-flex h-7 cursor-pointer items-center rounded-full border px-2.5 text-[13px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                edition.id === value
                  ? 'border-brand-accent font-bold text-brand-accent'
                  : 'border-line-soft text-text-secondary hover:border-brand',
                soldOut && 'line-through decoration-1 opacity-70',
              )}
            >
              <input
                type="radio"
                name={name}
                value={edition.id}
                checked={edition.id === value}
                onChange={() => onChange(edition.id)}
                className="sr-only"
                aria-describedby={`${name}-status`}
              />
              {editionLabel(edition)}
              {soldOut && <span className="sr-only"> (esgotada)</span>}
            </label>
          )
        })}
      </div>
      {selected && (
        <p
          id={`${name}-status`}
          className={cn(
            'mt-2 text-xs',
            selected.available === 0
              ? 'text-destructive'
              : 'text-text-secondary',
          )}
        >
          {selected.available === 0
            ? 'Edição indisponível: esta edição está esgotada.'
            : editionStatus(selected)}
        </p>
      )}
    </fieldset>
  )
}
