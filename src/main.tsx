import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { openNetwork } from './lib/network-ready'
import { queryClient } from './lib/query-client'
import { installSessionLifecycle } from './lib/session-lifecycle'
import { router } from './router'
import '@fontsource-variable/roboto-mono'
import './index.css'

/** Mock backend started by src/mocks/entry.ts (a parallel entry in index.html). */
async function mocksReady() {
  await window.__kurioMocksReady
}

/**
 * socket.io-client captures `globalThis.WebSocket` when its module is
 * evaluated, so it must load only after MSW patched WebSocket. Never import
 * `./realtime/client` statically.
 */
async function startRealtime() {
  const { RealtimeClient } = await import('./realtime/client')
  new RealtimeClient(queryClient).start()
}

installSessionLifecycle(queryClient)

function mount() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

// Mount right after the browser has painted the inline app shell (one
// frame), so the shell is always the first paint even when the bundle loads
// instantly; layout and skeletons follow while the mock backend boots in
// parallel. Requests wait for `networkReady` (lib/network-ready).
requestAnimationFrame(() => setTimeout(mount, 0))

mocksReady()
  .catch((error: unknown) => {
    // Let requests through anyway so the UI surfaces errors instead of hanging.
    console.error('[mocks] failed to start', error)
  })
  .finally(() => {
    openNetwork()
    void startRealtime()
  })
