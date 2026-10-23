import type { User } from '@/api/contracts'
import { cn } from '@/lib/utils'

export function UserAvatar({
  user,
  className,
}: {
  user: Pick<User, 'displayName' | 'avatarUrl'>
  className?: string
}) {
  const initial = user.displayName.trim().charAt(0).toUpperCase() || '?'
  return user.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt=""
      className={cn('rounded-full object-cover', className)}
    />
  ) : (
    // Initial drawn with CSS (not a text node): it never leaks into the
    // accessible name or the visible-label comparison of the parent link.
    <span
      aria-hidden
      data-initial={initial}
      className={cn(
        'grid place-items-center rounded-full bg-surface-dark text-sm font-bold text-brand-accent before:content-[attr(data-initial)]',
        className,
      )}
    />
  )
}
