function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}

export function randomToken(bytes = 24) {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer)
}

/** Salted SHA-256. Good enough for a mock: passwords are never stored in clear. */
export async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  return toHex(await crypto.subtle.digest('SHA-256', data))
}

export async function verifyPassword(
  password: string,
  salt: string,
  hash: string,
) {
  return (await hashPassword(password, salt)) === hash
}

/** Stable hash of a JSON-serialisable value (key order independent). */
export function fingerprint(value: unknown): string {
  const stable = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(stable)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v as object)
              .sort()
              .map((k) => [k, stable((v as Record<string, unknown>)[k])]),
          )
        : v
  const text = JSON.stringify(stable(value))
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return `${hash.toString(16)}:${text.length}`
}

/** Deterministic pseudo-random generator (mulberry32). */
export function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
