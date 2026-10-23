import { useNavigate } from '@tanstack/react-router'
import { useId, useState, type FormEvent, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

/** Header search dialog (lazy-loaded by SiteHeader). Writes `q` to the URL. */
export function SearchDialogContent({
  open,
  onOpenChange,
  returnFocusTo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusTo: RefObject<HTMLButtonElement | null>
}) {
  const [term, setTerm] = useState('')
  const navigate = useNavigate()
  const inputId = useId()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onOpenChange(false)
    void navigate({
      to: '/',
      search: { q: term.trim() || undefined },
      hash: 'catalogo',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-line bg-card sm:max-w-lg"
        // The trigger lives outside this lazily loaded tree: return focus to it.
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusTo.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>Buscar NFTs</DialogTitle>
          <DialogDescription>
            Procure por nome, token, coleção ou rede.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} role="search" className="flex gap-2">
          <label htmlFor={inputId} className="sr-only">
            Termo de busca
          </label>
          <Input
            id={inputId}
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Ex.: Emerald Ape"
            autoComplete="off"
          />
          <Button type="submit">Buscar</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
