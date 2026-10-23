import { Lock } from 'lucide-react'
import type { ApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'

export function AccountSkeleton() {
  return (
    <div
      aria-hidden
      className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-x-7 gap-y-6 md:grid-cols-2"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton h-[66px] rounded-sm" />
      ))}
    </div>
  )
}

/** 403 gets its own copy; everything else offers a retry. */
export function AccountError({
  error,
  onRetry,
}: {
  error: ApiError
  onRetry: () => void
}) {
  const forbidden = error.code === 'FORBIDDEN'
  return (
    <div
      role="alert"
      className="mt-8 flex flex-col items-start gap-3 rounded-sm border border-destructive/50 p-6"
    >
      {forbidden && <Lock className="size-8 text-brand-accent" aria-hidden />}
      <p className="font-bold">
        {forbidden
          ? 'Você não tem permissão para acessar estes dados'
          : 'Não foi possível carregar seus dados'}
      </p>
      <p className="text-sm text-text-secondary">{error.message}</p>
      <Button onClick={onRetry}>Tentar novamente</Button>
    </div>
  )
}
