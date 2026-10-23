import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateCatalogSearch, type CatalogSearch } from './search'

const itemClass = (active: boolean) =>
  cn(
    'grid size-8 place-items-center rounded-sm border text-sm transition-colors',
    active
      ? 'border-primary bg-primary font-bold text-ink'
      : 'border-line-soft text-foreground hover:border-brand hover:text-brand-accent',
  )

/** Page links keep the rest of the URL state and jump back to the grid. */
export function CatalogPagination({
  search,
  page,
  totalPages,
}: {
  search: CatalogSearch
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  const go = (target: number) => updateCatalogSearch(search, { page: target })

  return (
    <nav aria-label="Paginação do catálogo" className="mt-12 flex justify-end">
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li>
            <Link
              to="/"
              search={go(page - 1)}
              hash="catalogo"
              aria-label="Página anterior"
              className={itemClass(false)}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          </li>
        )}
        {pages.map((p) => (
          <li key={p}>
            <Link
              to="/"
              search={go(p)}
              hash="catalogo"
              aria-label={`Página ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={itemClass(p === page)}
            >
              {p}
            </Link>
          </li>
        ))}
        {page < totalPages && (
          <li>
            <Link
              to="/"
              search={go(page + 1)}
              hash="catalogo"
              aria-label="Próxima página"
              className={itemClass(false)}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
