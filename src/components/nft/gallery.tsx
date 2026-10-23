import { ZoomIn } from 'lucide-react'
import { useState } from 'react'
import type { NftDetail } from '@/api/contracts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/** Desktop gallery: vertical thumbnails + main image with zoom dialog. */
export function Gallery({ nft }: { nft: NftDetail }) {
  const [current, setCurrent] = useState(0)
  const image = nft.gallery[current] ?? { url: nft.imageUrl, alt: nft.imageAlt }

  return (
    <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-6 lg:gap-7">
      <ul aria-label="Imagens do NFT" className="flex flex-col gap-4">
        {nft.gallery.map((item, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => setCurrent(index)}
              aria-label={`Mostrar imagem ${index + 1} de ${nft.gallery.length}`}
              aria-pressed={index === current}
              className={cn(
                'block overflow-hidden rounded-sm border-2 transition-colors',
                index === current
                  ? 'border-brand-accent'
                  : 'border-transparent hover:border-line-soft',
              )}
            >
              <img
                src={item.url}
                alt=""
                width={90}
                height={90}
                className="aspect-square w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative self-start bg-card p-5">
        <img
          src={image.url}
          alt={image.alt}
          width={400}
          height={400}
          fetchPriority="high"
          className="aspect-square w-full rounded-[18px] object-cover"
        />
        <ZoomDialog url={image.url} alt={image.alt} name={nft.name} />
      </div>
    </div>
  )
}

export function ZoomDialog({
  url,
  alt,
  name,
  className,
}: {
  url: string
  alt: string
  name: string
  className?: string
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Ampliar imagem de ${name}`}
          className={cn(
            'absolute top-6 right-6 grid size-9 place-items-center rounded-full bg-ink/85 text-text-primary hover:text-brand-accent',
            className,
          )}
        >
          <ZoomIn className="size-5" aria-hidden />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[min(90vw,720px)] border-line bg-card p-4 sm:max-w-[min(90vw,720px)]">
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <DialogDescription className="sr-only">{alt}</DialogDescription>
        <img
          src={url}
          alt={alt}
          className="aspect-square w-full rounded-[18px] object-cover"
        />
      </DialogContent>
    </Dialog>
  )
}
