import { z } from 'zod'

/** Search params shared by /login and /signup. */
export const authSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  motivo: z.enum(['expirada']).optional().catch(undefined),
})
export type AuthSearch = z.infer<typeof authSearchSchema>
