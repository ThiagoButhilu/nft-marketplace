// Mock control surface exposed by src/mocks/control.ts (typed loosely here
// so the e2e project does not depend on app source types).
interface Window {
  __kurioMock?: Record<string, (...args: unknown[]) => unknown>
}
