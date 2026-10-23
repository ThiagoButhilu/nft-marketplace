import { setupWorker } from 'msw/browser'
import { createMockControl } from './control'
import { restHandlers } from './handlers/rest'
import { socketHandlers } from './handlers/socket'
import { syncLiveMarket } from './live-market'
import { scenario } from './scenarios'
import { resumePendingOrders } from './server/orders'
import { store } from './server/store'

export const worker = setupWorker(...restHandlers, ...socketHandlers)

/**
 * Boots the mock backend: restores persisted state, re-arms pending orders,
 * applies `?mock-reset` and starts intercepting REST and Socket.IO traffic.
 */
export async function startMocks() {
  await store.ready

  const url = new URL(window.location.href)
  if (url.searchParams.has('mock-reset')) {
    await store.reset()
    url.searchParams.delete('mock-reset')
    window.history.replaceState(window.history.state, '', url)
  }

  resumePendingOrders()
  store.replaced.on(resumePendingOrders)
  syncLiveMarket()
  scenario.onChange(syncLiveMarket)

  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  // Published last: its presence means requests are already intercepted.
  window.__kurioMock = createMockControl()
}
