import { ImageIcon } from 'lucide-react'
import { useId, useRef, useState, type ChangeEvent } from 'react'
import {
  AVATAR_MIME_TYPES,
  MAX_AVATAR_BYTES,
  type Profile,
} from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { notices } from '@/lib/notices'
import { useRemoveAvatar, useUpdateAvatar } from '@/queries/account'

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

/**
 * Avatar picker. Type and size are checked before upload (fast feedback);
 * the API validates again and its errors are shown the same way.
 */
export function AvatarField({ profile }: { profile: Profile }) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const update = useUpdateAvatar()
  const remove = useRemoveAvatar()
  const [error, setError] = useState<string | null>(null)
  const busy = update.isPending || remove.isPending

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError('Use uma imagem PNG, JPEG ou WebP.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('A imagem deve ter no máximo 512 KB.')
      return
    }
    update.mutate(await readAsDataUrl(file), {
      onSuccess: () =>
        notices.push({ tone: 'success', title: 'Avatar atualizado' }),
      onError: (err) =>
        setError(
          toApiError(err).fieldErrors.dataUrl?.[0] ?? toApiError(err).message,
        ),
    })
  }

  return (
    <div>
      <p id={`${inputId}-label`} className="mb-2 text-[15px]">
        Avatar
      </p>
      <div className="flex items-center gap-6">
        <span className="grid size-[50px] shrink-0 place-items-center overflow-hidden rounded-full border border-line-soft bg-surface-card">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Seu avatar atual"
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon
              className="size-6 text-brand-accent"
              aria-label="Sem avatar"
            />
          )}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={AVATAR_MIME_TYPES.join(',')}
          className="sr-only"
          onChange={(e) => void onFile(e)}
          aria-labelledby={`${inputId}-label`}
          aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
        />
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-[98px]"
        >
          {update.isPending ? 'Enviando…' : 'Alterar'}
        </Button>
        {profile.avatarUrl && (
          <button
            type="button"
            className="text-sm hover:text-brand-accent disabled:opacity-50"
            disabled={busy}
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () =>
                  notices.push({ tone: 'info', title: 'Avatar removido' }),
                onError: (err) => setError(toApiError(err).message),
              })
            }
          >
            Remover
          </button>
        )}
      </div>
      {error ? (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="mt-2 text-xs text-destructive"
        >
          {error}
        </p>
      ) : (
        <p id={`${inputId}-hint`} className="mt-2 text-xs text-text-secondary">
          PNG, JPEG ou WebP, até 512 KB.
        </p>
      )}
    </div>
  )
}
