import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

const MOCK_BOOT = 'src/mocks/entry.ts'

/**
 * Boots the mock backend from its own entry, injected first in <head>. It is
 * tiny, so it runs while the main bundle is still downloading: the service
 * worker registers in parallel instead of after the app code executes.
 */
function mockBootEntry(): Plugin {
  return {
    name: 'kurio:mock-boot-entry',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const src = ctx.bundle
          ? Object.values(ctx.bundle).find((item) => item.type === 'chunk' && item.isEntry && item.name === 'mock-boot')
              ?.fileName
          : MOCK_BOOT
        return src ? [{ tag: 'script', attrs: { type: 'module', crossorigin: '', src: `/${src}` }, injectTo: 'head-prepend' }] : []
      },
    },
  }
}

/**
 * The app stylesheet must not delay the first paint: the inline app shell
 * (index.html) carries its own critical styles, and the CSS (15 KB) always
 * arrives long before the JS bundle that renders styled content.
 */
function nonBlockingStylesheet(): Plugin {
  return {
    name: 'kurio:non-blocking-css',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) =>
        html.replace(
          /<link rel="stylesheet" crossorigin href="([^"]+)">/,
          (_tag, href: string) =>
            `<link rel="preload" as="style" crossorigin href="${href}">` +
            `<link rel="stylesheet" crossorigin href="${href}" media="print" onload="this.media='all'">` +
            `<noscript><link rel="stylesheet" crossorigin href="${href}"></noscript>`,
        ),
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must run before the React plugin so generated route files are picked up.
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      // The landing route stays in the main bundle: splitting it would add a
      // round trip (main → route chunk → its imports) before the first paint
      // of real content. Every other route is split.
      codeSplittingOptions: {
        splitBehavior: ({ routeId }) => (routeId === '/' ? [] : undefined),
      },
    }),
    react(),
    tailwindcss(),
    mockBootEntry(),
    nonBlockingStylesheet(),
  ],
  define: {
    // Vercel sets VERCEL=1 in its builds, the only place /_vercel/insights
    // exists. Local, E2E and Lighthouse builds compile analytics out.
    __VERCEL_ANALYTICS__: JSON.stringify(process.env.VERCEL === '1'),
  },
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        'mock-boot': path.resolve(__dirname, MOCK_BOOT),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // MSW's cookie store is unused by this API (see the stub for details).
      'tough-cookie': path.resolve(__dirname, './src/mocks/tough-cookie-stub.ts'),
    },
  },
})
