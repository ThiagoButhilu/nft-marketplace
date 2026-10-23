/**
 * Minimal stand-in for `tough-cookie`, aliased only in the browser build
 * (vite.config.ts).
 *
 * MSW uses tough-cookie (plus `tldts`, its public-suffix list) solely to
 * expose `request.cookies` to handlers and to persist `Set-Cookie` from mocked
 * responses. This API authenticates with the Authorization header and never
 * reads or sets cookies, so that machinery is dead weight: ~37% of the mock
 * chunk. The stub implements exactly the surface MSW's CookieStore calls.
 */

export class Cookie {
  domain: string | null = null
  path: string | null = null
  key = ''

  static fromJSON(): Cookie | null {
    return null
  }

  toJSON() {
    return {}
  }
}

export class MemoryCookieStore {
  idx: Record<string, Record<string, Record<string, Cookie>>> = {}
}

export class CookieJar {
  constructor(_store?: MemoryCookieStore) {}

  getCookiesSync(_url: string): Cookie[] {
    return []
  }

  async setCookie(_cookie: string, _url: string): Promise<void> {}
}
