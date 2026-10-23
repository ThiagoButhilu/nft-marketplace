import axios, { type AxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { sessionStore } from '@/lib/session-store'
import { CART_ID_HEADER } from './contracts'
import { ApiError, toApiError } from './errors'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Token the request was sent with (null for visitors). */
    sentWithToken?: string | null
  }
}

export const API_TIMEOUT_MS = 10_000

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = sessionStore.getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  else config.headers.set(CART_ID_HEADER, sessionStore.getCartId())
  config.sentWithToken = token
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error)
    // Only end the session the request was sent with: a late 401 from a
    // previous session must not log out the current user.
    const sentWith = axios.isAxiosError(error)
      ? error.config?.sentWithToken
      : null
    if (
      apiError.isAuthError &&
      sentWith &&
      sentWith === sessionStore.getToken()
    ) {
      sessionStore.end(
        apiError.code === 'SESSION_EXPIRED' ? 'expired' : 'invalid',
      )
    }
    return Promise.reject(apiError)
  },
)

/**
 * Typed request helper: every response is validated against its contract,
 * so a drifting backend surfaces as an explicit error instead of bad UI.
 */
export async function request<T extends z.ZodType>(
  schema: T,
  config: AxiosRequestConfig,
): Promise<z.infer<T>> {
  const response = await http.request(config)
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) {
    console.error('[api] contract mismatch', config.url, parsed.error.issues)
    throw new ApiError({
      status: response.status,
      code: 'INVALID_RESPONSE',
      message: 'Recebemos uma resposta inesperada do servidor.',
    })
  }
  return parsed.data
}

/** For endpoints that answer 204. */
export async function requestVoid(config: AxiosRequestConfig) {
  await http.request(config)
}
