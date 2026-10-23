import { z } from 'zod'
import { EthAmount, IsoDateTime, Network, paginated } from './common'

export const EditionKind = z.enum(['1/1', '1/10', '1/50', 'open'])
export type EditionKind = z.infer<typeof EditionKind>

export const Edition = z.object({
  id: z.string(),
  kind: EditionKind,
  /** Total supply; null for open editions. */
  supply: z.number().int().positive().nullable(),
  available: z.number().int().min(0),
})
export type Edition = z.infer<typeof Edition>

export const CollectionId = z.enum([
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'games',
  'memberships',
  'utility',
])
export type CollectionId = z.infer<typeof CollectionId>

export const NftSummary = z.object({
  id: z.string(),
  name: z.string(),
  tokenId: z.string(),
  imageUrl: z.string(),
  imageAlt: z.string(),
  price: EthAmount,
  /** Previous price, shown struck through when present. */
  compareAtPrice: EthAmount.nullable(),
  network: Network,
  collection: CollectionId,
  rarity: z.enum(['common', 'rare']),
  listedAt: IsoDateTime,
  /** Increments on every price/availability change; used to order events. */
  version: z.number().int().min(1),
  soldOut: z.boolean(),
})
export type NftSummary = z.infer<typeof NftSummary>

export const NftDetail = NftSummary.extend({
  description: z.string(),
  longDescription: z.array(z.string()),
  gallery: z.array(z.object({ url: z.string(), alt: z.string() })),
  editions: z.array(Edition),
  seriesName: z.string(),
  attributes: z.array(z.string()),
  contractAddress: z.string(),
  royaltyPercent: z.number(),
  rating: z.object({ average: z.number(), count: z.number().int() }),
  /** Max quantity per edition in a single order. */
  maxPerOrder: z.number().int().positive(),
  relatedIds: z.array(z.string()),
})
export type NftDetail = z.infer<typeof NftDetail>

export const NftSort = z.enum(['recent', 'price-asc', 'price-desc', 'name'])
export type NftSort = z.infer<typeof NftSort>

export const NftTab = z.enum(['all', 'new', 'trending'])
export type NftTab = z.infer<typeof NftTab>

/**
 * Catalog query. Mirrors the URL search params of the home route, so the
 * same schema validates both the router state and the API request.
 */
export const NftListQuery = z.object({
  q: z.string().trim().max(80).optional(),
  collection: z.array(CollectionId).optional(),
  network: z.array(Network).optional(),
  minPrice: EthAmount.optional(),
  maxPrice: EthAmount.optional(),
  tab: NftTab.default('all'),
  sort: NftSort.default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(9),
})
export type NftListQuery = z.infer<typeof NftListQuery>
export type NftListQueryInput = z.input<typeof NftListQuery>

export const Facet = z.object({ id: z.string(), count: z.number().int() })

export const NftListResponse = paginated(NftSummary).extend({
  facets: z.object({
    collections: z.array(Facet),
    networks: z.array(Facet),
    priceRange: z.object({ min: EthAmount, max: EthAmount }),
  }),
})
export type NftListResponse = z.infer<typeof NftListResponse>

export const FeaturedResponse = z.object({
  hero: z.array(NftSummary),
  spotlight: NftSummary,
})
export type FeaturedResponse = z.infer<typeof FeaturedResponse>
