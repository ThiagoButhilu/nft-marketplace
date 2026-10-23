import type {
  CollectionId,
  Edition,
  EditionKind,
  Network,
  NftDetail,
} from '@/api/contracts'

/** Reference instant for every fixture timestamp (matches the Figma receipt). */
export const FIXTURE_NOW = Date.parse('2026-07-29T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

export type NftRecord = Omit<NftDetail, 'soldOut'> & {
  /** Drives the "Em alta" tab; not exposed by the API. */
  trending: boolean
}

const ARTWORK = {
  'emerald-ape': 'macaco marrom com óculos redondos e jaqueta college verde',
  'sage-nomad': 'gorila cinza com chapéu bucket verde e moletom roxo',
  'ivory-baron': 'gorila preto com gola alta verde e blazer creme',
  'golden-beat': 'macaco dourado com fones de ouvido verdes e jaqueta creme',
} as const
type Artwork = keyof typeof ARTWORK

interface Seed {
  name: string
  number: string
  art: Artwork
  price: string
  compareAtPrice?: string
  network: Network
  collection: CollectionId
  rarity?: 'common' | 'rare'
  ageDays: number
  trending?: boolean
  /** Availability per edition kind; omitted kinds are not offered. */
  editions: Partial<Record<EditionKind, number>>
}

const OPEN = 500

/** First nine items reproduce the Figma catalog grid. */
const FIGMA_SEEDS: Seed[] = [
  {
    name: 'Emerald Ape',
    number: '042',
    art: 'emerald-ape',
    price: '1.19',
    network: 'ethereum',
    collection: 'digital-art',
    ageDays: 1,
    trending: true,
    editions: { '1/1': 0, '1/10': 3, '1/50': 24, open: OPEN },
  },
  {
    name: 'Sage Nomad',
    number: '009',
    art: 'sage-nomad',
    price: '1.69',
    network: 'ethereum',
    collection: 'digital-art',
    ageDays: 2,
    editions: { '1/10': 6, '1/50': 31 },
  },
  {
    name: 'Neon Vessel',
    number: '552',
    art: 'ivory-baron',
    price: '1.99',
    compareAtPrice: '2.29',
    network: 'polygon',
    collection: 'collectibles',
    rarity: 'rare',
    ageDays: 3,
    trending: true,
    editions: { '1/1': 1, '1/10': 4 },
  },
  {
    name: 'Cosmic Bloom',
    number: '118',
    art: 'sage-nomad',
    price: '1.29',
    network: 'solana',
    collection: 'generative',
    ageDays: 4,
    editions: { '1/50': 18, open: OPEN },
  },
  {
    name: 'Violet Nomad',
    number: '314',
    art: 'sage-nomad',
    price: '1.39',
    network: 'ethereum',
    collection: 'digital-art',
    ageDays: 5,
    trending: true,
    editions: { '1/10': 8, '1/50': 40 },
  },
  {
    name: 'Ivory Baron',
    number: '088',
    art: 'ivory-baron',
    price: '1.79',
    network: 'ethereum',
    collection: 'photography',
    ageDays: 6,
    editions: { '1/10': 2, '1/50': 12 },
  },
  {
    name: 'Golden Beat',
    number: '207',
    art: 'golden-beat',
    price: '0.99',
    network: 'polygon',
    collection: 'music',
    ageDays: 7,
    trending: true,
    editions: { '1/50': 20, open: OPEN },
  },
  {
    name: 'Golden Frequency',
    number: '071',
    art: 'sage-nomad',
    price: '0.59',
    network: 'polygon',
    collection: 'music',
    ageDays: 8,
    editions: { '1/50': 9 },
  },
  // Sold out on purpose: exercises "edição esgotada".
  {
    name: 'Golden Signal',
    number: '160',
    art: 'golden-beat',
    price: '0.39',
    network: 'solana',
    collection: 'music',
    ageDays: 9,
    editions: { '1/10': 0, '1/50': 0 },
  },
]

const NAMES = [
  'Amber',
  'Copper',
  'Velvet',
  'Cedar',
  'Onyx',
  'Saffron',
  'Rust',
  'Moss',
  'Ember',
]
const ROLES = ['Drifter', 'Monarch', 'Pilot']
const ARTS: Artwork[] = [
  'emerald-ape',
  'sage-nomad',
  'ivory-baron',
  'golden-beat',
]
const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']
const COLLECTIONS: CollectionId[] = [
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'games',
  'memberships',
  'utility',
]
const EDITION_SETS: Array<Partial<Record<EditionKind, number>>> = [
  { '1/1': 1 },
  { '1/10': 5, '1/50': 22 },
  { '1/50': 35, open: OPEN },
  { '1/1': 1, '1/10': 7 },
]

/** 27 extra items so the 9-per-page grid has four pages, as in the Figma. */
const GENERATED_SEEDS: Seed[] = Array.from({ length: 27 }, (_, i) => {
  // Prices from 0.02 to 12.30 ETH, spread deterministically.
  const cents = 2 + ((i * 457) % 1229)
  return {
    name: `${NAMES[i % NAMES.length]} ${ROLES[i % ROLES.length]}`,
    number: String(300 + i * 7).padStart(3, '0'),
    art: ARTS[i % ARTS.length],
    price: (cents / 100).toFixed(2),
    network: NETWORKS[(i + 1) % NETWORKS.length],
    collection: COLLECTIONS[i % COLLECTIONS.length],
    rarity: i % 5 === 0 ? 'rare' : 'common',
    ageDays: 10 + i * 2,
    trending: i % 4 === 1,
    editions: EDITION_SETS[i % EDITION_SETS.length],
  }
})

const EDITION_SUPPLY: Record<EditionKind, number | null> = {
  '1/1': 1,
  '1/10': 10,
  '1/50': 50,
  open: null,
}

function slugify(seed: Seed) {
  return `${seed.name.toLowerCase().replace(/\s+/g, '-')}-${seed.number}`
}

function hexFrom(text: string, length: number) {
  let hash = 2166136261
  let out = ''
  while (out.length < length) {
    for (const char of text + out.length) {
      hash ^= char.charCodeAt(0)
      hash = Math.imul(hash, 16777619) >>> 0
    }
    out += hash.toString(16).padStart(8, '0')
  }
  return out.slice(0, length)
}

const NETWORK_LABEL: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

function toRecord(seed: Seed, index: number, all: Seed[]): NftRecord {
  const id = slugify(seed)
  const art = ARTWORK[seed.art]
  const editions: Edition[] = (Object.keys(EDITION_SUPPLY) as EditionKind[])
    .filter((kind) => seed.editions[kind] !== undefined)
    .map((kind) => ({
      id: `${id}:${kind === 'open' ? 'open' : kind.replace('/', '-')}`,
      kind,
      supply: EDITION_SUPPLY[kind],
      available: seed.editions[kind]!,
    }))
  const network = NETWORK_LABEL[seed.network]
  const related = all
    .filter((other) => other !== seed)
    .slice(index % 4, (index % 4) + 5)
    .map(slugify)

  return {
    id,
    name: `${seed.name} #${seed.number}`,
    tokenId: `#0${seed.number}`,
    imageUrl: `/nfts/${seed.art}.webp`,
    imageAlt: `${seed.name} #${seed.number}: ${art}`,
    price: seed.price,
    compareAtPrice: seed.compareAtPrice ?? null,
    network: seed.network,
    collection: seed.collection,
    rarity: seed.rarity ?? 'common',
    listedAt: new Date(FIXTURE_NOW - seed.ageDays * DAY).toISOString(),
    version: 1,
    description: `Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na ${network}, com arte desbloqueável e acesso para colecionadores.`,
    longDescription: [
      `${seed.name} #${seed.number} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na ${network}.`,
      'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede.',
    ],
    gallery: Array.from({ length: 4 }, (_, i) => ({
      url: `/nfts/${seed.art}.webp`,
      alt: `${seed.name} #${seed.number}, imagem ${i + 1} de 4`,
    })),
    editions,
    seriesName: 'Kurio Apes',
    attributes:
      seed.rarity === 'rare'
        ? ['Óculos', 'Esmeralda', 'Raro']
        : ['Óculos', 'Esmeralda'],
    contractAddress: `0x${hexFrom(id, 40).toUpperCase()}`,
    royaltyPercent: 5,
    rating: { average: 4.8, count: 19 },
    maxPerOrder: 10,
    relatedIds: related,
    trending: seed.trending ?? false,
  }
}

const SEEDS = [...FIGMA_SEEDS, ...GENERATED_SEEDS]

export function createNftFixtures(): NftRecord[] {
  return SEEDS.map((seed, index) => toRecord(seed, index, SEEDS))
}

export const FEATURED_IDS = {
  hero: ['emerald-ape-042', 'ivory-baron-088', 'golden-beat-207'],
  spotlight: 'sage-nomad-009',
}
