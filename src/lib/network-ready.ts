/**
 * Gate for outgoing traffic while the mock backend boots.
 *
 * The UI renders right away (layout and skeletons paint immediately) and the
 * MSW worker starts in parallel; API requests and the socket wait on this
 * promise so none of them escapes to the real network before interception
 * is active. Without mocks it resolves at once.
 */
let markReady!: () => void

export const networkReady = new Promise<void>((resolve) => {
  markReady = resolve
})

export function openNetwork() {
  markReady()
}
