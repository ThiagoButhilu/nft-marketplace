import { Check } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import type { CollectionId, Network, NftListResponse } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { COLLECTION_LABELS, NETWORK_LABELS, type CatalogSearch } from './search'

type Facets = NftListResponse['facets']

interface FiltersPanelProps {
  search: CatalogSearch
  facets: Facets | undefined
  onChange: (patch: Partial<CatalogSearch>) => void
  className?: string
}

const COLLECTION_ORDER = Object.keys(COLLECTION_LABELS) as CollectionId[]
const NETWORK_ORDER = Object.keys(NETWORK_LABELS) as Network[]

/** Sidebar filters (desktop) / drawer content (mobile). Filters combine. */
export function FiltersPanel({
  search,
  facets,
  onChange,
  className,
}: FiltersPanelProps) {
  const count = (list: Facets['collections'] | undefined, id: string) =>
    list?.find((f) => f.id === id)?.count ?? 0

  const toggle = <T extends string>(list: T[] | undefined, value: T) =>
    list?.includes(value)
      ? list.filter((v) => v !== value)
      : [...(list ?? []), value]

  return (
    <div className={cn('space-y-8', className)}>
      <FilterGroup title="Coleções">
        {COLLECTION_ORDER.map((id) => (
          <FilterOption
            key={id}
            label={COLLECTION_LABELS[id]}
            count={count(facets?.collections, id)}
            checked={search.collection?.includes(id) ?? false}
            onToggle={() =>
              onChange({ collection: toggle(search.collection, id) })
            }
          />
        ))}
      </FilterGroup>

      <PriceRange search={search} facets={facets} onChange={onChange} />

      <FilterGroup title="Rede">
        {NETWORK_ORDER.map((id) => (
          <FilterOption
            key={id}
            label={NETWORK_LABELS[id]}
            count={count(facets?.networks, id)}
            checked={search.network?.includes(id) ?? false}
            onToggle={() => onChange({ network: toggle(search.network, id) })}
            muted
          />
        ))}
      </FilterGroup>
    </div>
  )
}

function FilterGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-lg font-bold">{title}</legend>
      <ul className="space-y-1">{children}</ul>
    </fieldset>
  )
}

/**
 * Text rows as in the Figma, backed by a native checkbox: keyboard and screen
 * readers get real checkbox semantics; selection shows a check mark, not just color.
 */
function FilterOption({
  label,
  count,
  checked,
  onToggle,
  muted = false,
}: {
  label: string
  count: number
  checked: boolean
  onToggle: () => void
  muted?: boolean
}) {
  return (
    <li>
      <label
        className={cn(
          'flex min-h-10 cursor-pointer items-center gap-2 rounded-sm px-3 text-[15px] transition-colors hover:bg-surface-dark has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
          checked
            ? 'font-bold text-brand-accent'
            : muted
              ? 'text-text-secondary'
              : 'text-brand-accent/85',
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onToggle}
        />
        <Check
          className={cn(
            'size-4 shrink-0',
            checked ? 'opacity-100' : 'opacity-0',
          )}
          aria-hidden
        />
        <span className="flex-1">{label}</span>
        <span
          className={cn(
            'tabular-nums',
            muted ? 'text-text-secondary' : 'font-bold',
          )}
        >
          <span aria-hidden>({count})</span>
          <span className="sr-only">, {count} resultados</span>
        </span>
      </label>
    </li>
  )
}

/** Slider works in hundredths of ETH; the URL keeps decimal strings. */
const toCents = (eth: string | undefined, fallback: number) =>
  eth === undefined ? fallback : Math.round(Number(eth) * 100)
const toEthString = (cents: number) => (cents / 100).toFixed(2)
const display = (cents: number) => toEthString(cents).replace('.', ',')

function PriceRange({
  search,
  facets,
  onChange,
}: Omit<FiltersPanelProps, 'className'>) {
  const titleId = useId()
  const floor = 0
  const ceiling = Math.max(toCents(facets?.priceRange.max, 1230), 100)
  const committed: [number, number] = [
    toCents(search.minPrice, toCents(facets?.priceRange.min, floor)),
    toCents(search.maxPrice, ceiling),
  ]
  const [value, setValue] = useState<[number, number]>(committed)

  // Follow URL changes (history navigation, "limpar filtros").
  const committedKey = committed.join('-')
  useEffect(() => {
    setValue(committed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedKey])

  const dirty = value[0] !== committed[0] || value[1] !== committed[1]

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="mb-4 text-lg font-bold">
        Faixa de preço
      </h2>
      <Slider
        min={floor}
        max={ceiling}
        step={1}
        minStepsBetweenThumbs={1}
        value={value}
        onValueChange={(v) => setValue([v[0], v[1]])}
        thumbLabels={['Preço mínimo em ETH', 'Preço máximo em ETH']}
        className="px-1"
      />
      <p className="mt-4 px-3 text-sm" aria-live="polite">
        Preço: {display(value[0])} - {display(value[1])} ETH
      </p>
      <Button
        size="sm"
        className="mt-3 ml-3 text-[15px]"
        disabled={!dirty}
        onClick={() =>
          onChange({
            minPrice: value[0] > floor ? toEthString(value[0]) : undefined,
            maxPrice: value[1] < ceiling ? toEthString(value[1]) : undefined,
          })
        }
      >
        Aplicar
      </Button>
    </section>
  )
}
