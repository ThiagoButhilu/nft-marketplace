import { Link } from '@tanstack/react-router'
import { CircleCheck, Plug, Unplug } from 'lucide-react'
import type { Network, Wallet, WalletConnection } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { NETWORK_LABELS } from '@/components/catalog/search'
import { WalletChips } from '@/components/common/wallet-chips'
import { Button } from '@/components/ui/button'
import { notices } from '@/lib/notices'
import { cn } from '@/lib/utils'
import { useConnectWallet } from '@/queries/account'
import { PROVIDER_LABELS, shortAddress } from './labels'

/**
 * "Carteira e rede": choose one of the registered wallets and connect it to
 * the selected network (simulated by the API: approval or WALLET_REJECTED).
 * The connection is bound to wallet + network; changing either drops it.
 */
export function WalletNetworkPanel({
  wallets,
  walletId,
  onWalletChange,
  network,
  connection,
  onConnectionChange,
}: {
  wallets: Wallet[]
  walletId: string | undefined
  onWalletChange: (walletId: string) => void
  network: Network
  connection: WalletConnection | null
  onConnectionChange: (connection: WalletConnection | null) => void
}) {
  const connect = useConnectWallet()
  const error = connect.error ? toApiError(connect.error) : null

  if (wallets.length === 0) {
    return (
      <div className="rounded-sm border border-line p-4 text-sm">
        <p>Você ainda não cadastrou uma carteira.</p>
        <Button asChild size="sm" className="mt-3">
          <Link to="/account/wallets">Cadastrar carteira</Link>
        </Button>
      </div>
    )
  }

  const onConnect = () => {
    if (!walletId) return
    connect.mutate(
      { walletId, network },
      {
        onSuccess: (result) => {
          onConnectionChange(result)
          notices.push({
            tone: 'success',
            title: 'Carteira conectada',
            description: `${shortAddress(result.address)} na ${NETWORK_LABELS[network]}.`,
          })
        },
        onError: () => onConnectionChange(null),
      },
    )
  }

  return (
    <fieldset>
      <legend className="sr-only">Carteira para pagamento</legend>
      <div
        className="flex min-h-11 items-center rounded-sm border border-line px-4"
        aria-hidden
      >
        <WalletChips />
      </div>
      <div className="mt-3 space-y-3">
        {wallets.map((wallet) => (
          <label
            key={wallet.id}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border px-4 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
              wallet.id === walletId
                ? 'border-text-primary'
                : 'border-line hover:border-line-soft',
            )}
          >
            <input
              type="radio"
              name="checkout-wallet"
              value={wallet.id}
              checked={wallet.id === walletId}
              onChange={() => {
                onWalletChange(wallet.id)
                onConnectionChange(null)
                connect.reset()
              }}
              className="size-4 accent-[var(--color-brand)]"
            />
            <span className="flex-1 text-[15px]">
              {PROVIDER_LABELS[wallet.provider]}
              <span className="block text-xs text-text-secondary">
                {wallet.label} · {shortAddress(wallet.address)} ·{' '}
                {wallet.role === 'primary' ? 'principal' : 'secundária'}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div
        className="mt-4 rounded-sm bg-surface-dark/40 p-3 text-sm"
        role="status"
      >
        {connection ? (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-success">
              <CircleCheck className="size-4" aria-hidden />
              Conectada: {shortAddress(connection.address)} ·{' '}
              {NETWORK_LABELS[connection.network]}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onConnectionChange(null)}
            >
              <Unplug aria-hidden />
              Desconectar
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span
              className={cn(error ? 'text-destructive' : 'text-text-secondary')}
            >
              {error
                ? error.code === 'WALLET_REJECTED'
                  ? 'A carteira recusou a conexão. Aprove a solicitação e tente novamente.'
                  : error.message
                : `Conecte a carteira na rede ${NETWORK_LABELS[network]} para confirmar.`}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onConnect}
              disabled={!walletId || connect.isPending}
            >
              <Plug aria-hidden />
              {connect.isPending
                ? 'Conectando…'
                : error
                  ? 'Tentar de novo'
                  : 'Conectar carteira'}
            </Button>
          </div>
        )}
      </div>
    </fieldset>
  )
}
