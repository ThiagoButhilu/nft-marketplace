import { X } from 'lucide-react'
import { formatEth } from '@/lib/eth'
import {
  COLLECTION_LABELS,
  NETWORK_LABELS,
  hasActiveFilters,
  type CatalogSearch,
} from './search'

interface Chip {
  key: string
  label: string
  patch: Partial<CatalogSearch>
}

/** Removable summary of the applied filters (search term included). */
export function ActiveFilters({
  search,
  onChange,
  onClear,
}: {
  search: CatalogSearch
  onChange: (patch: Partial<CatalogSearch>) => void
  onClear: () => void
}) {
  if (!hasActiveFilters(search)) return null

  const chips: Chip[] = [
    ...(search.q
      ? [{ key: 'q', label: `“${search.q}”`, patch: { q: undefined } }]
      : []),
    ...(search.collection ?? []).map((id) => ({
      key: `c-${id}`,
      label: COLLECTION_LABELS[id],
      patch: { collection: search.collection?.filter((c) => c !== id) },
    })),
    ...(search.network ?? []).map((id) => ({
      key: `n-${id}`,
      label: NETWORK_LABELS[id],
      patch: { network: search.network?.filter((n) => n !== id) },
    })),
    ...(search.minPrice || search.maxPrice
      ? [
          {
            key: 'price',
            label: `${search.minPrice ? formatEth(search.minPrice) : '0'} – ${search.maxPrice ? formatEth(search.maxPrice) : 'máx.'}`,
            patch: { minPrice: undefined, maxPrice: undefined },
          },
        ]
      : []),
  ]

  return (
    <div
      className="mt-4 flex flex-wrap items-center gap-2"
      aria-label="Filtros aplicados"
      role="group"
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange(chip.patch)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line-soft bg-card px-3 py-1 text-xs hover:border-brand"
          aria-label={`Remover filtro ${chip.label}`}
        >
          {chip.label}
          <X className="size-3" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="px-2 text-xs text-brand-accent underline-offset-4 hover:underline"
      >
        Limpar filtros
      </button>
    </div>
  )
}
