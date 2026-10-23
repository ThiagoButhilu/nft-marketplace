import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { sessionStore } from '@/lib/session-store'

/**
 * Pathless layout guarding private routes (checkout, account, orders).
 * Visitors are sent to login with the full destination preserved.
 */
export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ location }) => {
    if (!sessionStore.getSession()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
        replace: true,
      })
    }
  },
  component: Outlet,
})
