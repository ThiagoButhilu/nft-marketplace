import type { QueryClient } from '@tanstack/react-query'
import { checkoutDrafts } from '@/components/checkout/draft'
import { queryKeys } from '@/queries/keys'
import { notices } from './notices'
import { sessionStore } from './session-store'

/**
 * When a session ends (logout, expiry, invalid token, user switch in another
 * tab) every private cache entry of that user is cancelled and dropped, so
 * nothing leaks into the next session. The realtime client follows the same
 * store and closes the old socket on its own.
 */
export function installSessionLifecycle(queryClient: QueryClient) {
  const stopExpiryTimer = scheduleExpiry()
  const stopCleanup = sessionStore.onEnd((reason, previous) => {
    const userId = previous.user.id
    const privateKeys = [
      queryKeys.user.all(userId),
      queryKeys.cart.owner(`user:${userId}`),
      queryKeys.session(previous.token),
    ]
    for (const queryKey of privateKeys) {
      void queryClient.cancelQueries({ queryKey })
      queryClient.removeQueries({ queryKey })
    }
    // The checkout draft survives an expiry (so the user can resume after
    // logging in again) but never a logout or a switch to another account.
    if (reason !== 'expired') checkoutDrafts.clear(userId)
    if (reason === 'expired') {
      notices.push({
        tone: 'warning',
        title: 'Sua sessão expirou',
        description: 'Entre novamente para continuar de onde parou.',
      })
    }
  })
  return () => {
    stopExpiryTimer()
    stopCleanup()
  }
}

/** Longest delay setTimeout supports (~24.8 days). */
const MAX_TIMEOUT = 2 ** 31 - 1

/**
 * Ends the session when it reaches `expiresAt`, so an idle tab notices the
 * expiry without waiting for the next request to fail with 401.
 */
function scheduleExpiry() {
  let timer: ReturnType<typeof setTimeout> | undefined
  const arm = () => {
    clearTimeout(timer)
    const session = sessionStore.getSession()
    if (!session) return
    const delay = Date.parse(session.expiresAt) - Date.now()
    timer = setTimeout(
      () => {
        if (sessionStore.getToken() === session.token)
          sessionStore.end('expired')
      },
      Math.min(Math.max(delay, 0), MAX_TIMEOUT),
    )
  }
  arm()
  const unsubscribe = sessionStore.subscribe(arm)
  return () => {
    clearTimeout(timer)
    unsubscribe()
  }
}
