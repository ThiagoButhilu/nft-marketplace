import { z } from 'zod'
import {
  Email,
  EvmAddress,
  Network,
  WalletProvider,
  type Wallet,
} from '@/api/contracts'

const oneOf = (options: readonly string[], message: string) =>
  z.string().refine((v) => (options as readonly string[]).includes(v), message)

/** Form values are plain strings; empty optional fields become null on submit. */
export const WalletFormSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(48),
  label: z.string().trim().min(2, 'Informe o apelido da carteira').max(32),
  network: oneOf(Network.options, 'Selecione uma rede'),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(48),
  address: EvmAddress,
  secondaryAddress: z
    .string()
    .trim()
    .refine(
      (v) => !v || /^(0x[a-fA-F0-9]{40}|[a-z0-9-]{3,}\.eth)$/i.test(v),
      'Use um endereço 0x ou nome .eth',
    ),
  provider: oneOf(WalletProvider.options, 'Selecione uma carteira'),
  referralCode: z
    .string()
    .trim()
    .min(4, 'Informe o código de indicação')
    .max(16),
  email: Email,
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,}$/i, 'Use letras, números ou hífen (mín. 3)'),
})
export type WalletFormValues = z.infer<typeof WalletFormSchema>

export const EMPTY_WALLET_FORM: WalletFormValues = {
  displayName: '',
  label: '',
  network: '',
  profileName: '',
  address: '',
  secondaryAddress: '',
  provider: '',
  referralCode: '',
  email: '',
  ensName: '',
}

export const walletToForm = (wallet: Wallet): WalletFormValues => ({
  displayName: wallet.displayName,
  label: wallet.label,
  network: wallet.network,
  profileName: wallet.profileName,
  address: wallet.address,
  secondaryAddress: wallet.secondaryAddress ?? '',
  provider: wallet.provider,
  referralCode: wallet.referralCode,
  email: wallet.email,
  ensName: wallet.ensName ?? '',
})
