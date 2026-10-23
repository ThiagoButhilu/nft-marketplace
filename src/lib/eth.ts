import Big from 'big.js'

/**
 * Display helpers for ETH decimal strings. Calculations happen on the server;
 * the client only formats and compares the values it receives.
 */

/** "1.2" → "1.20", "26.846" → "26.846" (at least two decimals, never rounds). */
export function formatEthAmount(value: string) {
  const amount = new Big(value)
  const decimals = Math.max(
    2,
    (value.split('.')[1] ?? '').replace(/0+$/, '').length,
  )
  return amount.toFixed(decimals)
}

export function formatEth(value: string) {
  return `${formatEthAmount(value)} ETH`
}

export function compareEth(a: string, b: string) {
  return new Big(a).cmp(b)
}
