import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from './lib/query-client'
import { installSessionLifecycle } from './lib/session-lifecycle'
import { router } from './router'
import '@fontsource-variable/roboto-mono'
import './index.css'

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const { startMocks } = await import('./mocks/browser')
  await startMocks()
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

async function bootstrap() {
  try {
    await enableMocking()
  } catch (error) {
    // Render anyway so the UI can surface request errors instead of a blank page.
    console.error('[mocks] failed to start', error)
  }
  installSessionLifecycle(queryClient)
  void startRealtime()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
