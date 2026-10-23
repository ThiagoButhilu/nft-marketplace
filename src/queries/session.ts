import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'
import type { LoginRequest, Session, SignupRequest } from '@/api/contracts'
import { authApi } from '@/api/endpoints'
import { sessionStore } from '@/lib/session-store'
import { cartOwner, queryKeys } from './keys'

export function useSession(): Session | null {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getSession)
}

/** Cart owner for the current visitor or user (changes on login/logout). */
export function useCartOwner() {
  const session = useSession()
  return cartOwner(session?.user.id ?? null, sessionStore.getCartId())
}

export const sessionQuery = (token: string) => ({
  queryKey: queryKeys.session(token),
  queryFn: ({ signal }: { signal: AbortSignal }) => authApi.session({ signal }),
  staleTime: 5 * 60_000,
  retry: false,
})

/**
 * Revalidates a persisted session with the server (on boot and focus). A 401
 * ends it through the Axios interceptor; success refreshes the user data.
 */
export function useSessionValidation() {
  const session = useSession()
  const query = useQuery({
    ...sessionQuery(session?.token ?? ''),
    enabled: !!session,
  })
  const fresh = query.data
  useEffect(() => {
    // Keeps the stored user (name, avatar) in sync with the server.
    if (fresh) sessionStore.update(fresh)
  }, [fresh])
  return query
}

function useStartSession() {
  const queryClient = useQueryClient()
  return (session: Session) => {
    sessionStore.start(session)
    // The visitor cart was merged server-side: refetch every cart view.
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
  }
}

export function useLogin() {
  const start = useStartSession()
  return useMutation({
    mutationFn: (input: Omit<LoginRequest, 'guestCartId'>) =>
      authApi.login({ ...input, guestCartId: sessionStore.getCartId() }),
    onSuccess: start,
  })
}

export function useSignup() {
  const start = useStartSession()
  return useMutation({
    mutationFn: (input: Omit<SignupRequest, 'guestCartId'>) =>
      authApi.signup({ ...input, guestCartId: sessionStore.getCartId() }),
    onSuccess: start,
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      // Best effort: the local session ends even if the server is unreachable.
      await authApi.logout().catch(() => undefined)
    },
    onSettled: () => sessionStore.end('logout'),
  })
}
