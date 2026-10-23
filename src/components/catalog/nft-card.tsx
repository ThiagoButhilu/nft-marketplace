import { Link } from '@tanstack/react-router'
import { Heart, Search, ShoppingCart } from 'lucide-react'
import type { NftSummary } from '@/api/contracts'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { useFavoriteToggle } from '@/components/nft/use-favorite-toggle'

interface NftCardProps {
  nft: NftSummary
  /** First row of the grid: load eagerly. */
  priority?: boolean
  className?: string
}

/**
 * Catalog card. The title is the link to the NFT; quick actions are sibling
 * buttons (never nested inside the link) so each is reachable by keyboard.
 */
export function NftCard({ nft, priority = false, className }: NftCardProps) {
  return (
    <article className={cn('group relative', className)}>
      <div className="relative bg-card p-1.5 max-md:rounded-[20px]">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          tabIndex={-1}
          aria-hidden
          className="block"
        >
          <img
            src={nft.imageUrl}
            alt=""
            width={400}
            height={400}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className={cn(
              'aspect-square w-full rounded-[14px] object-cover transition-transform duration-300 group-hover:scale-[1.02]',
              nft.soldOut && 'opacity-60 grayscale-[40%]',
            )}
          />
        </Link>
        {nft.rarity === 'rare' && (
          <span className="absolute top-0 left-0 bg-primary px-3 py-1 text-sm font-medium text-ink">
            RARO
          </span>
        )}
        {nft.soldOut && (
          <span className="absolute bottom-3 left-3 rounded-full bg-ink/85 px-2.5 py-1 text-xs font-bold text-text-primary">
            Esgotado
          </span>
        )}
        <CardActions nft={nft} />
      </div>
      <h3 className="mt-5 text-[15px] leading-5">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          className="after:absolute after:inset-0 after:content-[''] hover:text-brand-accent focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring"
        >
          {nft.name}
        </Link>
      </h3>
      <p className="mt-0.5 text-base font-bold text-brand-accent">
        <span className="sr-only">Preço: </span>
        {formatEth(nft.price)}
        {nft.compareAtPrice && (
          <span className="ml-2 font-normal text-brand-secondary line-through">
            <span className="sr-only">, antes </span>
            {formatEth(nft.compareAtPrice)}
          </span>
        )}
      </p>
    </article>
  )
}

const actionClass =
  'relative z-10 grid size-9 place-items-center rounded-sm bg-ink/90 text-text-primary transition-colors hover:text-brand-accent'

function CardActions({ nft }: { nft: NftSummary }) {
  const { isFavorite, onToggle: onFavorite } = useFavoriteToggle(nft)

  return (
    // Mobile (Figma): only the heart, top-right, always visible. From md up:
    // three actions revealed on hover/focus.
    <div className="absolute top-3 right-3 z-10 flex justify-center gap-2 transition-opacity md:inset-x-0 md:top-auto md:right-auto md:bottom-3 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        aria-label={`Comprar ${nft.name}`}
        className={cn(
          actionClass,
          'max-md:hidden',
          nft.soldOut && 'pointer-events-none opacity-50',
        )}
        aria-disabled={nft.soldOut || undefined}
      >
        <ShoppingCart className="size-[18px]" aria-hidden />
      </Link>
      <button
        type="button"
        onClick={onFavorite}
        aria-pressed={isFavorite}
        aria-label={
          isFavorite
            ? `Remover ${nft.name} dos favoritos`
            : `Favoritar ${nft.name}`
        }
        className={cn(
          actionClass,
          'max-md:size-8 max-md:rounded-full max-md:bg-ink/70',
        )}
      >
        <Heart
          className={cn(
            'size-[18px]',
            isFavorite && 'fill-brand-accent text-brand-accent',
          )}
          aria-hidden
        />
      </button>
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        aria-label={`Ver detalhes de ${nft.name}`}
        className={cn(actionClass, 'max-md:hidden')}
      >
        <Search className="size-[18px]" aria-hidden />
      </Link>
    </div>
  )
}

export function NftCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="bg-card p-1.5">
        <div className="skeleton aspect-square w-full rounded-[14px]" />
      </div>
      <div className="skeleton mt-5 h-5 w-2/3 rounded-sm" />
      <div className="skeleton mt-1 h-5 w-1/3 rounded-sm" />
    </div>
  )
}
