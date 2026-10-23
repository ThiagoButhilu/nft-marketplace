import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Network,
  WalletProvider,
  type Wallet,
  type WalletInput,
  type WalletRole,
} from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { NETWORK_LABELS } from '@/components/catalog/search'
import { PROVIDER_LABELS } from '@/components/checkout/labels'
import { applyServerErrors } from '@/components/form/server-errors'
import { SelectField } from '@/components/form/select-field'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { notices } from '@/lib/notices'
import { useSaveWallet } from '@/queries/account'
import { EnsField } from './ens-field'
import {
  EMPTY_WALLET_FORM,
  WalletFormSchema,
  walletToForm,
  type WalletFormValues,
} from './wallet-form-schema'

const NETWORK_OPTIONS = Network.options.map((value) => ({
  value,
  label: NETWORK_LABELS[value],
}))
const PROVIDER_OPTIONS = WalletProvider.options.map((value) => ({
  value,
  label: PROVIDER_LABELS[value],
}))

const FIELDS = Object.keys(EMPTY_WALLET_FORM) as Array<keyof WalletFormValues>

/** Create or edit one wallet (Figma "Carteira principal" layout). */
export function WalletForm({
  role,
  wallet,
  initialValues,
  onSaved,
}: {
  role: WalletRole
  wallet?: Wallet
  /** Prefill for a new wallet (e.g. "Igual à carteira principal"). */
  initialValues?: Partial<WalletFormValues>
  onSaved?: (wallet: Wallet) => void
}) {
  const save = useSaveWallet()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<WalletFormValues>({
    resolver: zodResolver(WalletFormSchema),
    mode: 'onTouched',
    defaultValues: wallet
      ? walletToForm(wallet)
      : { ...EMPTY_WALLET_FORM, ...initialValues },
  })
  // Reading isDirty during render subscribes to it (RHF formState is a proxy).
  const { errors, isDirty } = form.formState

  // Copying from the primary wallet after the form mounted.
  useEffect(() => {
    if (!wallet && initialValues)
      form.reset(
        { ...EMPTY_WALLET_FORM, ...initialValues },
        { keepDefaultValues: false },
      )
  }, [initialValues, wallet, form])

  const submit = form.handleSubmit((values) => {
    setFormError(null)
    if (wallet && !isDirty) {
      notices.push({ tone: 'info', title: 'Nenhuma alteração para salvar' })
      return
    }
    const input: WalletInput = {
      ...values,
      role,
      network: values.network as WalletInput['network'],
      provider: values.provider as WalletInput['provider'],
      secondaryAddress: values.secondaryAddress || null,
      ensName: values.ensName,
    }
    save.mutate(
      { id: wallet?.id, input },
      {
        onSuccess: (saved) => {
          form.reset(walletToForm(saved))
          notices.push({
            tone: 'success',
            title: `${role === 'primary' ? 'Carteira principal' : 'Carteira secundária'} ${wallet ? 'atualizada' : 'cadastrada'}`,
          })
          onSaved?.(saved)
        },
        onError: (error) =>
          setFormError(
            applyServerErrors(toApiError(error), form.setError, FIELDS),
          ),
      },
    )
  })

  const prefix = role === 'primary' ? 'primary' : 'secondary'
  return (
    <form
      onSubmit={(e) => void submit(e)}
      noValidate
      aria-label={
        role === 'primary' ? 'Carteira principal' : 'Carteira secundária'
      }
    >
      {formError && (
        <p
          role="alert"
          className="mb-5 rounded-sm border border-destructive/60 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-7 gap-y-5 md:grid-cols-2">
        <TextField
          id={`${prefix}-displayName`}
          label="Nome de exibição"
          required
          error={errors.displayName?.message}
          {...form.register('displayName')}
        />
        <TextField
          id={`${prefix}-label`}
          label="Apelido da carteira"
          required
          error={errors.label?.message}
          {...form.register('label')}
        />
        <SelectField
          id={`${prefix}-network`}
          label="Rede"
          required
          placeholder="Selecione uma rede"
          options={NETWORK_OPTIONS}
          error={errors.network?.message}
          {...form.register('network')}
        />
        <TextField
          id={`${prefix}-profileName`}
          label="Nome do perfil"
          required
          error={errors.profileName?.message}
          {...form.register('profileName')}
        />
        <TextField
          id={`${prefix}-address`}
          label="Endereço da carteira"
          required
          placeholder="Endereço 0x da carteira"
          autoComplete="off"
          spellCheck={false}
          error={errors.address?.message}
          {...form.register('address')}
        />
        <TextField
          id={`${prefix}-secondaryAddress`}
          label="ENS ou carteira secundária (opcional)"
          placeholder="ENS ou carteira secundária (opcional)"
          autoComplete="off"
          spellCheck={false}
          error={errors.secondaryAddress?.message}
          {...form.register('secondaryAddress')}
        />
        <SelectField
          id={`${prefix}-provider`}
          label="Tipo de carteira"
          required
          placeholder="Selecione uma carteira"
          options={PROVIDER_OPTIONS}
          error={errors.provider?.message}
          {...form.register('provider')}
        />
        <TextField
          id={`${prefix}-referralCode`}
          label="Código de indicação"
          required
          error={errors.referralCode?.message}
          {...form.register('referralCode')}
        />
        <TextField
          id={`${prefix}-email`}
          label="E-mail"
          required
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <EnsField
          required
          error={errors.ensName?.message}
          {...form.register('ensName')}
        />
      </div>
      <Button type="submit" className="mt-8 px-3" disabled={save.isPending}>
        {save.isPending ? 'Salvando…' : 'Salvar carteira'}
      </Button>
    </form>
  )
}
