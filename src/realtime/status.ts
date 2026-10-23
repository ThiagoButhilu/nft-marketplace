import { useSyncExternalStore } from 'react'

export type RealtimeStatus =
  'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline'

let status: RealtimeStatus = 'idle'
const listeners = new Set<() => void>()

export const realtimeStatus = {
  get: () => status,
  set(next: RealtimeStatus) {
    if (next === status) return
    status = next
    for (const listener of listeners) listener()
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function useRealtimeStatus() {
  return useSyncExternalStore(realtimeStatus.subscribe, realtimeStatus.get)
}
