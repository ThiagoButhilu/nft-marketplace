/**
 * App-wide notices (toasts + aria-live announcements) raised outside React,
 * e.g. by the realtime client. The UI layer subscribes and renders them.
 */
export type NoticeTone = 'info' | 'success' | 'warning' | 'error'

export interface Notice {
  id: string
  tone: NoticeTone
  title: string
  description?: string
}

type Listener = (notice: Notice) => void
const listeners = new Set<Listener>()
let seq = 0

export const notices = {
  push(notice: Omit<Notice, 'id'>) {
    const full = { ...notice, id: `notice-${++seq}` }
    for (const listener of listeners) listener(full)
    return full.id
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
