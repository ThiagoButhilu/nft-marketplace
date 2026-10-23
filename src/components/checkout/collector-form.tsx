import { useId } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { CollectorDetails, Network, Wallet } from '@/api/contracts'
import { NETWORK_LABELS } from '@/components/catalog/search'
import { SelectField } from '@/components/form/select-field'
import { TextField } from '@/components/form/text-field'
import { PROVIDER_LABELS } from './labels'

const NETWORK_OPTIONS = (Object.keys(NETWORK_LABELS) as Network[]).map(
  (value) => ({
    value,
    label: NETWORK_LABELS[value],
  }),
)

/**
 * "Perfil do colecionador" (Figma, two columns). Wallet address and type are
 * read-only mirrors of the wallet chosen in "Carteira e rede": payment always
 * uses a registered wallet, never an address typed on the spot.
 */
export function CollectorForm({
  form,
  wallet,
  network,
  onNetworkChange,
  useSecondary,
  onUseSecondaryChange,
  hasSecondary,
}: {
  form: UseFormReturn<CollectorDetails>
  wallet: Wallet | undefined
  network: Network
  onNetworkChange: (network: Network) => void
  useSecondary: boolean
  onUseSecondaryChange: (value: boolean) => void
  hasSecondary: boolean
}) {
  const { register, formState } = form
  const errors = formState.errors
  const noteId = useId()

  return (
    <section aria-labelledby="collector-title">
      <h2 id="collector-title" className="text-lg font-bold">
        Perfil do colecionador
      </h2>
      <p className="mt-1 text-xs text-text-secondary">
        Campos marcados com{' '}
        <span aria-hidden className="text-destructive">
          *
        </span>
        <span className="sr-only">asterisco</span> são obrigatórios.
      </p>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-5 md:grid-cols-2">
        <TextField
          label="Nome de exibição"
          required
          autoComplete="name"
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <TextField
          label="Nome de usuário"
          required
          autoComplete="username"
          error={errors.username?.message}
          {...register('username')}
        />
        <SelectField
          label="Rede"
          required
          value={network}
          onChange={(e) => onNetworkChange(e.target.value as Network)}
          options={NETWORK_OPTIONS}
        />
        <TextField
          label="Nome do perfil"
          required
          error={errors.profileName?.message}
          {...register('profileName')}
        />
        <TextField
          label="Endereço da carteira"
          required
          readOnly
          value={wallet?.address ?? ''}
          placeholder="Selecione uma carteira em “Carteira e rede”"
          hint="Definido pela carteira selecionada."
          inputClassName="text-text-secondary"
        />
        <TextField
          label="ENS ou carteira secundária (opcional)"
          readOnly
          value={wallet?.secondaryAddress ?? wallet?.ensName ?? ''}
          placeholder="ENS ou carteira secundária (opcional)"
          inputClassName="text-text-secondary"
        />
        <TextField
          label="Tipo de carteira"
          required
          readOnly
          value={wallet ? PROVIDER_LABELS[wallet.provider] : ''}
          placeholder="Selecione uma carteira"
          inputClassName="text-text-secondary"
        />
        <TextField
          label="Código de indicação"
          required
          error={errors.referralCode?.message}
          {...register('referralCode')}
        />
        <TextField
          label="E-mail"
          required
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Nome ENS"
          required
          error={errors.ensName?.message}
          trailing={
            <span className="pr-2 text-sm text-text-secondary">.eth</span>
          }
          {...register('ensName')}
        />
      </div>

      <label className="mt-6 inline-flex cursor-pointer items-center gap-2 text-[15px]">
        <input
          type="checkbox"
          checked={useSecondary}
          onChange={(e) => onUseSecondaryChange(e.target.checked)}
          disabled={!hasSecondary}
          className="size-4 accent-[var(--color-brand)]"
        />
        Usar outra carteira?
        {!hasSecondary && (
          <span className="text-xs text-text-secondary">
            (nenhuma carteira secundária cadastrada)
          </span>
        )}
      </label>

      <div className="mt-6 max-w-[350px]">
        <label htmlFor={noteId} className="mb-2 block text-[15px]">
          Observação do colecionador (opcional)
        </label>
        <textarea
          id={noteId}
          rows={6}
          maxLength={280}
          aria-describedby={errors.note ? `${noteId}-error` : undefined}
          className="w-full resize-y rounded-sm border border-line bg-transparent p-3 text-sm"
          {...register('note')}
        />
        {errors.note && (
          <p id={`${noteId}-error`} className="mt-1 text-xs text-destructive">
            {errors.note.message}
          </p>
        )}
      </div>
    </section>
  )
}
