import { Link } from '@tanstack/react-router'
import { AlertTriangle, SearchX } from 'lucide-react'
import type { ApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'

/** Same footprint as the loaded page (gallery + info column). */
export function DetailSkeleton() {
  return (
    <div aria-hidden className="page-container pt-6 md:pt-8">
      <div className="skeleton h-5 w-40 rounded-sm max-md:hidden" />
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,500px)_1fr] lg:gap-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[90px_minmax(0,1fr)]">
          <div className="hidden flex-col gap-4 md:flex">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="skeleton aspect-square w-full rounded-sm"
              />
            ))}
          </div>
          <div className="bg-card p-5">
            <div className="skeleton aspect-square w-full rounded-[18px]" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="skeleton h-9 w-2/3 rounded-sm" />
          <div className="skeleton h-7 w-1/4 rounded-sm" />
          <div className="skeleton h-24 w-full rounded-sm" />
          <div className="skeleton h-8 w-1/2 rounded-sm" />
          <div className="skeleton h-10 w-full rounded-sm" />
        </div>
      </div>
    </div>
  )
}

export function NftNotFound() {
  return (
    <section className="page-container flex flex-col items-center gap-4 py-24 text-center">
      <SearchX className="size-12 text-brand-accent" aria-hidden />
      <h1 className="text-heading font-bold">NFT não encontrado</h1>
      <p className="max-w-md text-sm leading-6 text-text-secondary">
        Este NFT não existe ou foi removido do mercado. Confira o endereço ou
        continue explorando o catálogo.
      </p>
      <Button asChild>
        <Link to="/" hash="catalogo">
          Explorar o catálogo
        </Link>
      </Button>
    </section>
  )
}

export function DetailError({
  error,
  onRetry,
  retrying,
}: {
  error: ApiError
  onRetry: () => void
  retrying: boolean
}) {
  return (
    <section
      role="alert"
      className="page-container flex flex-col items-center gap-4 py-24 text-center"
    >
      <AlertTriangle className="size-12 text-destructive" aria-hidden />
      <h1 className="text-heading font-bold">
        Não foi possível carregar este NFT
      </h1>
      <p className="max-w-md text-sm leading-6 text-text-secondary">
        {error.message}
      </p>
      <Button onClick={onRetry} disabled={retrying}>
        {retrying ? 'Tentando…' : 'Tentar novamente'}
      </Button>
    </section>
  )
}
