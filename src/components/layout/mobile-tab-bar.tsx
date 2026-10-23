import { Link, useLocation } from '@tanstack/react-router'
import { Heart, House, ScanLine, ShoppingCart, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from '@/queries/cart'
import { useSession } from '@/queries/session'

const itemClass = (active: boolean) =>
  cn(
    'relative grid size-12 place-items-center rounded-full transition-colors',
    active
      ? 'text-brand-accent'
      : 'text-brand-secondary hover:text-brand-accent',
  )

/** Bottom navigation from the mobile frames (hidden from md up). */
export function MobileTabBar() {
  const { pathname, href } = useLocation()
  const session = useSession()
  const count = useCart().data?.itemCount ?? 0

  return (
    <nav
      aria-label="Navegação móvel"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(0_0_0/0.35)] md:hidden"
    >
      <ul className="mx-auto flex h-[72px] max-w-md items-center justify-around px-4">
        <li>
          <Link
            to="/"
            aria-label="Início"
            aria-current={pathname === '/' ? 'page' : undefined}
            className={itemClass(pathname === '/')}
          >
            <House
              className="size-6"
              aria-hidden
              fill={pathname === '/' ? 'currentColor' : 'none'}
            />
          </Link>
        </li>
        <li>
          <Link
            to="/account/favorites"
            aria-label="Favoritos"
            aria-current={
              pathname === '/account/favorites' ? 'page' : undefined
            }
            className={itemClass(pathname === '/account/favorites')}
          >
            <Heart className="size-6" aria-hidden fill="currentColor" />
          </Link>
        </li>
        <li className="-mt-10">
          <Link
            to="/em-breve"
            search={{ secao: 'scanner' }}
            aria-label="Escanear NFT (em breve)"
            className="grid size-16 place-items-center rounded-full bg-gradient-to-b from-brand-accent to-brand text-ink shadow-[0_8px_20px_rgb(210_138_76/0.35)] ring-8 ring-background"
          >
            <ScanLine className="size-7" aria-hidden />
          </Link>
        </li>
        <li>
          <Link
            to="/cart"
            aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
            aria-current={pathname === '/cart' ? 'page' : undefined}
            className={itemClass(pathname === '/cart')}
          >
            <ShoppingCart className="size-6" aria-hidden />
            {count > 0 && (
              <span
                aria-hidden
                className="absolute top-1.5 right-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-tiny leading-4 font-bold text-ink"
              >
                {count}
              </span>
            )}
          </Link>
        </li>
        <li>
          {session ? (
            <Link
              to="/account/profile"
              aria-label="Minha conta"
              aria-current={
                pathname.startsWith('/account/profile') ? 'page' : undefined
              }
              className={itemClass(
                pathname.startsWith('/account/profile') ||
                  pathname === '/account/wallets',
              )}
            >
              <User className="size-6" aria-hidden fill="currentColor" />
            </Link>
          ) : (
            <Link
              to="/login"
              search={{ redirect: href }}
              aria-label="Entrar"
              className={itemClass(pathname === '/login')}
            >
              <User className="size-6" aria-hidden fill="currentColor" />
            </Link>
          )}
        </li>
      </ul>
    </nav>
  )
}
