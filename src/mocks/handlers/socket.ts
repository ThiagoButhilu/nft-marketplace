import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { SOCKET_PATH, type ServerEvent } from '@/api/contracts'
import { scenario } from '../scenarios'
import { findValidSession } from '../server/accounts'
import { store } from '../server/store'

/**
 * Socket.IO server mock on top of MSW's WebSocket interception.
 *
 * Binding limitations handled here (see ARCHITECTURE.md):
 * - the binding fakes the handshake and ignores the CONNECT auth payload,
 *   so the client sends its session token in the connection query string;
 * - it never pings, so we send engine.io heartbeats ourselves, otherwise
 *   socket.io-client drops the connection after pingInterval + pingTimeout;
 * - only the WebSocket transport is intercepted (no HTTP long-polling).
 */

const HEARTBEAT_MS = 20_000
const REPLAY_BUFFER = 20

interface ConnectedClient {
  userId: string | null
  token: string | null
  emit: (event: ServerEvent) => void
  close: () => void
}

const clients = new Set<ConnectedClient>()
const recentEvents: ServerEvent[] = []

const socketLink = ws.link(`*${SOCKET_PATH}`)

function canReceive(client: ConnectedClient, event: ServerEvent) {
  if (event.type === 'nft.updated') return true
  // Private events only reach the owner, and only while the session is valid.
  return (
    client.userId === event.userId &&
    findValidSession(client.token)?.userId === event.userId
  )
}

function deliver(event: ServerEvent) {
  for (const client of clients)
    if (canReceive(client, event)) client.emit(event)
}

store.events.on((event) => {
  recentEvents.push(event)
  if (recentEvents.length > REPLAY_BUFFER) recentEvents.shift()
  deliver(event)
})

// After a reset (or a state change from another tab) every client must
// reconcile with REST, so drop the connections and let them reconnect.
store.replaced.on(() => dropConnections())

export const socketHandlers = [
  socketLink.addEventListener('connection', (connection) => {
    const { client } = connection
    if (scenario.config.offline) {
      // Emulate an unreachable server the way browsers report it: an `error`
      // event, then the close. A bare clean close during the handshake is not
      // treated as a failure by socket.io-client, which would then wait
      // forever instead of retrying with backoff.
      const socket = (client as unknown as { socket: EventTarget }).socket
      socket.dispatchEvent(new Event('error'))
      client.close(4000, 'offline')
      return
    }

    const token = new URL(client.url).searchParams.get('token')
    const session = findValidSession(token)
    const io = toSocketIo(connection)

    const entry: ConnectedClient = {
      userId: session?.userId ?? null,
      token: session ? token : null,
      emit: (event) => io.client.emit(event.type, event),
      close: () => client.close(),
    }
    clients.add(entry)

    // engine.io v4 ping ("2"); the client answers with a pong ("3").
    const heartbeat = setInterval(() => client.send('2'), HEARTBEAT_MS)
    client.addEventListener('close', () => {
      clearInterval(heartbeat)
      clients.delete(entry)
    })
  }),
]

/** Mock control: closes every socket (clients reconnect on their own). */
export function dropConnections() {
  for (const client of [...clients]) client.close()
}

/** Mock control: re-sends an already published event (duplicate delivery). */
export function replayEvent(index = -1) {
  const event = recentEvents.at(index)
  if (event) deliver(event)
  return event ?? null
}

/** Mock control: delivers an arbitrary event, e.g. a stale version. */
export function deliverRawEvent(event: ServerEvent) {
  deliver(event)
}

export function recentServerEvents() {
  return [...recentEvents]
}

export function connectedClients() {
  return [...clients].map(({ userId }) => ({ userId }))
}
