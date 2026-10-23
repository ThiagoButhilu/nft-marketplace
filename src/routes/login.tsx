import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthScreen } from '@/components/auth/auth-screen'
import { authSearchSchema } from '@/components/auth/auth-search'
import { safeRedirect } from '@/lib/safe-redirect'
import { sessionStore } from '@/lib/session-store'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  // Already signed in: go straight to where the user was heading.
  beforeLoad: ({ search }) => {
    if (sessionStore.getSession())
      throw redirect({ href: safeRedirect(search.redirect) })
  },
  component: function AuthRoute() {
    return <AuthScreen mode="login" search={Route.useSearch()} />
  },
})
