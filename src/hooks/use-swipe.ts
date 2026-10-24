import { useRef, type MouseEvent, type PointerEvent } from 'react'

/** Horizontal travel (px) a touch must cover to count as a swipe. */
const MIN_DISTANCE = 40

/**
 * Touch swipe for a carousel: left goes to the next slide, right to the
 * previous one, wrapping around. Spread the handlers on the swipe area and give
 * it `touch-pan-y`, so vertical scrolling stays native and the browser leaves
 * horizontal gestures to us. Mouse input is ignored (the dots handle it), and
 * the click that ends a swipe is swallowed so a slide link doesn't open.
 */
export function useSwipe(onSwipe: (direction: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)

  return {
    onPointerDown(event: PointerEvent) {
      if (event.pointerType === 'mouse') return
      start.current = { x: event.clientX, y: event.clientY }
      swiped.current = false
    },
    onPointerUp(event: PointerEvent) {
      const origin = start.current
      start.current = null
      if (!origin) return
      const dx = event.clientX - origin.x
      const dy = event.clientY - origin.y
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy)) return
      swiped.current = true
      onSwipe(dx < 0 ? 1 : -1)
    },
    // The browser took over (a vertical scroll): not a swipe.
    onPointerCancel() {
      start.current = null
    },
    onClickCapture(event: MouseEvent) {
      if (!swiped.current) return
      swiped.current = false
      event.preventDefault()
      event.stopPropagation()
    },
  }
}
