import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Mail, ShoppingCart } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import type { NftDetail } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { COLLECTION_LABELS } from '@/components/catalog/search'
import { QuantityStepper } from '@/components/common/quantity-stepper'
import { LinkedinIcon, TwitterIcon } from '@/components/icons/social'
import { DetailTabs, RelatedNfts } from '@/components/nft/detail-sections'
import {
  DetailError,
  DetailSkeleton,
  NftNotFound,
} from '@/components/nft/detail-states'
import { EditionPicker } from '@/components/nft/edition-picker'
import {
  FavoriteButton,
  FavoriteIconButton,
} from '@/components/nft/favorite-button'
import { Gallery, ZoomDialog } from '@/components/nft/gallery'
import { RatingPill, RatingStars } from '@/components/nft/rating'
import { usePurchase } from '@/components/nft/use-purchase'
import { Button } from '@/components/ui/button'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { nftDetailQuery } from '@/queries/catalog'

export const Route = createFileRoute('/nft/$nftId')({
  validateSearch: z.object({ edicao: z.string().optional().catch(undefined) }),
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftDetailQuery(params.nftId))
  },
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const query = useQuery(nftDetailQuery(nftId))

  useEffect(() => {
    if (query.data) document.title = `${query.data.name} · Kurio`
    return () => {
      document.title = 'Kurio · Marketplace de NFTs'
    }
  }, [query.data])

  if (query.isPending) return <DetailSkeleton />
  if (query.isError) {
    const error = toApiError(query.error)
    if (error.code === 'NOT_FOUND') return <NftNotFound />
    return (
      <DetailError
        error={error}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    )
  }
  return <NftDetailView nft={query.data} />
}

/** Edition from the URL when valid, else the first one with stock. */
function resolveEdition(nft: NftDetail, fromUrl: string | undefined) {
  const byUrl = nft.editions.find((e) => e.id === `${nft.id}:${fromUrl}`)
  return (byUrl ?? nft.editions.find((e) => e.available > 0) ?? nft.editions[0])
    .id
}

const editionSlug = (editionId: string) => editionId.split(':')[1]

function NftDetailView({ nft }: { nft: NftDetail }) {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const editionId = resolveEdition(nft, search.edicao)
  const purchase = usePurchase(nft, editionId)
  const priceUpdate = usePriceUpdateMessage(nft)

  const selectEdition = (id: string) =>
    void navigate({
      search: { edicao: editionSlug(id) },
      replace: true,
      resetScroll: false,
    })

  const meta = (
    <dl className="space-y-3 text-[15px] text-brand-accent/90 md:space-y-4">
      <div className="flex gap-1">
        <dt>ID do token:</dt>
        <dd>{nft.tokenId}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Coleção:</dt>
        <dd>
          {nft.seriesName}{' '}
          <span className="sr-only">({COLLECTION_LABELS[nft.collection]})</span>
        </dd>
      </div>
      <div className="flex gap-1">
        <dt>Atributos:</dt>
        <dd>{nft.attributes.join(', ')}</dd>
      </div>
    </dl>
  )

  const blocked = purchase.blockedReason && (
    <p role="status" className="text-sm text-destructive">
      {purchase.blockedReason}
    </p>
  )

  return (
    <>
      {/* ---------- Mobile (Figma "Mobile / Detalhes do NFT") ---------- */}
      <article className="md:hidden" aria-labelledby="nft-title-mobile">
        <div className="relative px-7 pt-6">
          <MobileTopBar nft={nft} />
          <img
            src={nft.imageUrl}
            alt={nft.imageAlt}
            width={360}
            height={360}
            fetchPriority="high"
            className="mt-3 aspect-square w-full rounded-[28px] object-cover"
          />
        </div>
        <div className="relative -mt-14 rounded-t-[32px] bg-card px-6 pt-8 pb-56">
          <div className="flex items-start justify-between gap-3">
            <h1 id="nft-title-mobile" className="text-xl font-bold">
              {nft.name}
            </h1>
            <RatingPill average={nft.rating.average} count={nft.rating.count} />
          </div>
          <p className="mt-4 text-sm leading-6 text-brand-accent/90">
            {nft.description}
          </p>
          <EditionPicker
            editions={nft.editions}
            value={editionId}
            onChange={selectEdition}
            className="mt-4"
          />
          <div className="mt-6">{meta}</div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-[32px] bg-surface-card px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.4)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary" aria-hidden>
                Qtd.
              </span>
              <QuantityStepper
                value={purchase.quantity}
                max={Math.max(purchase.remaining, 1)}
                onChange={purchase.setQuantity}
                label={nft.name}
                disabled={!!purchase.blockedReason}
                size="sm"
              />
            </div>
            <p className="text-xl font-bold text-brand-accent">
              <span className="sr-only">Preço unitário: </span>
              {formatEth(nft.price)}
            </p>
          </div>
          {blocked && <div className="mt-2">{blocked}</div>}
          <div className="mt-4 flex items-center gap-3">
            <Button
              className="h-[60px] flex-1 rounded-[22px] bg-gradient-to-b from-brand-accent to-brand text-base"
              onClick={() => purchase.buy({ goToCart: true })}
              disabled={!!purchase.blockedReason || purchase.pending}
            >
              {purchase.pending ? 'Adicionando…' : 'Comprar NFT'}
            </Button>
            <Button
              variant="ghost"
              className="size-[60px] rounded-full border border-line-soft"
              onClick={() => purchase.buy({ goToCart: false })}
              disabled={!!purchase.blockedReason || purchase.pending}
              aria-label={`Adicionar ${purchase.quantity} ao carrinho sem sair da página`}
            >
              <ShoppingCart className="size-6 text-brand-accent" aria-hidden />
            </Button>
          </div>
        </div>
      </article>

      {/* ---------- Desktop / tablet (Figma "Desktop / Detalhes do NFT") ---------- */}
      <article
        className="page-container pt-6 max-md:hidden"
        aria-labelledby="nft-title"
      >
        <nav aria-label="Trilha de navegação" className="text-[15px] font-bold">
          <ol className="flex gap-2">
            <li>
              <Link to="/" className="hover:text-brand-accent">
                Início
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link to="/" hash="catalogo" className="hover:text-brand-accent">
                Mercado
              </Link>
            </li>
          </ol>
        </nav>

        <div className="mt-2 grid gap-10 lg:grid-cols-[minmax(0,500px)_1fr] lg:gap-8">
          <Gallery nft={nft} />

          <div>
            <h1 id="nft-title" className="text-[28px] font-bold">
              {nft.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
              <p className="text-xl font-bold text-brand-accent">
                <span className="sr-only">Preço: </span>
                {formatEth(nft.price)}
                {nft.compareAtPrice && (
                  <span className="ml-3 text-base font-normal text-brand-secondary line-through">
                    <span className="sr-only">, antes </span>
                    {formatEth(nft.compareAtPrice)}
                  </span>
                )}
              </p>
              <RatingStars
                average={nft.rating.average}
                count={nft.rating.count}
              />
            </div>
            <p
              role="status"
              className={cn(
                'text-xs text-brand-accent',
                !priceUpdate && 'sr-only',
              )}
            >
              {priceUpdate}
            </p>

            <h2 className="mt-5 text-sm font-bold">Sobre este NFT:</h2>
            <p className="mt-3 text-sm leading-[22px] text-brand-accent/90">
              {nft.description}
            </p>

            <EditionPicker
              editions={nft.editions}
              value={editionId}
              onChange={selectEdition}
              className="mt-3"
            />

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <QuantityStepper
                value={purchase.quantity}
                max={Math.max(purchase.remaining, 1)}
                onChange={purchase.setQuantity}
                label={nft.name}
                disabled={!!purchase.blockedReason}
              />
              <div className="flex gap-2">
                <Button
                  className="h-10 w-[130px] uppercase"
                  onClick={() => purchase.buy({ goToCart: true })}
                  disabled={!!purchase.blockedReason || purchase.pending}
                >
                  {purchase.pending ? 'Adicionando…' : 'Comprar'}
                </Button>
                <FavoriteButton nft={nft} className="h-10" />
              </div>
            </div>
            <div className="mt-2 min-h-5 text-xs text-text-secondary">
              {blocked ||
                (purchase.inCart > 0
                  ? `Você já tem ${purchase.inCart} desta edição no carrinho. Pode adicionar mais ${purchase.remaining}.`
                  : `Máximo de ${purchase.limit} por pedido nesta edição.`)}
            </div>

            <div className="mt-4">{meta}</div>
            <ShareLinks nft={nft} />
          </div>
        </div>
      </article>

      <DetailTabs nft={nft} />
      <RelatedNfts nft={nft} />
    </>
  )
}

function MobileTopBar({ nft }: { nft: NftDetail }) {
  const router = useRouter()
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() =>
          router.history.canGoBack()
            ? router.history.back()
            : void router.navigate({ to: '/' })
        }
        aria-label="Voltar"
        className="grid size-9 place-items-center rounded-full border border-line-soft bg-ink/70"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <div className="flex gap-2">
        <div className="relative size-9">
          <ZoomDialog
            url={nft.imageUrl}
            alt={nft.imageAlt}
            name={nft.name}
            className="static border border-line-soft"
          />
        </div>
        <FavoriteIconButton nft={nft} />
      </div>
    </div>
  )
}

function ShareLinks({ nft }: { nft: NftDetail }) {
  const url = typeof window !== 'undefined' ? window.location.href : ''
  const text = `${nft.name} na Kurio`
  const links = [
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      icon: <LinkedinIcon />,
    },
    {
      label: 'e-mail',
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
      icon: <Mail className="size-4" aria-hidden />,
    },
    {
      label: 'Twitter',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      icon: <TwitterIcon />,
    },
  ]
  return (
    <div className="mt-4 flex items-center gap-3 text-[15px] font-bold">
      <span id="share-label">Compartilhar este NFT:</span>
      <ul aria-labelledby="share-label" className="flex gap-2">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target={link.href.startsWith('mailto') ? undefined : '_blank'}
              rel="noopener noreferrer"
              aria-label={`Compartilhar por ${link.label}${link.href.startsWith('mailto') ? '' : ' (abre em nova aba)'}`}
              className="grid size-7 place-items-center rounded-sm hover:text-brand-accent"
            >
              {link.icon}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Visible + announced when the price changes while the page is open. */
function usePriceUpdateMessage(nft: NftDetail) {
  const previous = useRef(nft.price)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (previous.current !== nft.price) {
      setMessage(
        `Preço atualizado agora: de ${formatEth(previous.current)} para ${formatEth(nft.price)}.`,
      )
      previous.current = nft.price
    }
  }, [nft.price])
  return message
}
