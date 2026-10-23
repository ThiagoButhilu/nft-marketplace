import { AlertTriangle, SearchX } from 'lucide-react'
import type { ApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { NftCardSkeleton } from './nft-card'

export function CatalogGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-14">
      {Array.from({ length: count }, (_, i) => (
        <NftCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function CatalogEmpty({ onClear }: { onClear?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-line-soft px-6 py-16 text-center">
      <SearchX className="size-10 text-brand-accent" aria-hidden />
      <h3 className="text-lg font-bold">Nenhum NFT encontrado</h3>
      <p className="max-w-sm text-sm leading-6 text-text-secondary">
        Tente outros termos ou remova alguns filtros para ver mais resultados.
      </p>
      {onClear && (
        <Button variant="outline" onClick={onClear}>
          Limpar filtros
        </Button>
      )}
    </div>
  )
}

export function CatalogError({
  error,
  onRetry,
  retrying,
}: {
  error: ApiError
  onRetry: () => void
  retrying?: boolean
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-sm border border-destructive/50 px-6 py-16 text-center"
    >
      <AlertTriangle className="size-10 text-destructive" aria-hidden />
      <h3 className="text-lg font-bold">
        Não foi possível carregar o catálogo
      </h3>
      <p className="max-w-sm text-sm leading-6 text-text-secondary">
        {error.message}
      </p>
      <Button onClick={onRetry} disabled={retrying}>
        {retrying ? 'Tentando…' : 'Tentar novamente'}
      </Button>
    </div>
  )
}
