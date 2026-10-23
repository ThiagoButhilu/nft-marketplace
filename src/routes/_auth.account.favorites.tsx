import { useQueries } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { toApiError } from '@/api/errors'
import { AccountLayout } from '@/components/account/account-layout'
import { AccountError } from '@/components/account/account-states'
import { NftCard, NftCardSkeleton } from '@/components/catalog/nft-card'
import { Button } from '@/components/ui/button'
import { nftDetailQuery } from '@/queries/catalog'
import { useFavorites } from '@/queries/favorites'

export const Route = createFileRoute('/_auth/account/favorites')({
  component: FavoritesPage,
})

/** "Lista de interesse": the user's favorites (not in the Figma; reuses the catalog card). */
function FavoritesPage() {
  const favorites = useFavorites()
  const ids = favorites.data?.nftIds ?? []
  const details = useQueries({ queries: ids.map((id) => nftDetailQuery(id)) })

  return (
    <AccountLayout title="Lista de interesse">
      {favorites.isPending ? (
        <ul aria-hidden className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <NftCardSkeleton />
            </li>
          ))}
        </ul>
      ) : favorites.isError ? (
        <AccountError
          error={toApiError(favorites.error)}
          onRetry={() => void favorites.refetch()}
        />
      ) : ids.length === 0 ? (
        <div className="mt-6 flex flex-col items-start gap-3">
          <Heart className="size-8 text-brand-accent" aria-hidden />
          <p className="text-sm text-text-secondary">
            Você ainda não favoritou nenhum NFT. Toque no coração de um NFT para
            salvá-lo aqui.
          </p>
          <Button asChild>
            <Link to="/" hash="catalogo">
              Explorar NFTs
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6">
          {details.map((detail, index) => (
            <li key={ids[index]}>
              {detail.data ? (
                <NftCard nft={detail.data} />
              ) : (
                <NftCardSkeleton />
              )}
            </li>
          ))}
        </ul>
      )}
    </AccountLayout>
  )
}
