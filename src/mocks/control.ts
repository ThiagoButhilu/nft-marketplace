import type { ServerEvent } from '@/api/contracts'
import {
  connectedClients,
  deliverRawEvent,
  dropConnections,
  recentServerEvents,
  replayEvent,
} from './handlers/socket'
import { liveMarketTick } from './live-market'
import {
  SCENARIOS,
  scenario,
  type ScenarioConfig,
  type ScenarioName,
} from './scenarios'
import { expireSessions } from './server/accounts'
import { updateNft } from './server/catalog'
import { settlePendingOrders } from './server/orders'
import { store } from './server/store'

/**
 * Control surface of the mock server, exposed as `window.__kurioMock`.
 * Used by Playwright and the dev scenario panel to drive the *server* side;
 * everything still reaches the app through REST (MSW) and Socket.IO.
 */
export function createMockControl() {
  return {
    scenarios: Object.fromEntries(
      Object.entries(SCENARIOS).map(([name, config]) => [
        name,
        config.description,
      ]),
    ) as Record<ScenarioName, string>,
    getScenario: () => ({ name: scenario.name, config: scenario.config }),
    setScenario: (name: ScenarioName, overrides?: Partial<ScenarioConfig>) =>
      scenario.set(name, overrides),
    /** Restores the seeded data and the current scenario's counters. */
    reset: async () => {
      await store.reset()
      scenario.set(scenario.name)
    },
    expireSessions,
    updateNft,
    settlePendingOrders,
    liveMarketTick,
    dropConnections,
    replayEvent,
    deliverRawEvent: (event: ServerEvent) => deliverRawEvent(event),
    recentEvents: recentServerEvents,
    connectedClients,
  }
}

export type MockControl = ReturnType<typeof createMockControl>

declare global {
  interface Window {
    __kurioMock?: MockControl
  }
}
