import type { Wallet } from '@/api/contracts'

export const PROVIDER_LABELS: Record<Wallet['provider'], string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export const shortAddress = (address: string) =>
  address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
