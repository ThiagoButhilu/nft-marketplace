import { useLocation, useNavigate } from '@tanstack/react-router'
import { toApiError } from '@/api/errors'
import { notices } from '@/lib/notices'
import { useFavorites, useToggleFavorite } from '@/queries/favorites'
import { useSession } from '@/queries/session'

/** Optimistic favorite toggle (rolls back and explains on failure). */
export function useFavoriteToggle(nft: { id: string; name: string }) {
  const session = useSession()
  const navigate = useNavigate()
  const { href } = useLocation()
  const favorites = useFavorites()
  const toggle = useToggleFavorite(nft.id)
  const isFavorite = favorites.data?.nftIds.includes(nft.id) ?? false

  const onToggle = () => {
    if (!session) {
      notices.push({ tone: 'info', title: 'Entre para salvar favoritos' })
      void navigate({ to: '/login', search: { redirect: href } })
      return
    }
    toggle.mutate(!isFavorite, {
      onSuccess: () =>
        notices.push({
          tone: 'success',
          title: isFavorite
            ? `${nft.name} removido dos favoritos`
            : `${nft.name} adicionado aos favoritos`,
        }),
      onError: (error) =>
        notices.push({
          tone: 'error',
          title: 'Não foi possível atualizar os favoritos',
          description: `${toApiError(error).message} A alteração foi desfeita.`,
        }),
    })
  }
  return { isFavorite, onToggle, pending: toggle.isPending }
}
