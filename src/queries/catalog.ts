import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { NftListQuery } from '@/api/contracts'
import { catalogApi } from '@/api/endpoints'
import { queryKeys } from './keys'

/**
 * Catalog list. `placeholderData: keepPreviousData` keeps the previous page
 * on screen (flagged as `isPlaceholderData`) while the new filters load; the
 * AbortSignal cancels the request when the filters change again.
 */
export const nftListQuery = (query: NftListQuery) =>
  queryOptions({
    queryKey: queryKeys.nfts.list(query),
    queryFn: ({ signal }) => catalogApi.list(query, { signal }),
    placeholderData: keepPreviousData,
  })

export const nftDetailQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.nfts.detail(id),
    queryFn: ({ signal }) => catalogApi.detail(id, { signal }),
  })

export const featuredQuery = () =>
  queryOptions({
    queryKey: queryKeys.nfts.featured(),
    queryFn: ({ signal }) => catalogApi.featured({ signal }),
    staleTime: 5 * 60_000,
  })
