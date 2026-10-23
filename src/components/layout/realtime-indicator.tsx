import { useRealtimeStatus } from '@/realtime/status'

/** Visible only when live updates are interrupted. */
export function RealtimeIndicator() {
  const status = useRealtimeStatus()
  const message =
    status === 'reconnecting'
      ? 'Reconectando…'
      : status === 'offline'
        ? 'Sem atualizações ao vivo'
        : null

  return (
    <span role="status" className="text-xs text-text-secondary">
      {message && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line-soft px-2 py-1">
          <span
            aria-hidden
            className="size-1.5 animate-pulse rounded-full bg-brand-accent"
          />
          {message}
        </span>
      )}
    </span>
  )
}
