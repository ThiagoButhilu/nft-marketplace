import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { sessionStore } from '@/lib/session-store'

/**
 * Reacts to a session ending while a private screen is open: expiry (or an
 * invalid token) sends the user to login with the current location kept for
 * resuming; a logout goes home. Public screens stay where they are.
 */
export function SessionGuard() {
  const router = useRouter()
  useEffect(
    () =>
      sessionStore.onEnd((reason) => {
        const { location, matches } = router.state
        const isPrivate = matches.some((match) =>
          match.routeId.startsWith('/_auth'),
        )
        if (!isPrivate) return
        if (reason === 'logout') {
          void router.navigate({ to: '/', replace: true })
          return
        }
        void router.navigate({
          to: '/login',
          search: {
            redirect: location.href,
            motivo: reason === 'expired' ? 'expirada' : undefined,
          },
          replace: true,
        })
      }),
    [router],
  )
  return null
}
