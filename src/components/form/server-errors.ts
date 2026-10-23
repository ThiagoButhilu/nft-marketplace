import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ApiError } from '@/api/errors'

/**
 * Maps `fieldErrors` from the API onto the form fields it knows about.
 * Returns the message that should be shown at form level (or null when every
 * error landed on a field).
 */
export function applyServerErrors<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  fields: ReadonlyArray<Path<T>>,
): string | null {
  let mapped = false
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if ((fields as ReadonlyArray<string>).includes(field) && messages[0]) {
      setError(
        field as Path<T>,
        { type: 'server', message: messages[0] },
        { shouldFocus: !mapped },
      )
      mapped = true
    }
  }
  return mapped ? null : error.message
}
