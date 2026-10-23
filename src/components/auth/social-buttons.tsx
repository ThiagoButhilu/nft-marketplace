import { Link } from '@tanstack/react-router'
import { FacebookIcon } from '@/components/icons/social'

/**
 * Social login is outside the challenge scope: the buttons lead to the
 * "em breve" page instead of pretending to sign in.
 */
export function SocialButtons() {
  return (
    <div>
      <p className="flex items-center gap-3 text-sm before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        Ou continue com
      </p>
      <div className="mt-3 space-y-3">
        <Link
          to="/em-breve"
          search={{ secao: 'social' }}
          className="flex h-10 items-center justify-center gap-3 rounded-sm border border-line text-[13px] text-brand-accent hover:border-brand"
        >
          <span
            aria-hidden
            className="text-lg leading-none font-bold text-[#4285f4]"
          >
            G
          </span>
          Continuar com Google
          <span className="sr-only">(indisponível nesta demonstração)</span>
        </Link>
        <Link
          to="/em-breve"
          search={{ secao: 'social' }}
          className="flex h-10 items-center justify-center gap-3 rounded-sm border border-line text-[13px] text-brand-accent hover:border-brand"
        >
          <FacebookIcon className="text-[#3b5998]" />
          Continuar com Facebook
          <span className="sr-only">(indisponível nesta demonstração)</span>
        </Link>
      </div>
    </div>
  )
}
