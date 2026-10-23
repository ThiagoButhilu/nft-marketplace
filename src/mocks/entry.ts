/**
 * Separate tiny entry (see index.html) that boots the mock backend as soon
 * as the HTML is parsed, in parallel with the main bundle download. The app
 * awaits `window.__kurioMocksReady` before sending any request.
 */
declare global {
  interface Window {
    __kurioMocksReady?: Promise<void>
  }
}

if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  window.__kurioMocksReady = import('./browser').then(({ startMocks }) =>
    startMocks(),
  )
}

export {}
