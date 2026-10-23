import { useQuery } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { NftListQuery } from '@/api/contracts'
import { DesktopHero } from '@/components/catalog/hero'
import { NftCard } from '@/components/catalog/nft-card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { useIsDesktop } from '@/hooks/use-media-query'
import { safeRedirect } from '@/lib/safe-redirect'
import { cn } from '@/lib/utils'
import { nftListQuery } from '@/queries/catalog'
import { LoginForm, SignupForm } from './auth-forms'
import type { AuthSearch } from './auth-search'
import { SocialButtons } from './social-buttons'

type Mode = 'login' | 'signup'

const COPY: Record<
  Mode,
  { title: string; mobileTitle: string; description: string }
> = {
  login: {
    title: 'Entrar',
    mobileTitle: 'Entrar',
    description:
      'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  },
  signup: {
    title: 'Criar conta',
    mobileTitle: 'Criar perfil de colecionador',
    description:
      'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
  },
}

/**
 * Login / signup. Desktop: dialog over the marketplace (Figma "Desktop /
 * Login"); mobile: full page (Figma "Mobile / Login"). On success the user
 * returns to `redirect` (validated), e.g. the checkout they came from.
 */
export function AuthScreen({
  mode,
  search,
}: {
  mode: Mode
  search: AuthSearch
}) {
  const router = useRouter()
  const isDesktop = useIsDesktop()
  const copy = COPY[mode]

  const done = () =>
    void router.navigate({ href: safeRedirect(search.redirect), replace: true })
  const close = () =>
    router.history.canGoBack()
      ? router.history.back()
      : void router.navigate({ to: '/' })

  const expiredNotice = search.motivo === 'expirada' && (
    <p
      role="status"
      className="rounded-sm border border-brand/60 bg-surface-dark/60 px-3 py-2 text-sm"
    >
      Sua sessão expirou. Entre novamente para continuar de onde parou.
    </p>
  )

  const form =
    mode === 'login' ? (
      <LoginForm onSuccess={done} variant={isDesktop ? 'dialog' : 'page'} />
    ) : (
      <SignupForm onSuccess={done} variant={isDesktop ? 'dialog' : 'page'} />
    )

  if (!isDesktop) {
    return (
      <section className="px-7 pt-16 pb-32" aria-labelledby="auth-title">
        <p
          aria-hidden
          className="text-center text-[34px] font-bold tracking-[0.08em]"
        >
          KURIO
        </p>
        <h1 id="auth-title" className="mt-16 text-center text-xl font-bold">
          {copy.mobileTitle}
        </h1>
        <div className="mt-8 space-y-4">
          {expiredNotice}
          {form}
        </div>
        <div className="mt-10">
          <SocialButtons />
        </div>
        <p className="mt-10 text-center text-[15px] text-brand-accent">
          {mode === 'login' ? (
            <Link
              to="/signup"
              search={search}
              replace
              className="hover:underline"
            >
              Novo na Kurio? Crie uma conta
            </Link>
          ) : (
            <Link
              to="/login"
              search={search}
              replace
              className="hover:underline"
            >
              Já tem uma conta? Entre
            </Link>
          )}
        </p>
      </section>
    )
  }

  return (
    <>
      <MarketplaceBackdrop />
      <Dialog open onOpenChange={(open) => !open && close()}>
        <DialogContent className="top-[clamp(1rem,10vh,160px)] max-h-[calc(100dvh-2rem)] translate-y-0 overflow-y-auto rounded-none border-0 border-b-[10px] border-brand bg-card px-20 pt-12 pb-16 sm:max-w-[500px] [&>[data-slot=dialog-close]]:text-brand-accent [&>[data-slot=dialog-close]]:opacity-100">
          <DialogTitle className="sr-only">{copy.title}</DialogTitle>
          <nav
            aria-label="Entrar ou criar conta"
            className="flex justify-center text-lg"
          >
            <Link
              to="/login"
              search={search}
              replace
              aria-current={mode === 'login' ? 'page' : undefined}
              className={cn(
                'px-2',
                mode === 'login'
                  ? 'text-brand-accent'
                  : 'hover:text-brand-accent',
              )}
            >
              Entrar
            </Link>
            <span aria-hidden className="w-px bg-brand-accent" />
            <Link
              to="/signup"
              search={search}
              replace
              aria-current={mode === 'signup' ? 'page' : undefined}
              className={cn(
                'px-2',
                mode === 'signup'
                  ? 'text-brand-accent'
                  : 'hover:text-brand-accent',
              )}
            >
              Criar conta
            </Link>
          </nav>
          <DialogDescription className="mt-6 text-center text-[13px] text-text-primary">
            {copy.description}
          </DialogDescription>
          <div className="mt-4 space-y-3">
            {expiredNotice}
            {form}
          </div>
          <div className="mt-4 -mx-20 border-t border-line px-20 pt-1">
            <SocialButtons />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

const BACKDROP_QUERY = NftListQuery.parse({})

/** Decorative marketplace behind the dialog (inert: not focusable or read). */
function MarketplaceBackdrop() {
  const { data } = useQuery(nftListQuery(BACKDROP_QUERY))
  return (
    <div inert aria-hidden>
      <DesktopHero />
      <ul className="page-container mt-24 grid grid-cols-3 gap-x-8 gap-y-14 lg:pl-[358px]">
        {data?.items.map((nft) => (
          <li key={nft.id}>
            <NftCard nft={nft} />
          </li>
        ))}
      </ul>
    </div>
  )
}
