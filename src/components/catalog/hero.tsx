import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import type { NftSummary } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { featuredQuery } from '@/queries/catalog'
import { useSwipe } from '@/hooks/use-swipe'
import { IMAGE_SIZES, responsiveImage } from '@/lib/images'

/** Current slide, changed by the dots or by a touch swipe (wrapping around). */
function useSlides(count: number) {
  const [current, setCurrent] = useState(0)
  const swipe = useSwipe((direction) => {
    if (count > 1) setCurrent((index) => (index + direction + count) % count)
  })
  return { current, setCurrent, swipe }
}

/** Slide selector. Manual only (no autoplay), so nothing moves unexpectedly. */
function Dots({
  items,
  current,
  onSelect,
  className,
}: {
  items: NftSummary[]
  current: number
  onSelect: (index: number) => void
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="Destaques"
      className={cn('flex gap-1.5', className)}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={`Mostrar destaque ${index + 1} de ${items.length}: ${item.name}`}
          aria-pressed={index === current}
          className="grid size-6 place-items-center rounded-full"
        >
          <span
            className={cn(
              'block size-2 rounded-full transition-colors',
              index === current ? 'bg-brand-accent' : 'bg-brand-accent/40',
            )}
          />
        </button>
      ))}
    </div>
  )
}

export function DesktopHero() {
  const { data } = useQuery(featuredQuery())
  const { current, setCurrent, swipe } = useSlides(data?.hero.length ?? 0)
  const slide = data?.hero[current]

  return (
    <section
      aria-labelledby="hero-title"
      className="page-container hidden md:block"
    >
      <div className="grid grid-cols-[1fr_minmax(0,450px)] items-center gap-10 pt-12 lg:pt-[42px]">
        <div className="relative pl-0 lg:pl-12">
          <p className="text-sm">Bem-vindo à Kurio</p>
          <h1
            id="hero-title"
            className="mt-4 text-[34px] leading-[1.6] font-bold uppercase lg:text-display"
          >
            Seja dono do futuro
            <br />
            da arte digital
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-brand-accent/90">
            Descubra NFTs selecionados de criadores emergentes e consagrados.
            Colecione arte digital rara, apoie artistas e tenha uma parte da
            cultura da internet.
          </p>
          <Button
            asChild
            className="mt-10 h-10 w-[140px] text-[15px] font-medium uppercase"
          >
            <a href="#catalogo">Explorar</a>
          </Button>
          {/* Same height reserved while loading: no layout shift when dots arrive. */}
          {data ? (
            <Dots
              items={data.hero}
              current={current}
              onSelect={setCurrent}
              className="mt-10 justify-center"
            />
          ) : (
            <div aria-hidden className="mt-10 h-6" />
          )}
        </div>

        <div {...swipe} className="relative aspect-square w-full touch-pan-y">
          {slide ? (
            <Link
              to="/nft/$nftId"
              params={{ nftId: slide.id }}
              className="group block size-full overflow-hidden rounded-[18px]"
            >
              <img
                src={slide.imageUrl}
                alt={slide.imageAlt}
                width={450}
                height={450}
                fetchPriority="high"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <span className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-sm bg-ink/80 px-3 py-2 text-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <span>{slide.name}</span>
                <span className="font-bold text-brand-accent">
                  {formatEth(slide.price)}
                </span>
              </span>
            </Link>
          ) : (
            <div className="skeleton size-full rounded-[18px]" aria-hidden />
          )}
        </div>
      </div>
    </section>
  )
}

export function MobileHero() {
  const { data } = useQuery(featuredQuery())
  const { current, setCurrent, swipe } = useSlides(data?.hero.length ?? 0)
  const slide = data?.hero[current]
  const secondary = data?.hero[(current + 1) % (data?.hero.length || 1)]

  return (
    <section
      {...swipe}
      aria-labelledby="mobile-hero-title"
      className="relative touch-pan-y overflow-hidden rounded-[26px] bg-gradient-to-br from-surface-card via-surface-dark/80 to-surface-card p-4 md:hidden"
    >
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <p className="text-sm font-medium">Bem-vindo à Kurio</p>
          <h1
            id="mobile-hero-title"
            className="mt-2 text-lg leading-8 font-bold uppercase"
          >
            Seja dono da cultura digital
          </h1>
          <p className="mt-1 text-[13px] leading-[22px] text-brand-accent/90">
            Descubra NFTs selecionados de criadores do mundo todo.
          </p>
          <a
            href="#catalogo"
            className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-brand-accent uppercase"
          >
            Explorar <ArrowRight className="size-4" aria-hidden />
          </a>
        </div>
        <div className="relative w-[138px] self-start">
          {slide ? (
            <Link
              to="/nft/$nftId"
              params={{ nftId: slide.id }}
              aria-label={`Ver ${slide.name}`}
            >
              <img
                {...responsiveImage(slide.imageUrl, IMAGE_SIZES.mobileHero)}
                alt={slide.imageAlt}
                width={138}
                height={138}
                fetchPriority="high"
                className="aspect-square w-full rounded-[18px] object-cover"
              />
            </Link>
          ) : (
            <div
              className="skeleton aspect-square w-full rounded-[18px]"
              aria-hidden
            />
          )}
          {secondary && secondary.id !== slide?.id && (
            <img
              {...responsiveImage(secondary.imageUrl, IMAGE_SIZES.list)}
              alt=""
              width={60}
              height={60}
              className="absolute -bottom-3 -left-3 size-[60px] rounded-[14px] border-2 border-surface-card object-cover"
            />
          )}
        </div>
      </div>
      {data ? (
        <Dots
          items={data.hero}
          current={current}
          onSelect={setCurrent}
          className="mt-1 justify-center"
        />
      ) : (
        <div aria-hidden className="mt-1 h-6" />
      )}
    </section>
  )
}

export function SpotlightCard() {
  const { data } = useQuery(featuredQuery())
  const nft = data?.spotlight
  return (
    <section aria-labelledby="spotlight-title" className="bg-card px-2.5 pt-4">
      <h2
        id="spotlight-title"
        className="text-lg font-bold text-brand-accent uppercase"
      >
        NFT em destaque
      </h2>
      <p className="mt-2 text-center font-bold uppercase">Oferta limitada</p>
      {nft ? (
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          className="group mt-2 block overflow-hidden rounded-[14px]"
        >
          <img
            src={nft.imageUrl}
            alt={`${nft.name}, em destaque por ${formatEth(nft.price)}`}
            width={310}
            height={310}
            loading="lazy"
            className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        </Link>
      ) : (
        <div
          className="skeleton mt-2 aspect-square w-full rounded-[14px]"
          aria-hidden
        />
      )}
    </section>
  )
}
