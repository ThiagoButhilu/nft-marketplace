import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** "Nome ENS" from the Figma: `.eth` suffix box + name input. */
export const EnsField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { error?: string; required?: boolean }
>(function EnsField({ error, required, className, ...props }, ref) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-[15px]">
        Nome ENS
        {required && (
          <span aria-hidden className="ml-0.5 text-destructive">
            *
          </span>
        )}
      </label>
      <div className="flex gap-2.5">
        <span
          aria-hidden
          className="grid h-10 w-[78px] shrink-0 place-items-center rounded-sm border border-line text-sm"
        >
          .eth
        </span>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          autoComplete="off"
          className={cn(
            'h-10 min-w-0 flex-1 rounded-sm border border-line bg-transparent px-3 text-sm aria-invalid:border-destructive',
          )}
          {...props}
        />
      </div>
      <p id={`${id}-hint`} className="sr-only">
        O sufixo .eth é adicionado automaticamente.
      </p>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
})
