import type { Edition } from '@/api/contracts'

export const editionLabel = (edition: Pick<Edition, 'kind'>) =>
  edition.kind === 'open' ? 'ABERTA' : edition.kind

export function editionStatus(edition: Edition) {
  if (edition.available === 0) return 'Esgotada'
  if (edition.supply === null) return 'Edição aberta'
  return `${edition.available} de ${edition.supply} disponíveis`
}
