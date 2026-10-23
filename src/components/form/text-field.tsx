import { Eye, EyeOff } from 'lucide-react'
import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Figma auth screens show placeholders only: keep the label for assistive tech. */
  hideLabel?: boolean
  required?: boolean
  error?: string
  hint?: string
  trailing?: ReactNode
  /** Visual size: auth screens use 48px fields on mobile. */
  inputClassName?: string
}

/**
 * Label + input + error, wired for assistive tech: the error is linked with
 * aria-describedby and the field is flagged with aria-invalid.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      label,
      hideLabel = false,
      required,
      error,
      hint,
      trailing,
      className,
      inputClassName,
      id,
      ...props
    },
    ref,
  ) {
    const autoId = useId()
    const inputId = id ?? autoId
    const describedBy = [error && `${inputId}-error`, hint && `${inputId}-hint`]
      .filter(Boolean)
      .join(' ')
    return (
      <div className={className}>
        <label
          htmlFor={inputId}
          className={cn('mb-2 block text-[15px]', hideLabel && 'sr-only')}
        >
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-destructive">
              *
            </span>
          )}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            aria-required={required || undefined}
            className={cn(
              'h-10 w-full rounded-sm border border-line bg-transparent px-4 text-sm placeholder:text-brand-secondary aria-invalid:border-destructive',
              trailing && 'pr-12',
              inputClassName,
            )}
            {...props}
          />
          {trailing && (
            <div className="absolute inset-y-0 right-2 flex items-center">
              {trailing}
            </div>
          )}
        </div>
        {hint && !error && (
          <p
            id={`${inputId}-hint`}
            className="mt-1 text-xs text-text-secondary"
          >
            {hint}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  },
)

/** Password field with a show/hide toggle (the Figma "eye" icon). */
export const PasswordField = forwardRef<
  HTMLInputElement,
  Omit<TextFieldProps, 'type' | 'trailing'>
>(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      ref={ref}
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={
            visible
              ? `Ocultar ${props.label.toLowerCase()}`
              : `Mostrar ${props.label.toLowerCase()}`
          }
          aria-pressed={visible}
          className="grid size-8 place-items-center rounded-sm text-brand-secondary hover:text-brand-accent"
        >
          {visible ? (
            <Eye className="size-5" aria-hidden />
          ) : (
            <EyeOff className="size-5" aria-hidden />
          )}
        </button>
      }
    />
  )
})
