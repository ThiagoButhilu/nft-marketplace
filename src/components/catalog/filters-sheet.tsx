import type { ReactNode, RefObject } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

/** Filters drawer (lazy-loaded by FiltersSheet). Focus is trapped while open. */
export function FiltersSheetContent({
  open,
  onOpenChange,
  returnFocusTo,
  total,
  filters,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusTo: RefObject<HTMLButtonElement | null>
  total: number | undefined
  filters: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-[26px] border-line bg-card md:mx-auto md:max-w-xl"
        // The trigger lives outside this lazily loaded tree: return focus to it.
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusTo.current?.focus()
        }}
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
