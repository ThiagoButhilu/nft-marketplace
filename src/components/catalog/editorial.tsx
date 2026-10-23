import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Static editorial blocks from the home frame (promos and blog teasers). */
export function PromoSection() {
  return (
    <section
      aria-label="Promoções"
      className="page-container mt-24 grid gap-6 lg:grid-cols-2 lg:gap-8"
    >
      <PromoCard
        image="/nfts/emerald-ape.webp"
        title="Lançamentos gênesis de edição limitada"
        text="Colecione edições escassas diretamente dos criadores antes da revelação pública."
        link={{ tab: 'new' as const }}
      />
      <PromoCard
        image="/nfts/ivory-baron.webp"
        title="Arte digital selecionada e muito mais"
        text="Explore novos artistas, coleções verificadas e obras digitais que definem a cultura."
        link={{ collection: ['digital-art' as const] }}
      />
    </section>
  )
}

function PromoCard({
  image,
  title,
  text,
  link,
}: {
  image: string
  title: string
  text: string
  link: { tab?: 'new'; collection?: Array<'digital-art'> }
}) {
  return (
    <article className="grid grid-cols-[minmax(0,45%)_1fr] overflow-hidden rounded-sm bg-card">
      <img
        src={image}
        alt=""
        width={240}
        height={250}
        loading="lazy"
        className="h-full min-h-48 w-full object-cover"
      />
      <div className="flex flex-col items-end justify-center gap-3 p-4 text-right sm:p-6">
        <h2 className="text-[15px] leading-5 font-bold">{title}</h2>
        <p className="text-xs leading-5 text-brand-accent/90">{text}</p>
        <Button asChild size="sm">
          <Link to="/" search={link} hash="catalogo">
            Explorar <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  )
}

const POSTS = [
  {
    image: '/nfts/ivory-baron.webp',
    date: '12 de setembro',
    minutes: 6,
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
  },
  {
    image: '/nfts/emerald-ape.webp',
    date: '13 de setembro',
    minutes: 2,
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
  },
  {
    image: '/nfts/sage-nomad.webp',
    date: '15 de setembro',
    minutes: 3,
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
  },
  {
    image: '/nfts/golden-beat.webp',
    date: '15 de setembro',
    minutes: 2,
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
  },
]

export function BlogSection() {
  return (
    <section aria-labelledby="blog-title" className="page-container mt-24">
      <h2 id="blog-title" className="text-center text-heading font-bold">
        Diário da Cunhagem
      </h2>
      <p className="mt-3 text-center text-xs text-brand-accent/90">
        Histórias, guias e insights para colecionadores sobre o universo da
        propriedade digital.
      </p>
      {/* contain:paint keeps the horizontal scroller from widening the page
          on narrow non-touch viewports (Chrome counts its overflow). */}
      <ul className="-mx-4 mt-8 flex snap-x snap-mandatory [contain:paint] gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4 lg:gap-4">
        {POSTS.map((post) => (
          <li
            key={post.title}
            className="w-[78%] shrink-0 snap-start sm:w-auto"
          >
            <article className="h-full bg-card">
              <img
                src={post.image}
                alt=""
                width={280}
                height={200}
                loading="lazy"
                className="aspect-[280/200] w-full object-cover"
              />
              <div className="p-4">
                <p className="text-xs text-text-secondary">
                  {post.date} <span aria-hidden>|</span> Leitura de{' '}
                  {post.minutes} min
                </p>
                <h3 className="mt-3 text-sm font-bold">{post.title}</h3>
                <p className="mt-2 text-xs leading-5 text-brand-accent/90">
                  {post.text}
                </p>
                <Link
                  to="/em-breve"
                  search={{ secao: 'blog' }}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-brand-accent hover:underline"
                >
                  Ler mais <ArrowRight className="size-3" aria-hidden />
                  <span className="sr-only">: {post.title}</span>
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
