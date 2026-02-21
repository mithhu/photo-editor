import { useRef, useCallback } from 'react'

export function useThrottledDraw(drawFn, delay = 16) {
  const rafRef = useRef(null)
  const lastCallRef = useRef(0)
  const pendingRef = useRef(false)

  const throttledDraw = useCallback(() => {
    const now = performance.now()
    const elapsed = now - lastCallRef.current

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    if (elapsed >= delay) {
      lastCallRef.current = now
      drawFn()
    } else {
      pendingRef.current = true
      rafRef.current = requestAnimationFrame(() => {
        lastCallRef.current = performance.now()
        pendingRef.current = false
        drawFn()
      })
    }
  }, [drawFn, delay])

  return throttledDraw
}
