import { useEffect } from 'react'
import { toast } from 'sonner'
import { notices } from '@/lib/notices'
import { Toaster } from '@/components/ui/sonner'

/**
 * Renders app notices as toasts. Sonner's region is `aria-live="polite"`, so
 * mutation results and realtime changes are announced to screen readers.
 */
export function NoticeCenter() {
  useEffect(
    () =>
      notices.subscribe((notice) => {
        const show =
          notice.tone === 'success'
            ? toast.success
            : notice.tone === 'error'
              ? toast.error
              : notice.tone === 'warning'
                ? toast.warning
                : toast.info
        show(notice.title, { id: notice.id, description: notice.description })
      }),
    [],
  )
  return (
    <Toaster
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          description: '!text-text-secondary',
          toast: '!font-mono',
        },
      }}
      containerAriaLabel="Notificações"
      offset={{ top: 80 }}
      mobileOffset={{ bottom: 96 }}
    />
  )
}
