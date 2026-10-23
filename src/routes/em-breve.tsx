import { Link, createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'

const SECTIONS = {
  criadores: 'Criadores',
  aprenda: 'Aprenda',
  ajuda: 'Central de ajuda',
  colecao: 'Minha coleção',
  atividade: 'Atividade',
  estudio: 'Estúdio do criador',
  ofertas: 'Ofertas',
  downloads: 'Arquivos baixados',
  suporte: 'Suporte',
  blog: 'Diário da Cunhagem',
  scanner: 'Escanear NFT',
  social: 'Login social',
  senha: 'Recuperação de senha',
  geral: 'Esta seção',
} as const

export type ComingSoonSection = keyof typeof SECTIONS

const searchSchema = z.object({
  secao: z
    .enum(Object.keys(SECTIONS) as [ComingSoonSection, ...ComingSoonSection[]])
    .catch('geral'),
})

/**
 * Landing for links outside the challenge scope: says clearly that the
 * feature is not available instead of pretending it worked.
 */
export const Route = createFileRoute('/em-breve')({
  validateSearch: searchSchema,
  component: ComingSoon,
})

function ComingSoon() {
  const { secao } = Route.useSearch()
  return (
    <section className="page-container flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-sm text-brand-accent">Em breve</p>
      <h1 className="text-heading font-bold">
        {SECTIONS[secao]} ainda não está disponível
      </h1>
      <p className="max-w-md text-sm leading-6 text-text-secondary">
        Esta área não faz parte desta demonstração. Nenhuma ação foi executada.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao mercado</Link>
      </Button>
    </section>
  )
}
