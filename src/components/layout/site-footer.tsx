import { Link } from '@tanstack/react-router'
import { useId, type FormEvent } from 'react'
import type { CollectionId } from '@/api/contracts'
import { notices } from '@/lib/notices'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
  YoutubeIcon,
} from '@/components/icons/social'
import { WalletChips } from '@/components/common/wallet-chips'
import type { ComingSoonSection } from '@/routes/em-breve'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const HELP_LINKS: Array<{ label: string; secao: ComingSoonSection }> = [
  { label: 'Central de ajuda', secao: 'ajuda' },
  { label: 'Como comprar NFTs', secao: 'ajuda' },
  { label: 'Carteira e segurança', secao: 'ajuda' },
  { label: 'Política do mercado', secao: 'ajuda' },
  { label: 'Denunciar item', secao: 'ajuda' },
]

const COLLECTION_LINKS: Array<{ label: string; id: CollectionId }> = [
  { label: 'Arte digital', id: 'digital-art' },
  { label: 'Fotografia', id: 'photography' },
  { label: 'Música', id: 'music' },
  { label: 'Arte 3D', id: '3d-art' },
  { label: 'Utilidade', id: 'utility' },
]

const SOCIALS = [
  { label: 'Facebook', href: 'https://www.facebook.com/', Icon: FacebookIcon },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/',
    Icon: InstagramIcon,
  },
  { label: 'Twitter', href: 'https://twitter.com/', Icon: TwitterIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/', Icon: LinkedinIcon },
  { label: 'YouTube', href: 'https://www.youtube.com/', Icon: YoutubeIcon },
]

const linkClass =
  'text-sm text-foreground hover:text-brand-accent hover:underline underline-offset-4'

export function SiteFooter() {
  return (
    <footer className="page-container mt-24 pb-28 md:pb-6">
      <div className="bg-card">
        <section
          aria-label="Destaques da Kurio"
          className="grid gap-8 px-6 py-8 md:px-12 lg:grid-cols-[1fr_1fr_1fr_1.3fr] lg:gap-0"
        >
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="lg:border-r lg:border-brand lg:px-8 lg:first:pl-0"
            >
              <span
                aria-hidden
                className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-ink"
              >
                {feature.letter}
              </span>
              <h2 className="mt-5 text-lg font-bold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-[22px] text-brand-accent/90">
                {feature.text}
              </p>
            </div>
          ))}
          <NewsletterForm />
        </section>

        <div className="grid gap-4 bg-surface-dark px-6 py-6 text-sm sm:grid-cols-2 md:px-8 lg:grid-cols-4 lg:items-center">
          <span className="font-bold tracking-[0.12em]">KURIO</span>
          <p>Feito para colecionadores, criadores e cultura</p>
          <a href="mailto:contato@email.com" className={linkClass}>
            contato@email.com
          </a>
          <a href="tel:+551140028922" className={linkClass}>
            +55 11 4002 8922
          </a>
        </div>

        <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
          <nav aria-labelledby="footer-profile">
            <h2 id="footer-profile" className="text-lg font-bold">
              Meu perfil
            </h2>
            <ul className="mt-2 space-y-2">
              <li>
                <Link to="/account/profile" className={linkClass}>
                  Meu perfil
                </Link>
              </li>
              <li>
                <Link
                  to="/em-breve"
                  search={{ secao: 'colecao' }}
                  className={linkClass}
                >
                  Minha coleção
                </Link>
              </li>
              <li>
                <Link
                  to="/em-breve"
                  search={{ secao: 'atividade' }}
                  className={linkClass}
                >
                  Atividade
                </Link>
              </li>
              <li>
                <Link
                  to="/em-breve"
                  search={{ secao: 'estudio' }}
                  className={linkClass}
                >
                  Estúdio do criador
                </Link>
              </li>
              <li>
                <Link to="/account/favorites" className={linkClass}>
                  Lista de interesse
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-help">
            <h2 id="footer-help" className="text-lg font-bold">
              Central de ajuda
            </h2>
            <ul className="mt-2 space-y-2">
              {HELP_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to="/em-breve"
                    search={{ secao: link.secao }}
                    className={linkClass}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-labelledby="footer-collections">
            <h2 id="footer-collections" className="text-lg font-bold">
              Coleções
            </h2>
            <ul className="mt-2 space-y-2">
              {COLLECTION_LINKS.map((link) => (
                <li key={link.id}>
                  <Link
                    to="/"
                    search={{ collection: [link.id] }}
                    hash="catalogo"
                    className={linkClass}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="text-lg font-bold">Redes sociais</h2>
            <ul className="mt-3 flex gap-2">
              {SOCIALS.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label} (abre em nova aba)`}
                    className="grid size-8 place-items-center rounded-sm border border-brand text-brand-accent hover:bg-surface-dark"
                  >
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
            <h2 className="mt-6 text-lg font-bold">Carteiras compatíveis</h2>
            <WalletChips className="mt-2" />
          </div>
        </div>
      </div>
      <p className="py-6 text-center text-xs">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  )
}

/** Out of scope: says so explicitly instead of pretending to subscribe. */
function NewsletterForm() {
  const inputId = useId()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    notices.push({
      tone: 'info',
      title: 'Newsletter indisponível',
      description:
        'A inscrição não faz parte desta demonstração. Nenhum e-mail foi registrado.',
    })
  }
  return (
    <form
      onSubmit={submit}
      className="lg:pl-8"
      aria-labelledby={`${inputId}-title`}
    >
      <h2 id={`${inputId}-title`} className="text-lg leading-5 font-bold">
        Antecipe-se ao próximo lançamento
      </h2>
      <div className="mt-4 flex">
        <label htmlFor={inputId} className="sr-only">
          Seu e-mail
        </label>
        <Input
          id={inputId}
          type="email"
          placeholder="digite seu e-mail..."
          className="rounded-r-none border-0 bg-ink/60"
          autoComplete="email"
        />
        <Button type="submit" className="rounded-l-none text-base">
          Enviar
        </Button>
      </div>
      <p className="mt-4 text-xs leading-[22px] text-brand-accent/90">
        Receba lançamentos selecionados, histórias de criadores e novidades do
        mercado.
      </p>
    </form>
  )
}
