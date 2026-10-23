import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { NftSort, NftTab } from '@/api/contracts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  SORT_LABELS,
  TAB_LABELS,
  updateCatalogSearch,
  type CatalogSearch,
} from './search'

/** Tabs are links: each one is a URL, so back/forward restores it. */
export function CatalogTabs({
  search,
  className,
}: {
  search: CatalogSearch
  className?: string
}) {
  const active = search.tab ?? 'all'
  return (
    <nav aria-label="Categorias do catálogo" className={className}>
      <ul className="flex gap-4 overflow-x-auto whitespace-nowrap md:gap-5">
        {NftTab.options.map((tab) => (
          <li key={tab}>
            <Link
              to="/"
              search={updateCatalogSearch(search, { tab })}
              resetScroll={false}
              aria-current={active === tab ? 'page' : undefined}
              className={cn(
                'inline-block py-1 text-[15px] transition-colors hover:text-brand-accent',
                active === tab
                  ? 'font-bold text-brand-accent underline decoration-2 underline-offset-[6px]'
                  : 'text-foreground',
              )}
            >
              {TAB_LABELS[tab]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function SortSelect({
  search,
  onChange,
  className,
}: {
  search: CatalogSearch
  onChange: (patch: Partial<CatalogSearch>) => void
  className?: string
}) {
  const labelId = useId()
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span id={labelId} className="text-[15px]">
        Ordenar por:
      </span>
      <Select
        value={search.sort ?? 'recent'}
        onValueChange={(value) => onChange({ sort: NftSort.parse(value) })}
      >
        <SelectTrigger
          aria-labelledby={labelId}
          className="h-9 border-0 bg-transparent px-1 text-[15px] shadow-none focus-visible:ring-2"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-line bg-card">
          {NftSort.options.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
