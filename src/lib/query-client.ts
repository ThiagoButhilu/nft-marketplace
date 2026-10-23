import { QueryClient } from '@tanstack/react-query'
import { toApiError } from '@/api/errors'

const MAX_RETRIES = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      // Only transient failures (network, timeout, 5xx) are retried; 4xx
      // answers are final and shown right away.
      retry: (failureCount, error) =>
        toApiError(error).retryable && failureCount < MAX_RETRIES,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      // Mutations are never retried automatically: duplicating a side effect
      // is worse than surfacing the error. Orders retry manually with the
      // same idempotency key.
      retry: 0,
    },
  },
})
