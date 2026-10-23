import { z } from 'zod'
import {
  CollectionId,
  EthAmount,
  Network,
  NftListQuery,
  NftSort,
  NftTab,
} from '@/api/contracts'

/**
 * Catalog state in the URL. Invalid values are dropped (`.catch`) instead of
 * failing the route, so a hand-edited or stale link still renders.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  collection: z.array(CollectionId).optional().catch(undefined),
  network: z.array(Network).optional().catch(undefined),
  minPrice: EthAmount.optional().catch(undefined),
  maxPrice: EthAmount.optional().catch(undefined),
  tab: NftTab.optional().catch(undefined),
  sort: NftSort.optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const CATALOG_PAGE_SIZE = 9

/** URL state → API query (defaults applied, same schema as the mocks). */
export function toListQuery(search: CatalogSearch): NftListQuery {
  return NftListQuery.parse({ ...search, pageSize: CATALOG_PAGE_SIZE })
}

const DEFAULTS: Partial<CatalogSearch> = { tab: 'all', sort: 'recent', page: 1 }

/**
 * Applies a change to the catalog search. Any filter change resets the page;
 * defaults and empty values are removed to keep URLs short and canonical.
 */
export function updateCatalogSearch(
  current: CatalogSearch,
  patch: Partial<CatalogSearch>,
): CatalogSearch {
  const next: CatalogSearch = { ...current, ...patch }
  if (!('page' in patch)) next.page = undefined
  for (const key of Object.keys(next) as Array<keyof CatalogSearch>) {
    const value = next[key]
    if (
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0) ||
      DEFAULTS[key] === value
    ) {
      delete next[key]
    }
  }
  return next
}

export const hasActiveFilters = (search: CatalogSearch) =>
  Boolean(
    search.q ||
    search.collection?.length ||
    search.network?.length ||
    search.minPrice ||
    search.maxPrice,
  )

export const COLLECTION_LABELS: Record<CollectionId, string> = {
  'digital-art': 'Arte digital',
  photography: 'Fotografia',
  music: 'Música',
  '3d-art': 'Arte 3D',
  collectibles: 'Colecionáveis',
  generative: 'Generativa',
  games: 'Jogos',
  memberships: 'Assinaturas',
  utility: 'Utilidade',
}

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const TAB_LABELS: Record<NftTab, string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

export const SORT_LABELS: Record<NftSort, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  name: 'Nome (A–Z)',
}
