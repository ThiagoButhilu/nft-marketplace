import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Email, Password, Username, type Profile } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { AccountLayout } from '@/components/account/account-layout'
import {
  AccountError,
  AccountSkeleton,
} from '@/components/account/account-states'
import { AvatarField } from '@/components/account/avatar-field'
import { EnsField } from '@/components/account/ens-field'
import { applyServerErrors } from '@/components/form/server-errors'
import { PasswordField, TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { notices } from '@/lib/notices'
import {
  useChangePassword,
  useProfile,
  useUpdateProfile,
} from '@/queries/account'

export const Route = createFileRoute('/_auth/account/profile')({
  component: ProfilePage,
})

const ProfileForm = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'Informe o nome de exibição')
      .max(48, 'Máximo de 48 caracteres'),
    username: Username,
    email: Email,
    ensName: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{3,}$/i, 'Use letras, números ou hífen (mín. 3)'),
    walletNickname: z
      .string()
      .trim()
      .min(2, 'Informe o apelido da carteira')
      .max(32, 'Máximo de 32 caracteres'),
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  // Password fields are optional as a group: validated only when touched.
  .superRefine((values, ctx) => {
    const changing =
      values.currentPassword || values.newPassword || values.confirmPassword
    if (!changing) return
    if (!values.currentPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['currentPassword'],
        message: 'Informe a senha atual',
      })
    }
    const strength = Password.safeParse(values.newPassword)
    if (!strength.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: strength.error.issues[0].message,
      })
    }
    if (values.newPassword !== values.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'As senhas não coincidem',
      })
    }
  })
type ProfileFormValues = z.infer<typeof ProfileForm>

const toFormValues = (profile: Profile): ProfileFormValues => ({
  displayName: profile.displayName,
  username: profile.username,
  email: profile.email,
  ensName: profile.ensName ?? '',
  walletNickname: profile.walletNickname ?? '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

function ProfilePage() {
  const profile = useProfile()
  return (
    <AccountLayout title="Perfil do colecionador">
      {profile.isPending ? (
        <AccountSkeleton />
      ) : profile.isError ? (
        <AccountError
          error={toApiError(profile.error)}
          onRetry={() => void profile.refetch()}
        />
      ) : (
        <ProfileEditor profile={profile.data} />
      )}
    </AccountLayout>
  )
}

function ProfileEditor({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileForm),
    mode: 'onTouched',
    defaultValues: toFormValues(profile),
  })
  // Reading isDirty during render subscribes to it (RHF formState is a proxy).
  const { errors, isDirty } = form.formState

  // Server-side changes (e.g. another tab) refresh untouched forms.
  useEffect(() => {
    if (!form.formState.isDirty) form.reset(toFormValues(profile))
  }, [profile, form])

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    if (!isDirty) {
      notices.push({ tone: 'info', title: 'Nenhuma alteração para salvar' })
      return
    }
    const { currentPassword, newPassword } = values
    let profileSaved = false
    try {
      const saved = await updateProfile.mutateAsync({
        displayName: values.displayName,
        username: values.username,
        email: values.email,
        ensName: values.ensName,
        walletNickname: values.walletNickname,
      })
      profileSaved = true
      if (newPassword) {
        await changePassword.mutateAsync({ currentPassword, newPassword })
      }
      form.reset(toFormValues(saved))
      notices.push({
        tone: 'success',
        title: newPassword ? 'Perfil e senha atualizados' : 'Perfil atualizado',
      })
    } catch (error) {
      const apiError = toApiError(error)
      const message = applyServerErrors(apiError, form.setError, [
        'displayName',
        'username',
        'email',
        'ensName',
        'walletNickname',
        'currentPassword',
        'newPassword',
      ])
      setFormError(message)
      // The two requests are independent: say which part went through.
      if (profileSaved) {
        notices.push({
          tone: 'warning',
          title: 'Dados salvos; a senha não foi alterada',
          description: apiError.message,
        })
      }
    }
  })

  const saving = updateProfile.isPending || changePassword.isPending

  return (
    <div className="mt-8 space-y-10">
      <form
        onSubmit={(e) => void submit(e)}
        noValidate
        aria-describedby={formError ? 'profile-error' : undefined}
      >
        {formError && (
          <p
            id="profile-error"
            role="alert"
            className="mb-6 rounded-sm border border-destructive/60 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </p>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-7 gap-y-6 md:grid-cols-2">
          <TextField
            label="Nome de exibição"
            required
            autoComplete="name"
            error={errors.displayName?.message}
            {...form.register('displayName')}
          />
          <TextField
            label="Nome de usuário"
            required
            autoComplete="username"
            error={errors.username?.message}
            {...form.register('username')}
          />
          <TextField
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
          <TextField
            label="Apelido da carteira"
            required
            error={errors.walletNickname?.message}
            {...form.register('walletNickname')}
          />
          <AvatarField profile={profile} />
        </div>

        <fieldset className="mt-10 max-w-[417px] space-y-5">
          <legend className="mb-5 text-base font-bold">Alterar senha</legend>
          <PasswordField
            label="Senha atual"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...form.register('currentPassword')}
          />
          <PasswordField
            label="Nova senha"
            autoComplete="new-password"
            hint="Mínimo de 8 caracteres, com maiúscula, minúscula e número."
            error={errors.newPassword?.message}
            {...form.register('newPassword')}
          />
          <PasswordField
            label="Confirmar nova senha"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...form.register('confirmPassword')}
          />
        </fieldset>

        <Button type="submit" className="mt-8 w-[131px]" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </form>
    </div>
  )
}
