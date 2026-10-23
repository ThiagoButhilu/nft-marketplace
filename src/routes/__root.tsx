import type { QueryClient } from '@tanstack/react-query'
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useLocation,
} from '@tanstack/react-router'
import { SessionGuard } from '@/components/auth/session-guard'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { NoticeCenter } from '@/components/layout/notice-center'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { Button } from '@/components/ui/button'
import { useSessionValidation } from '@/queries/session'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  useSessionValidation()
  const { pathname } = useLocation()
  // Mobile frames without the header: home (own search bar) and the NFT
  // detail (own top bar and purchase bar, which also replaces the tab bar).
  const isHome = pathname === '/'
  const isDetail = pathname.startsWith('/nft/')
  // Mobile login/signup are full screens without the app chrome.
  const isAuth = pathname === '/login' || pathname === '/signup'

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-sm bg-primary px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader hideOnMobile={isHome || isDetail || isAuth} />
      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <SiteFooter />
      {!isDetail && !isAuth && <MobileTabBar />}
      <SessionGuard />
      <NoticeCenter />
    </div>
  )
}

function NotFound() {
  return (
    <section className="page-container flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-sm text-brand-accent">Erro 404</p>
      <h1 className="text-heading font-bold">Página não encontrada</h1>
      <p className="max-w-md text-sm leading-6 text-text-secondary">
        O endereço pode ter mudado ou não existe. Volte ao mercado para
        continuar explorando.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao mercado</Link>
      </Button>
    </section>
  )
}
