import { Link } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import { NftSort, NftTab } from '@/api/contracts'
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
    // min-w-0/max-w-full: as a flex item the nav would grow to its content;
    // capped, the list scrolls instead of widening the page (320px / 400% zoom).
    <nav
      aria-label="Categorias do catálogo"
      className={cn('max-w-full min-w-0', className)}
    >
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

/**
 * Native <select>: same keyboard and screen-reader behaviour as a custom
 * listbox, platform picker on mobile, and no popover library in the main
 * bundle (Radix Select + Floating UI were ~45 KB minified for this one control).
 */
export function SortSelect({
  search,
  onChange,
  className,
}: {
  search: CatalogSearch
  onChange: (patch: Partial<CatalogSearch>) => void
  className?: string
}) {
  const selectId = useId()
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <label htmlFor={selectId} className="text-[15px]">
        Ordenar por:
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={search.sort ?? 'recent'}
          onChange={(e) => onChange({ sort: NftSort.parse(e.target.value) })}
          className="h-9 cursor-pointer appearance-none rounded-sm bg-transparent pr-7 pl-1 text-[15px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {NftSort.options.map((sort) => (
            <option key={sort} value={sort} className="bg-card text-foreground">
              {SORT_LABELS[sort]}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-1 size-4 -translate-y-1/2 opacity-60"
        />
      </div>
    </div>
  )
}
