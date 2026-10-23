import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toApiError } from '@/api/errors'
import { AccountLayout } from '@/components/account/account-layout'
import {
  AccountError,
  AccountSkeleton,
} from '@/components/account/account-states'
import { WalletForm } from '@/components/account/wallet-form'
import {
  walletToForm,
  type WalletFormValues,
} from '@/components/account/wallet-form-schema'
import { useWallets } from '@/queries/account'

export const Route = createFileRoute('/_auth/account/wallets')({
  component: WalletsPage,
})

function WalletsPage() {
  const wallets = useWallets()
  return (
    <AccountLayout title="Carteiras" hideTitle>
      {wallets.isPending ? (
        <AccountSkeleton />
      ) : wallets.isError ? (
        <AccountError
          error={toApiError(wallets.error)}
          onRetry={() => void wallets.refetch()}
        />
      ) : (
        <WalletsEditor items={wallets.data.items} />
      )}
    </AccountLayout>
  )
}

function WalletsEditor({
  items,
}: {
  items: Parameters<typeof walletToForm>[0][]
}) {
  const primary = items.find((w) => w.role === 'primary')
  const secondary = items.find((w) => w.role === 'secondary')
  const [addingSecondary, setAddingSecondary] = useState(false)
  const [copyPrimary, setCopyPrimary] = useState(false)

  // "Igual à carteira principal": same profile data; the address must differ.
  const copied = useMemo<Partial<WalletFormValues> | undefined>(() => {
    if (!copyPrimary || !primary) return undefined
    const {
      address: _address,
      secondaryAddress: _secondary,
      ...rest
    } = walletToForm(primary)
    return { ...rest, label: `${primary.label} (secundária)` }
  }, [copyPrimary, primary])

  return (
    <div className="mt-2 space-y-12">
      <section aria-labelledby="primary-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="primary-title" className="text-base font-bold">
              Carteira principal
            </h2>
            <p className="mt-1 text-[13px] text-brand-accent/90">
              Estas carteiras ficam disponíveis no pagamento e para receber NFTs
              comprados.
            </p>
          </div>
          {!primary && (
            <span className="shrink-0 text-base font-bold text-brand-accent">
              Adicionar
            </span>
          )}
        </div>
        <div className="mt-6">
          <WalletForm
            key={primary?.id ?? 'new-primary'}
            role="primary"
            wallet={primary}
          />
        </div>
      </section>

      <section aria-labelledby="secondary-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="secondary-title" className="text-base font-bold">
              Carteira secundária
            </h2>
            {!secondary && !addingSecondary && (
              <p className="mt-1 text-[13px] text-brand-accent/90">
                Você ainda não adicionou uma carteira secundária.
              </p>
            )}
          </div>
          {!secondary && (
            <div className="flex items-center gap-4">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={copyPrimary}
                  disabled={!primary}
                  onChange={(e) => {
                    setCopyPrimary(e.target.checked)
                    if (e.target.checked) setAddingSecondary(true)
                  }}
                  className="size-4 accent-[var(--color-brand)]"
                />
                Igual à carteira principal
              </label>
              {!addingSecondary && (
                <button
                  type="button"
                  onClick={() => setAddingSecondary(true)}
                  className="text-base font-bold text-brand-accent hover:underline"
                >
                  Adicionar
                </button>
              )}
            </div>
          )}
        </div>
        {(secondary || addingSecondary) && (
          <div className="mt-6">
            <WalletForm
              key={secondary?.id ?? 'new-secondary'}
              role="secondary"
              wallet={secondary}
              initialValues={copied}
              onSaved={() => {
                setAddingSecondary(false)
                setCopyPrimary(false)
              }}
            />
          </div>
        )}
      </section>
    </div>
  )
}
