import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useFavoriteToggle } from './use-favorite-toggle'

export function FavoriteButton({
  nft,
  className,
}: {
  nft: { id: string; name: string }
  className?: string
}) {
  const { isFavorite, onToggle } = useFavoriteToggle(nft)
  return (
    <Button
      variant="outline"
      onClick={onToggle}
      aria-pressed={isFavorite}
      className={cn('font-medium', className)}
    >
      <Heart
        className={cn('size-5', isFavorite && 'fill-brand-accent')}
        aria-hidden
      />
      {isFavorite ? 'Favoritado' : 'Favoritar'}
    </Button>
  )
}

export function FavoriteIconButton({
  nft,
  className,
}: {
  nft: { id: string; name: string }
  className?: string
}) {
  const { isFavorite, onToggle } = useFavoriteToggle(nft)
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isFavorite}
      aria-label={
        isFavorite
          ? `Remover ${nft.name} dos favoritos`
          : `Favoritar ${nft.name}`
      }
      className={cn(
        'grid size-9 place-items-center rounded-full border border-line-soft bg-ink/70 text-brand-accent',
        className,
      )}
    >
      <Heart
        className={cn('size-[18px]', isFavorite && 'fill-brand-accent')}
        aria-hidden
      />
    </button>
  )
}
