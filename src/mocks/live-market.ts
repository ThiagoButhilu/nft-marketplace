import { scenario } from './scenarios'
import { getNftRecord, updateNft } from './server/catalog'
import { eth, toEth } from './server/money'
import { store } from './server/store'

/**
 * "live-market" scenario: nudges the price of items sitting in carts at a
 * fixed interval, publishing `nft.updated` like a real market would.
 */
let timer: ReturnType<typeof setInterval> | null = null
let tick = 0

function step() {
  const inCarts = [
    ...new Set(
      Object.values(store.db.carts).flatMap((c) => c.lines.map((l) => l.nftId)),
    ),
  ]
  if (!inCarts.length) return
  const nft = getNftRecord(inCarts[tick % inCarts.length])
  // Alternates up and down so prices stay in a sane range.
  const delta = tick % 2 === 0 ? '0.02' : '-0.01'
  tick += 1
  const next = eth(nft.price).plus(delta)
  if (next.gt(0)) updateNft(nft.id, { price: toEth(next) })
}

export function syncLiveMarket() {
  if (timer) clearInterval(timer)
  timer = null
  tick = 0
  const interval = scenario.config.liveMarketIntervalMs
  if (interval) timer = setInterval(step, interval)
}

/** Mock control: run one market tick now. */
export const liveMarketTick = step
