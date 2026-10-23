import { isAxiosError } from 'axios'
import { ApiErrorBody, type ApiErrorCode } from './contracts'

/** Codes produced on the client when there is no usable server response. */
export type ClientErrorCode =
  'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'CANCELED'

export type ErrorCode = ApiErrorCode | ClientErrorCode

const RETRYABLE: ReadonlySet<ErrorCode> = new Set([
  'NETWORK_ERROR',
  'TIMEOUT',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
])

/** Normalised error for every request made through the API client. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly fieldErrors: Record<string, string[]>
  readonly details: unknown

  constructor(init: {
    status: number
    code: ErrorCode
    message: string
    fieldErrors?: Record<string, string[]>
    details?: unknown
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.fieldErrors = init.fieldErrors ?? {}
    this.details = init.details
  }

  /** Transient failures that are safe to retry (idempotent requests only). */
  get retryable() {
    return RETRYABLE.has(this.code)
  }

  get isAuthError() {
    return this.code === 'UNAUTHENTICATED' || this.code === 'SESSION_EXPIRED'
  }
}

const FALLBACK_MESSAGES: Record<ClientErrorCode, string> = {
  NETWORK_ERROR:
    'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
  TIMEOUT: 'O servidor demorou a responder. Tente novamente.',
  INVALID_RESPONSE: 'Recebemos uma resposta inesperada do servidor.',
  CANCELED: 'Requisição cancelada.',
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') {
      return new ApiError({
        status: 0,
        code: 'CANCELED',
        message: FALLBACK_MESSAGES.CANCELED,
      })
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({
        status: 0,
        code: 'TIMEOUT',
        message: FALLBACK_MESSAGES.TIMEOUT,
      })
    }
    if (!error.response) {
      return new ApiError({
        status: 0,
        code: 'NETWORK_ERROR',
        message: FALLBACK_MESSAGES.NETWORK_ERROR,
      })
    }
    const parsed = ApiErrorBody.safeParse(error.response.data)
    if (parsed.success) {
      return new ApiError({
        status: error.response.status,
        ...parsed.data.error,
      })
    }
    return new ApiError({
      status: error.response.status,
      code:
        error.response.status >= 500 ? 'INTERNAL_ERROR' : 'INVALID_RESPONSE',
      message: FALLBACK_MESSAGES.INVALID_RESPONSE,
    })
  }
  return new ApiError({
    status: 0,
    code: 'INVALID_RESPONSE',
    message:
      error instanceof Error
        ? error.message
        : FALLBACK_MESSAGES.INVALID_RESPONSE,
  })
}
