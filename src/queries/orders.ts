import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  TERMINAL_ORDER_STATUSES,
  type CreateOrderRequest,
  type Order,
} from '@/api/contracts'
import { ordersApi } from '@/api/endpoints'
import type { ApiError } from '@/api/errors'
import { realtimeStatus, useRealtimeStatus } from '@/realtime/status'
import { cartOwner, queryKeys } from './keys'
import { useSession } from './session'

/**
 * Checkout attempt: the idempotency key of the order being placed, stored per
 * user so that repeated clicks, timeouts and refreshes all reuse the same key
 * (and therefore recover the same order instead of creating another one).
 */
interface CheckoutAttempt {
  key: string
  fingerprint: string
  orderId: string | null
  createdAt: number
}

const attemptKey = (userId: string) => `kurio.checkout-attempt:${userId}`

export const checkoutAttempts = {
  load(userId: string): CheckoutAttempt | null {
    try {
      const raw = localStorage.getItem(attemptKey(userId))
      return raw ? (JSON.parse(raw) as CheckoutAttempt) : null
    } catch {
      return null
    }
  },
  save(userId: string, attempt: CheckoutAttempt) {
    try {
      localStorage.setItem(attemptKey(userId), JSON.stringify(attempt))
    } catch {
      /* storage unavailable: the in-flight mutation still reuses the key */
    }
  },
  clear(userId: string) {
    try {
      localStorage.removeItem(attemptKey(userId))
    } catch {
      /* ignore */
    }
  },
}

const fingerprintOf = (input: CreateOrderRequest) =>
  JSON.stringify(input, Object.keys(input).sort())

/** Failures after which the same attempt (same key) must be retried. */
const isAmbiguousFailure = (error: ApiError) =>
  error.code === 'TIMEOUT' ||
  error.code === 'NETWORK_ERROR' ||
  error.status >= 500

export const isTerminal = (order: Pick<Order, 'status'>) =>
  TERMINAL_ORDER_STATUSES.includes(order.status)

/** Resyncs everything an order affects once it reaches a terminal state. */
export function onOrderSettled(
  queryClient: QueryClient,
  userId: string,
  orderId: string,
) {
  const attempt = checkoutAttempts.load(userId)
  if (attempt?.orderId === orderId) checkoutAttempts.clear(userId)
  void queryClient.invalidateQueries({
    queryKey: queryKeys.user.ordersAll(userId),
  })
  // Confirmed orders remove the purchased items from the cart.
  void queryClient.invalidateQueries({
    queryKey: queryKeys.cart.owner(cartOwner(userId, '')),
  })
}

export const CREATE_ORDER_KEY = ['create-order'] as const

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const userId = useSession()?.user.id

  return useMutation<Order, ApiError, CreateOrderRequest>({
    mutationKey: CREATE_ORDER_KEY,
    scope: { id: 'checkout' },
    mutationFn: (input) => {
      if (!userId) throw new Error('Not authenticated')
      const fingerprint = fingerprintOf(input)
      let attempt = checkoutAttempts.load(userId)
      if (!attempt || attempt.fingerprint !== fingerprint) {
        attempt = {
          key: crypto.randomUUID(),
          fingerprint,
          orderId: null,
          createdAt: Date.now(),
        }
        checkoutAttempts.save(userId, attempt)
      }
      return ordersApi.create(input, attempt.key)
    },
    onSuccess: (order) => {
      if (!userId) return
      const attempt = checkoutAttempts.load(userId)
      if (attempt)
        checkoutAttempts.save(userId, { ...attempt, orderId: order.id })
      queryClient.setQueryData(queryKeys.user.order(userId, order.id), order)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.user.ordersAll(userId),
      })
      if (isTerminal(order)) onOrderSettled(queryClient, userId, order.id)
    },
    onError: (error) => {
      // A definitive rejection (e.g. outdated quote) ends the attempt; an
      // ambiguous one keeps the key so the retry recovers the same order.
      if (userId && !isAmbiguousFailure(error)) checkoutAttempts.clear(userId)
    },
  })
}

/** Pending orders of the current user (recovery after refresh/reconnect). */
export function usePendingOrders() {
  const userId = useSession()?.user.id
  return useQuery({
    queryKey: queryKeys.user.orders(userId ?? 'anonymous', 'pending'),
    queryFn: ({ signal }) => ordersApi.list('pending', { signal }),
    enabled: !!userId,
    staleTime: 0,
  })
}

const POLL_WHEN_SOCKET_DOWN_MS = 3_000
const SAFETY_POLL_MS = 15_000

/**
 * Order status. Socket events drive it; while the order is pending the query
 * also polls — fast when the socket is down, slowly otherwise as a safety net.
 */
export function useOrder(orderId: string) {
  const queryClient = useQueryClient()
  const userId = useSession()?.user.id
  useRealtimeStatus() // re-evaluate the polling interval when the socket changes

  const query = useQuery({
    queryKey: queryKeys.user.order(userId ?? 'anonymous', orderId),
    queryFn: ({ signal }) => ordersApi.get(orderId, { signal }),
    enabled: !!userId,
    staleTime: 0,
    refetchInterval: (q) =>
      q.state.data && !isTerminal(q.state.data)
        ? realtimeStatus.get() === 'connected'
          ? SAFETY_POLL_MS
          : POLL_WHEN_SOCKET_DOWN_MS
        : false,
  })

  const order = query.data
  useEffect(() => {
    if (order && userId && isTerminal(order))
      onOrderSettled(queryClient, userId, order.id)
  }, [order, userId, queryClient])

  return query
}

/**
 * Finds the order created by an unfinished checkout attempt (its response
 * may never have arrived: timeout, dropped connection, refresh). The server
 * stores the idempotency key on the order, so the attempt key identifies it.
 */
export function useCheckoutRecovery() {
  const userId = useSession()?.user.id
  const attempt = userId ? checkoutAttempts.load(userId) : null
  const query = useQuery({
    queryKey: queryKeys.user.orders(userId ?? 'anonymous'),
    queryFn: ({ signal }) => ordersApi.list(undefined, { signal }),
    enabled: !!attempt,
    staleTime: 0,
  })
  const recovered = attempt
    ? query.data?.items.find((order) => order.idempotencyKey === attempt.key)
    : undefined
  return {
    attempt,
    recovered,
    checking: query.isFetching,
    check: query.refetch,
  }
}
