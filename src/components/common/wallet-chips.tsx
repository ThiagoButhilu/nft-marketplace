import { cn } from '@/lib/utils'

/** "METAMASK · WALLETCONNECT · COINBASE" chip from the Figma footer and checkout. */
export function WalletChips({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 rounded-sm border border-line-soft bg-surface-dark px-2.5 py-1 text-[9px] font-bold tracking-[0.1em] text-brand-accent',
        className,
      )}
    >
      <span>METAMASK</span>
      <span aria-hidden>·</span>
      <span>WALLETCONNECT</span>
      <span aria-hidden>·</span>
      <span>COINBASE</span>
    </p>
  )
}
