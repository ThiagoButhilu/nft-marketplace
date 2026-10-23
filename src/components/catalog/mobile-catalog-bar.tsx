import { Search, SlidersHorizontal } from 'lucide-react'
import {
  Suspense,
  cloneElement,
  lazy,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react'

const FiltersSheetContent = lazy(() =>
  import('./filters-sheet').then((m) => ({ default: m.FiltersSheetContent })),
)

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

/**
 * Filters drawer, shared by mobile and tablet. The trigger renders
 * immediately; the drawer (Radix focus trap, scroll lock...) is loaded on
 * first intent, off the critical path.
 */
export function FiltersSheet({
  trigger,
  total,
  filters,
}: {
  trigger: ReactElement<ComponentProps<'button'>>
  total: number | undefined
  filters: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [requested, setRequested] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      {cloneElement(trigger, {
        ref: triggerRef,
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
        onClick: () => {
          setRequested(true)
          setOpen(true)
        },
        onPointerEnter: () => setRequested(true),
        onFocus: () => setRequested(true),
      })}
      {requested && (
        <Suspense fallback={null}>
          <FiltersSheetContent
            open={open}
            onOpenChange={setOpen}
            returnFocusTo={triggerRef}
            total={total}
            filters={filters}
          />
        </Suspense>
      )}
    </>
  )
}
