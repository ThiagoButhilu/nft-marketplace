import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FavoriteList } from '@/api/contracts'
import { favoritesApi } from '@/api/endpoints'
import { useSession } from './session'
import { queryKeys } from './keys'

export function useFavorites() {
  const userId = useSession()?.user.id
  return useQuery({
    queryKey: queryKeys.user.favorites(userId ?? 'anonymous'),
    queryFn: ({ signal }) => favoritesApi.list({ signal }),
    enabled: !!userId,
  })
}

/**
 * Optimistic toggle with rollback: the heart flips immediately, the previous
 * list is restored if the server rejects the change. Mutations for the same
 * NFT share a scope so they run in order.
 */
export function useToggleFavorite(nftId: string) {
  const queryClient = useQueryClient()
  const userId = useSession()?.user.id
  const key = queryKeys.user.favorites(userId ?? 'anonymous')

  return useMutation({
    mutationKey: ['favorite', nftId],
    scope: { id: `favorite:${nftId}` },
    mutationFn: (favorite: boolean) =>
      favorite ? favoritesApi.add(nftId) : favoritesApi.remove(nftId),
    onMutate: async (favorite) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoriteList>(key)
      queryClient.setQueryData<FavoriteList>(key, (current) => {
        const ids = new Set(current?.nftIds ?? [])
        if (favorite) ids.add(nftId)
        else ids.delete(nftId)
        return { nftIds: [...ids] }
      })
      return { previous }
    },
    onError: (_error, _favorite, context) => {
      queryClient.setQueryData(key, context?.previous)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key, data)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
