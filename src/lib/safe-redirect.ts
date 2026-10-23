/**
 * Only same-app paths are accepted as post-login destinations; anything
 * else (absolute URLs, protocol-relative `//host`) falls back to home, so
 * the `redirect` param cannot be used as an open redirect.
 */
export function safeRedirect(target: string | undefined, fallback = '/') {
  if (
    !target ||
    !target.startsWith('/') ||
    target.startsWith('//') ||
    target.startsWith('/\\')
  ) {
    return fallback
  }
  // Never bounce back into the auth screens.
  if (/^\/(login|signup)(\/|\?|$)/.test(target)) return fallback
  return target
}
