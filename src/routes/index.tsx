import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toApiError } from '@/api/errors'
import { ActiveFilters } from '@/components/catalog/active-filters'
import { CatalogPagination } from '@/components/catalog/catalog-pagination'
import {
  CatalogEmpty,
  CatalogError,
  CatalogGridSkeleton,
} from '@/components/catalog/catalog-states'
import { CatalogTabs, SortSelect } from '@/components/catalog/catalog-toolbar'
import { BlogSection, PromoSection } from '@/components/catalog/editorial'
import { FiltersPanel } from '@/components/catalog/filters-panel'
import {
  DesktopHero,
  MobileHero,
  SpotlightCard,
} from '@/components/catalog/hero'
import {
  FiltersSheet,
  MobileCatalogBar,
} from '@/components/catalog/mobile-catalog-bar'
import { NftCard } from '@/components/catalog/nft-card'
import {
  catalogSearchSchema,
  toListQuery,
  updateCatalogSearch,
  type CatalogSearch,
} from '@/components/catalog/search'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { featuredQuery, nftListQuery } from '@/queries/catalog'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => toListQuery(search),
  // Prefetch without blocking: the page renders skeletons right away.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListQuery(deps))
    void context.queryClient.prefetchQuery(featuredQuery())
  },
  component: HomePage,
})

const SEARCH_DEBOUNCE_MS = 350

function HomePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const listQuery = useMemo(() => toListQuery(search), [search])
  const query = useQuery(nftListQuery(listQuery))
  const { data, isPending, isError, isPlaceholderData, isFetching } = query

  const setSearch = (
    patch: Partial<CatalogSearch>,
    options: { replace?: boolean } = {},
  ) =>
    navigate({
      search: (prev) => updateCatalogSearch(prev, patch),
      replace: options.replace,
      resetScroll: false,
    })
  const clearFilters = () =>
    navigate({
      search: (prev) =>
        updateCatalogSearch({ tab: prev.tab, sort: prev.sort }, {}),
      resetScroll: false,
    })

  // Search box: local while typing, written to the URL after a pause. URL
  // changes (back/forward) flow back into the field.
  const [term, setTerm] = useState(search.q ?? '')
  useEffect(() => setTerm(search.q ?? ''), [search.q])
  useEffect(() => {
    const next = term.trim()
    if (next === (search.q ?? '')) return
    const timer = setTimeout(
      () => setSearch({ q: next || undefined }, { replace: true }),
      SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term])

  const activeCount =
    (search.q ? 1 : 0) +
    (search.collection?.length ?? 0) +
    (search.network?.length ?? 0) +
    (search.minPrice || search.maxPrice ? 1 : 0)

  const filters = (
    <FiltersPanel
      search={search}
      facets={data?.facets}
      onChange={(patch) => void setSearch(patch)}
    />
  )
  const drawerFilters = (
    <div className="space-y-8 pb-4">
      <SortSelect search={search} onChange={(patch) => void setSearch(patch)} />
      {filters}
    </div>
  )

  const updating = isPlaceholderData && isFetching
  const statusMessage = isPending
    ? 'Carregando catálogo…'
    : updating
      ? 'Atualizando resultados…'
      : data
        ? `${data.total} NFT${data.total === 1 ? '' : 's'} encontrado${data.total === 1 ? '' : 's'}`
        : ''

  return (
    <>
      <div className="page-container space-y-4 pt-10 md:hidden">
        <MobileCatalogBar
          term={term}
          onTermChange={setTerm}
          activeCount={activeCount}
          total={data?.total}
          filters={drawerFilters}
        />
        <MobileHero />
      </div>
      <DesktopHero />

      <section
        id="catalogo"
        aria-labelledby="catalog-title"
        className="page-container mt-6 scroll-mt-6 md:mt-24 lg:grid lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-12"
      >
        <h2 id="catalog-title" className="sr-only">
          Catálogo de NFTs
        </h2>

        <aside aria-label="Filtros" className="hidden lg:block">
          <div className="bg-card px-2.5 py-5">{filters}</div>
          <div className="mt-10">
            <SpotlightCard />
          </div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <CatalogTabs search={search} />
            <div className="flex items-center gap-3 max-md:hidden">
              <SortSelect
                search={search}
                onChange={(patch) => void setSearch(patch)}
              />
              <FiltersSheet
                total={data?.total}
                filters={filters}
                trigger={
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal aria-hidden />
                    Filtros{activeCount ? ` (${activeCount})` : ''}
                  </Button>
                }
              />
            </div>
          </div>
          <ActiveFilters
            search={search}
            onChange={(patch) => void setSearch(patch)}
            onClear={clearFilters}
          />

          <p role="status" className="sr-only">
            {statusMessage}
          </p>

          <div className="relative mt-6 md:mt-8">
            {updating && (
              <span
                aria-hidden
                className="absolute -top-6 right-0 text-xs text-text-secondary"
              >
                Atualizando…
              </span>
            )}
            {isPending ? (
              <CatalogGridSkeleton />
            ) : isError && !data ? (
              <CatalogError
                error={toApiError(query.error)}
                onRetry={() => void query.refetch()}
                retrying={isFetching}
              />
            ) : data && data.items.length === 0 ? (
              <CatalogEmpty
                onClear={
                  activeCount || search.tab || search.page
                    ? clearFilters
                    : undefined
                }
              />
            ) : data ? (
              <>
                {isError && (
                  <div
                    role="alert"
                    className="mb-4 flex items-center justify-between gap-3 rounded-sm border border-destructive/50 px-4 py-2 text-sm"
                  >
                    <span>
                      Não foi possível atualizar o catálogo. Exibindo os últimos
                      dados.
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void query.refetch()}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                )}
                <ul
                  aria-busy={updating}
                  className={cn(
                    'grid grid-cols-2 gap-x-4 gap-y-8 transition-opacity lg:grid-cols-3 lg:gap-x-8 lg:gap-y-14',
                    updating && 'opacity-60',
                  )}
                >
                  {data.items.map((nft, index) => (
                    <li key={nft.id} className="max-md:even:mt-8">
                      <NftCard nft={nft} priority={index < 2} />
                    </li>
                  ))}
                </ul>
                <CatalogPagination
                  search={search}
                  page={data.page}
                  totalPages={data.totalPages}
                />
              </>
            ) : null}
          </div>
        </div>
      </section>

      <PromoSection />
      <BlogSection />
    </>
  )
}
