import type { Network, Wallet, WalletProvider } from '@/api/contracts'
import { FIXTURE_NOW } from './nfts'

/**
 * Fictitious credentials, also listed in the README. Passwords are hashed
 * (salted SHA-256) when the mock database is seeded and never stored in clear.
 */
export const FIXTURE_USERS = [
  {
    id: 'usr_ana',
    username: 'ana.lima',
    email: 'ana@kurio.test',
    password: 'Kurio2026',
    displayName: 'Ana Lima',
    ensName: 'analima',
    walletNickname: 'Cofre da Ana',
    favorites: ['emerald-ape-042', 'ivory-baron-088'],
  },
  {
    id: 'usr_bruno',
    username: 'bruno.costa',
    email: 'bruno@kurio.test',
    password: 'Colecao2026',
    displayName: 'Bruno Costa',
    ensName: null,
    walletNickname: 'Bruno principal',
    favorites: [],
  },
] as const

export type FixtureUser = (typeof FIXTURE_USERS)[number]

interface WalletSeed {
  provider: WalletProvider
  network: Network
  label: string
  address: string
}

const WALLET_SEEDS: Record<string, WalletSeed[]> = {
  usr_ana: [
    {
      provider: 'metamask',
      network: 'ethereum',
      label: 'MetaMask principal',
      address: '0xA91F3c2E4b7D8e9F0a1B2c3D4e5F6a7B8c9DE82C',
    },
    {
      provider: 'coinbase',
      network: 'polygon',
      label: 'Coinbase Wallet',
      address: '0x5B2e8C1d9A0f7E6b3C4d5E6f7A8b9C0d1E2f3A4b',
    },
  ],
  usr_bruno: [
    {
      provider: 'walletconnect',
      network: 'ethereum',
      label: 'WalletConnect',
      address: '0x1234567890aBcdEF1234567890abCDef12345678',
    },
  ],
}

export function createWalletFixtures(user: FixtureUser): Wallet[] {
  return (WALLET_SEEDS[user.id] ?? []).map((seed, index) => ({
    id: `wal_${user.id.slice(4)}_${index + 1}`,
    role: index === 0 ? 'primary' : 'secondary',
    provider: seed.provider,
    network: seed.network,
    label: seed.label,
    displayName: user.displayName,
    profileName: user.username,
    address: seed.address,
    secondaryAddress: null,
    ensName: user.ensName,
    email: user.email,
    referralCode: 'KURIO',
    updatedAt: new Date(FIXTURE_NOW).toISOString(),
  }))
}

export interface CouponRecord {
  code: string
  description: string
  kind: 'percent' | 'fixed'
  /** Percentage (e.g. "10") or ETH amount (e.g. "0.05"). */
  value: string
  expiresAt: string
}

export const COUPON_FIXTURES: CouponRecord[] = [
  {
    code: 'KURIO10',
    description: '10% de desconto no lançamento',
    kind: 'percent',
    value: '10',
    expiresAt: '2099-12-31T23:59:59.000Z',
  },
  {
    code: 'GENESIS',
    description: '0.05 ETH de desconto',
    kind: 'fixed',
    value: '0.05',
    expiresAt: '2099-12-31T23:59:59.000Z',
  },
  {
    code: 'VERAO2025',
    description: 'Campanha de verão 2025',
    kind: 'percent',
    value: '15',
    expiresAt: '2025-03-20T23:59:59.000Z',
  },
]

/** Estimated network fee per order, in ETH. */
export const NETWORK_FEES: Record<Network, string> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.0005',
}
