import { Search, SlidersHorizontal } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

/** Mobile search field + filters drawer (focus is trapped while open). */
export function MobileCatalogBar({
  term,
  onTermChange,
  activeCount,
  total,
  filters,
}: {
  term: string
  onTermChange: (term: string) => void
  activeCount: number
  total: number | undefined
  filters: ReactNode
}) {
  const inputId = useId()
  return (
    <div className="flex gap-3 md:hidden">
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="relative flex-1"
      >
        <label htmlFor={inputId} className="sr-only">
          Buscar NFTs
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-brand-accent"
          aria-hidden
        />
        <input
          id={inputId}
          type="search"
          value={term}
          onChange={(e) => onTermChange(e.target.value)}
          placeholder="Explorar coleções"
          autoComplete="off"
          className="h-[45px] w-full rounded-xl bg-card pr-3 pl-11 text-[15px] font-medium placeholder:text-brand-accent/80"
        />
      </form>
      <FiltersSheet
        total={total}
        filters={filters}
        trigger={
          <button
            type="button"
            className="relative grid size-[45px] place-items-center rounded-xl bg-gradient-to-b from-brand-accent to-brand text-ink"
            aria-label={
              activeCount ? `Filtros, ${activeCount} ativos` : 'Filtros'
            }
          >
            <SlidersHorizontal className="size-5" aria-hidden />
            {activeCount > 0 && (
              <span
                aria-hidden
                className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-ink text-tiny font-bold text-brand-accent"
              >
                {activeCount}
              </span>
            )}
          </button>
        }
      />
    </div>
  )
}

/** Filters drawer, shared by mobile and tablet. */
export function FiltersSheet({
  trigger,
  total,
  filters,
}: {
  trigger: ReactNode
  total: number | undefined
  filters: ReactNode
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-[26px] border-line bg-card md:mx-auto md:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>Filtrar e ordenar</SheetTitle>
          <SheetDescription>
            As mudanças são aplicadas imediatamente.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">{filters}</div>
        <SheetFooter>
          <SheetClose asChild>
            <Button>
              {total === undefined
                ? 'Ver resultados'
                : `Ver ${total} resultado${total === 1 ? '' : 's'}`}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
