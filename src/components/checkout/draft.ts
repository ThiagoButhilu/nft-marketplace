import { z } from 'zod'
import { Network } from '@/api/contracts'

/**
 * Checkout draft: what the user typed and chose, kept per user in
 * sessionStorage (tab-scoped, no secrets) so an expired session or a refresh
 * does not lose the form. Logout and user switches delete it.
 */
export const CheckoutDraft = z.object({
  collector: z
    .object({
      displayName: z.string(),
      username: z.string(),
      profileName: z.string(),
      email: z.string(),
      ensName: z.string(),
      referralCode: z.string(),
      note: z.string().optional(),
    })
    .partial(),
  walletId: z.string().optional(),
  network: Network.optional(),
})
export type CheckoutDraft = z.infer<typeof CheckoutDraft>

const key = (userId: string) => `kurio.checkout-draft:${userId}`

export const checkoutDrafts = {
  load(userId: string): CheckoutDraft | null {
    try {
      const raw = sessionStorage.getItem(key(userId))
      const parsed = raw ? CheckoutDraft.safeParse(JSON.parse(raw)) : null
      return parsed?.success ? parsed.data : null
    } catch {
      return null
    }
  },
  save(userId: string, draft: CheckoutDraft) {
    try {
      sessionStorage.setItem(key(userId), JSON.stringify(draft))
    } catch {
      /* storage unavailable: the form simply won't survive a reload */
    }
  },
  clear(userId: string) {
    try {
      sessionStorage.removeItem(key(userId))
    } catch {
      /* ignore */
    }
  },
}
