import { ChevronDown } from 'lucide-react'
import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  required?: boolean
  error?: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

/** Native select styled like the Figma inputs (keyboard and screen-reader friendly). */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField(
    { label, required, error, options, placeholder, className, id, ...props },
    ref,
  ) {
    const autoId = useId()
    const selectId = id ?? autoId
    return (
      <div className={className}>
        <label htmlFor={selectId} className="mb-2 block text-[15px]">
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-destructive">
              *
            </span>
          )}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${selectId}-error` : undefined}
            aria-required={required || undefined}
            className="h-10 w-full appearance-none rounded-sm border border-line bg-ink px-3 pr-10 text-sm aria-invalid:border-destructive"
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary"
          />
        </div>
        {error && (
          <p
            id={`${selectId}-error`}
            className={cn('mt-1 text-xs text-destructive')}
          >
            {error}
          </p>
        )}
      </div>
    )
  },
)
