import type {
  FeaturedResponse,
  NftDetail,
  NftListQuery,
  NftListResponse,
  NftSummary,
} from '@/api/contracts'
import { FEATURED_IDS, FIXTURE_NOW, type NftRecord } from '../fixtures/nfts'
import { scenario } from '../scenarios'
import { notFound } from './errors'
import { eth, toEth } from './money'
import { store } from './store'

const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const COLLECTION_LABELS: Record<string, string> = {
  'digital-art': 'arte digital',
  photography: 'fotografia',
  music: 'música',
  '3d-art': 'arte 3d',
  collectibles: 'colecionáveis',
  generative: 'generativa',
  games: 'jogos',
  memberships: 'assinaturas',
  utility: 'utilidade',
}

export function isSoldOut(nft: NftRecord) {
  return nft.editions.every((edition) => edition.available === 0)
}

export function toSummary(nft: NftRecord): NftSummary {
  return {
    id: nft.id,
    name: nft.name,
    tokenId: nft.tokenId,
    imageUrl: nft.imageUrl,
    imageAlt: nft.imageAlt,
    price: nft.price,
    compareAtPrice: nft.compareAtPrice,
    network: nft.network,
    collection: nft.collection,
    rarity: nft.rarity,
    listedAt: nft.listedAt,
    version: nft.version,
    soldOut: isSoldOut(nft),
  }
}

export function toDetail(nft: NftRecord): NftDetail {
  // Strip internal-only fields.
  const { trending: _trending, ...rest } = nft
  return { ...rest, soldOut: isSoldOut(nft) }
}

export function getNftRecord(id: string) {
  const nft = store.db.nfts[id]
  if (!nft) throw notFound('NFT')
  return nft
}

function allNfts() {
  return store.db.nftOrder.map((id) => store.db.nfts[id])
}

function matchesText(nft: NftRecord, q: string) {
  const needle = q.toLocaleLowerCase('pt-BR')
  return [
    nft.name,
    nft.tokenId,
    COLLECTION_LABELS[nft.collection],
    nft.network,
  ].some((field) => field.toLocaleLowerCase('pt-BR').includes(needle))
}

export function listNfts(query: NftListQuery): NftListResponse {
  const source = scenario.config.emptyCatalog ? [] : allNfts()

  const base = source.filter((nft) => {
    if (query.q && !matchesText(nft, query.q)) return false
    if (
      query.tab === 'new' &&
      Date.parse(nft.listedAt) < FIXTURE_NOW - NEW_WINDOW_MS
    )
      return false
    if (query.tab === 'trending' && !nft.trending) return false
    if (query.minPrice && eth(nft.price).lt(query.minPrice)) return false
    if (query.maxPrice && eth(nft.price).gt(query.maxPrice)) return false
    return true
  })

  const inCollections = (nft: NftRecord) =>
    !query.collection?.length || query.collection.includes(nft.collection)
  const inNetworks = (nft: NftRecord) =>
    !query.network?.length || query.network.includes(nft.network)

  const filtered = base.filter((nft) => inCollections(nft) && inNetworks(nft))

  const sorted = [...filtered].sort((a, b) => {
    switch (query.sort) {
      case 'price-asc':
        return eth(a.price).cmp(b.price) || a.name.localeCompare(b.name)
      case 'price-desc':
        return eth(b.price).cmp(a.price) || a.name.localeCompare(b.name)
      case 'name':
        return a.name.localeCompare(b.name, 'pt-BR')
      case 'recent':
      default:
        return (
          Date.parse(b.listedAt) - Date.parse(a.listedAt) ||
          a.name.localeCompare(b.name)
        )
    }
  })

  const total = sorted.length
  const totalPages = Math.ceil(total / query.pageSize)
  const start = (query.page - 1) * query.pageSize

  // Each facet counts with every other filter applied (standard faceting).
  const count = <K extends string>(
    items: NftRecord[],
    key: (n: NftRecord) => K,
  ) => {
    const counts = new Map<K, number>()
    for (const item of items)
      counts.set(key(item), (counts.get(key(item)) ?? 0) + 1)
    return [...counts].map(([id, n]) => ({ id, count: n }))
  }
  const prices = source.map((n) => eth(n.price))
  const min = prices.reduce(
    (acc, p) => (p.lt(acc) ? p : acc),
    prices[0] ?? eth(0),
  )
  const max = prices.reduce(
    (acc, p) => (p.gt(acc) ? p : acc),
    prices[0] ?? eth(0),
  )

  return {
    items: sorted.slice(start, start + query.pageSize).map(toSummary),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages,
    facets: {
      collections: count(base.filter(inNetworks), (n) => n.collection),
      networks: count(base.filter(inCollections), (n) => n.network),
      priceRange: { min: toEth(min), max: toEth(max) },
    },
  }
}

export function getFeatured(): FeaturedResponse {
  return {
    hero: FEATURED_IDS.hero.map((id) => toSummary(getNftRecord(id))),
    spotlight: toSummary(getNftRecord(FEATURED_IDS.spotlight)),
  }
}

/**
 * Applies a price/availability change and publishes `nft.updated`, keeping
 * REST and Socket.IO in sync. Used by checkout hooks, the live market and
 * the mock control API.
 */
export function updateNft(
  id: string,
  patch: {
    price?: string
    compareAtPrice?: string | null
    editions?: Record<string, number>
  },
) {
  const nft = getNftRecord(id)
  store.mutate(() => {
    if (patch.price !== undefined) nft.price = toEth(eth(patch.price))
    if (patch.compareAtPrice !== undefined)
      nft.compareAtPrice = patch.compareAtPrice
    for (const [editionId, available] of Object.entries(patch.editions ?? {})) {
      const edition = nft.editions.find((e) => e.id === editionId)
      if (edition) edition.available = Math.max(0, available)
    }
    nft.version += 1
  })
  return store.emit({
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    data: {
      price: nft.price,
      compareAtPrice: nft.compareAtPrice,
      soldOut: isSoldOut(nft),
      editions: nft.editions.map((e) => ({ id: e.id, available: e.available })),
    },
  })
}
