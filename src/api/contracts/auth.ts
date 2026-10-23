import { z } from 'zod'
import { IsoDateTime } from './common'

export const PASSWORD_RULES =
  'Mínimo de 8 caracteres, com letra maiúscula, minúscula e número'

export const Password = z
  .string()
  .min(8, PASSWORD_RULES)
  .max(72)
  .regex(/[a-z]/, PASSWORD_RULES)
  .regex(/[A-Z]/, PASSWORD_RULES)
  .regex(/\d/, PASSWORD_RULES)

export const Username = z
  .string()
  .trim()
  .min(3, 'Mínimo de 3 caracteres')
  .max(24, 'Máximo de 24 caracteres')
  .regex(/^[a-z0-9_.]+$/i, 'Use letras, números, ponto ou sublinhado')

export const Email = z.email('E-mail inválido').trim().toLowerCase()

export const User = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof User>

export const Session = z.object({
  token: z.string(),
  expiresAt: IsoDateTime,
  user: User,
})
export type Session = z.infer<typeof Session>

export const LoginRequest = z.object({
  email: Email,
  password: z.string().min(1, 'Informe a senha'),
  /** Visitor cart to merge into the user's cart. */
  guestCartId: z.string().optional(),
})
export type LoginRequest = z.infer<typeof LoginRequest>

export const SignupRequest = z.object({
  username: Username,
  email: Email,
  password: Password,
  guestCartId: z.string().optional(),
})
export type SignupRequest = z.infer<typeof SignupRequest>
