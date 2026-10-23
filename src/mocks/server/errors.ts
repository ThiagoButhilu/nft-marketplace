import type { ApiErrorCode } from '@/api/contracts'

/** Thrown by mock services; turned into the shared error envelope by the handlers. */
export class MockApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fieldErrors?: Record<string, string[]>
  readonly details?: unknown

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
    details?: unknown,
  ) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.details = details
  }
}

export const notFound = (what: string) =>
  new MockApiError(404, 'NOT_FOUND', `${what} não encontrado`)
