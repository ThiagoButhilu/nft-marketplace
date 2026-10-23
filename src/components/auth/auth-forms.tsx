import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Email, Password, Username } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { applyServerErrors } from '@/components/form/server-errors'
import { PasswordField, TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { useLogin, useSignup } from '@/queries/session'

const LoginSchema = z.object({
  email: Email,
  password: z.string().min(1, 'Informe a senha'),
})
type LoginValues = z.infer<typeof LoginSchema>

const SignupSchema = z
  .object({
    username: Username,
    email: Email,
    password: Password,
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem',
  })
type SignupValues = z.infer<typeof SignupSchema>

interface AuthFormProps {
  onSuccess: () => void
  /** Larger fields and button on the mobile full-page layout. */
  variant: 'dialog' | 'page'
}

const fieldClass = (variant: AuthFormProps['variant']) =>
  variant === 'page'
    ? 'h-12 rounded-xl border-line-soft bg-ink'
    : 'border-line-soft'

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-sm border border-destructive/60 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  )
}

export function LoginForm({ onSuccess, variant }: AuthFormProps) {
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    mode: 'onTouched',
  })
  const { errors } = form.formState

  const submit = form.handleSubmit((values) => {
    setFormError(null)
    login.mutate(values, {
      onSuccess,
      onError: (error) =>
        setFormError(
          applyServerErrors(toApiError(error), form.setError, [
            'email',
            'password',
          ]),
        ),
    })
  })

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-3"
      aria-describedby={formError ? 'login-error' : undefined}
    >
      <div id="login-error">
        <FormError message={formError} />
      </div>
      <TextField
        label="E-mail"
        hideLabel
        type="email"
        autoComplete="email"
        placeholder="contato@email.com"
        required
        error={errors.email?.message}
        inputClassName={fieldClass(variant)}
        {...form.register('email')}
      />
      <PasswordField
        label="Senha"
        hideLabel
        autoComplete="current-password"
        placeholder="Senha"
        required
        error={errors.password?.message}
        inputClassName={fieldClass(variant)}
        {...form.register('password')}
      />
      <div className="text-right">
        <Link
          to="/em-breve"
          search={{ secao: 'senha' }}
          className="text-[13px] text-brand-accent hover:underline"
        >
          Esqueceu a senha?
        </Link>
      </div>
      <Button
        type="submit"
        disabled={login.isPending}
        className={
          variant === 'page'
            ? 'mt-6 h-[60px] w-full rounded-xl text-base'
            : 'mt-3 h-11 w-full text-base'
        }
      >
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}

export function SignupForm({ onSuccess, variant }: AuthFormProps) {
  const signup = useSignup()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<SignupValues>({
    resolver: zodResolver(SignupSchema),
    mode: 'onTouched',
  })
  const { errors } = form.formState

  const submit = form.handleSubmit(({ username, email, password }) => {
    setFormError(null)
    signup.mutate(
      { username, email, password },
      {
        onSuccess,
        onError: (error) =>
          setFormError(
            applyServerErrors(toApiError(error), form.setError, [
              'username',
              'email',
              'password',
            ]),
          ),
      },
    )
  })

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <FormError message={formError} />
      <TextField
        label="Nome de usuário"
        hideLabel
        autoComplete="username"
        placeholder="Nome de usuário"
        required
        error={errors.username?.message}
        inputClassName={fieldClass(variant)}
        {...form.register('username')}
      />
      <TextField
        label="E-mail"
        hideLabel
        type="email"
        autoComplete="email"
        placeholder="Digite seu e-mail"
        required
        error={errors.email?.message}
        inputClassName={fieldClass(variant)}
        {...form.register('email')}
      />
      <PasswordField
        label="Senha"
        hideLabel
        autoComplete="new-password"
        placeholder="Senha"
        required
        hint="Mínimo de 8 caracteres, com maiúscula, minúscula e número."
        error={errors.password?.message}
        inputClassName={fieldClass(variant)}
        {...form.register('password')}
      />
      <PasswordField
        label="Confirmar senha"
        hideLabel
        autoComplete="new-password"
        placeholder="Confirmar senha"
        required
        error={errors.confirmPassword?.message}
        inputClassName={fieldClass(variant)}
        {...form.register('confirmPassword')}
      />
      <Button
        type="submit"
        disabled={signup.isPending}
        className={
          variant === 'page'
            ? 'mt-6 h-[60px] w-full rounded-xl text-base'
            : 'mt-3 h-11 w-full text-base'
        }
      >
        {signup.isPending
          ? 'Criando…'
          : variant === 'page'
            ? 'Criar perfil'
            : 'Criar conta'}
      </Button>
    </form>
  )
}
