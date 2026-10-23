import { Link, useLocation } from '@tanstack/react-router'
import { LogIn, Search, ShoppingCart } from 'lucide-react'
import { Suspense, lazy, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useCart } from '@/queries/cart'
import { useSession } from '@/queries/session'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/common/user-avatar'
import { RealtimeIndicator } from './realtime-indicator'

const SearchDialogContent = lazy(() =>
  import('./search-dialog').then((m) => ({ default: m.SearchDialogContent })),
)

type Section = 'inicio' | 'mercado' | null

/** Figma: "Início" is active on home and account pages, "Mercado" on the purchase flow. */
function activeSection(pathname: string): Section {
  if (pathname === '/' || pathname.startsWith('/account')) return 'inicio'
  if (/^\/(nft|cart|checkout|orders)/.test(pathname)) return 'mercado'
  return null
}

const navLinkClass = (active: boolean) =>
  cn(
    'relative inline-flex h-full items-center px-1 text-[15px] transition-colors hover:text-brand-accent',
    active
      ? 'font-bold text-brand-accent after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand-accent'
      : 'text-foreground',
  )

export function SiteHeader({
  hideOnMobile = false,
}: {
  hideOnMobile?: boolean
}) {
  const { pathname, href } = useLocation()
  const session = useSession()
  const { data: cart } = useCart()
  const section = activeSection(pathname)
  const count = cart?.itemCount ?? 0

  return (
    <header className={cn('page-container', hideOnMobile && 'max-md:hidden')}>
      <div className="flex h-14 items-center gap-4 border-b border-line md:h-[68px]">
        <Link
          to="/"
          className="text-[13px] font-bold tracking-[0.12em]"
          aria-label="Kurio, página inicial"
        >
          KURIO
        </Link>

        <nav aria-label="Principal" className="mx-auto hidden h-full md:block">
          <ul className="flex h-full items-center gap-9">
            <li className="h-full">
              <Link
                to="/"
                className={navLinkClass(section === 'inicio')}
                aria-current={section === 'inicio' ? 'page' : undefined}
              >
                Início
              </Link>
            </li>
            <li className="h-full">
              <Link
                to="/"
                hash="catalogo"
                className={navLinkClass(section === 'mercado')}
                aria-current={section === 'mercado' ? 'page' : undefined}
              >
                Mercado
              </Link>
            </li>
            <li className="h-full">
              <Link
                to="/em-breve"
                search={{ secao: 'criadores' }}
                className={navLinkClass(false)}
              >
                Criadores
              </Link>
            </li>
            <li className="h-full">
              <Link
                to="/em-breve"
                search={{ secao: 'aprenda' }}
                className={navLinkClass(false)}
              >
                Aprenda
              </Link>
            </li>
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0 md:gap-4">
          <RealtimeIndicator />
          <SearchDialog />
          <Link
            to="/cart"
            className="relative inline-flex size-10 items-center justify-center rounded-sm hover:text-brand-accent"
            aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
          >
            <ShoppingCart className="size-6" aria-hidden />
            {count > 0 && (
              <span
                aria-hidden
                className="absolute top-1 right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-tiny leading-4 font-bold text-primary-foreground"
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
          {session ? (
            <Link
              to="/account/profile"
              className="inline-flex items-center gap-2 rounded-sm px-1 hover:text-brand-accent"
            >
              <UserAvatar user={session.user} className="size-9" />
              <span className="sr-only">Minha conta, </span>
              <span className="max-w-32 truncate text-sm max-lg:sr-only">
                {session.user.displayName}
              </span>
            </Link>
          ) : (
            <Button
              asChild
              size="sm"
              className="h-9 px-3 text-[15px] font-medium"
            >
              <Link to="/login" search={{ redirect: href }}>
                <LogIn aria-hidden />
                Entrar
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

/**
 * The search button renders immediately; the dialog (Radix focus trap,
 * scroll lock...) is loaded on first use, off the critical path.
 */
function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [requested, setRequested] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        aria-label="Buscar NFTs"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="max-md:hidden"
        onClick={() => {
          setRequested(true)
          setOpen(true)
        }}
        onMouseEnter={() => setRequested(true)}
        onFocus={() => setRequested(true)}
      >
        <Search className="size-6" aria-hidden />
      </Button>
      {requested && (
        <Suspense fallback={null}>
          <SearchDialogContent
            open={open}
            onOpenChange={setOpen}
            returnFocusTo={triggerRef}
          />
        </Suspense>
      )}
    </>
  )
}
