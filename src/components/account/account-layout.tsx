import { Link, useLocation } from '@tanstack/react-router'
import {
  Download,
  Heart,
  LifeBuoy,
  LogOut,
  MapPin,
  ShoppingCart,
  Tags,
  User,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useLogout } from '@/queries/session'
import type { ComingSoonSection } from '@/routes/em-breve'

type Item =
  | {
      label: string
      icon: LucideIcon
      to: '/account/profile' | '/account/wallets' | '/account/favorites'
    }
  | { label: string; icon: LucideIcon; secao: ComingSoonSection }

/** Figma "Meu perfil" menu; items outside the scope lead to /em-breve. */
const ITEMS: Item[] = [
  { label: 'Dados do perfil', icon: User, to: '/account/profile' },
  { label: 'Carteiras', icon: MapPin, to: '/account/wallets' },
  { label: 'Atividade', icon: ShoppingCart, secao: 'atividade' },
  { label: 'Lista de interesse', icon: Heart, to: '/account/favorites' },
  { label: 'Ofertas', icon: Tags, secao: 'ofertas' },
  { label: 'Arquivos baixados', icon: Download, secao: 'downloads' },
  { label: 'Suporte', icon: LifeBuoy, secao: 'suporte' },
]

const itemClass = (active: boolean) =>
  cn(
    'relative flex h-11 shrink-0 items-center gap-3 px-4 text-[15px] whitespace-nowrap text-brand-accent transition-colors hover:bg-surface-dark lg:px-4',
    active &&
      'text-brand-accent before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-brand max-lg:before:inset-x-3 max-lg:before:top-auto max-lg:before:h-0.5 max-lg:before:w-auto',
  )

export function AccountLayout({
  title,
  hideTitle = false,
  children,
}: {
  title: string
  /** The Figma wallets screen starts at "Carteira principal": keep the h1 for AT only. */
  hideTitle?: boolean
  children: ReactNode
}) {
  const { pathname } = useLocation()
  const logout = useLogout()

  return (
    <div className="page-container grid grid-cols-[minmax(0,1fr)] gap-8 pt-6 lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-7 lg:pt-8">
      <nav
        aria-labelledby="account-menu-title"
        className="self-start bg-card lg:pb-0"
      >
        <h2
          id="account-menu-title"
          className="px-2.5 pt-6 pb-2 text-lg font-bold max-lg:sr-only"
        >
          Meu perfil
        </h2>
        <ul className="flex overflow-x-auto [contain:paint] lg:flex-col lg:overflow-visible">
          {ITEMS.map((item) => {
            const Icon = item.icon
            const content = (
              <>
                <Icon className="size-[18px] shrink-0" aria-hidden />
                {item.label}
              </>
            )
            if ('to' in item) {
              const active = pathname === item.to
              return (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={itemClass(active)}
                  >
                    {content}
                  </Link>
                </li>
              )
            }
            return (
              <li key={item.label}>
                <Link
                  to="/em-breve"
                  search={{ secao: item.secao }}
                  className={itemClass(false)}
                >
                  {content}
                </Link>
              </li>
            )
          })}
          <li className="lg:mt-1 lg:border-t lg:border-line">
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className={cn(itemClass(false), 'w-full font-bold')}
            >
              <LogOut className="size-[18px] shrink-0" aria-hidden />
              Sair
            </button>
          </li>
        </ul>
      </nav>
      <section aria-labelledby="account-title" className="min-w-0">
        <h1
          id="account-title"
          className={cn('text-base font-bold', hideTitle && 'sr-only')}
        >
          {title}
        </h1>
        {children}
      </section>
    </div>
  )
}
