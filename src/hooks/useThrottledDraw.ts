import { useRef, useCallback } from 'react'

export function useThrottledDraw(drawFn: () => void, delay: number = 16): () => void {
  const rafRef = useRef<number | null>(null)
  const lastCallRef = useRef<number>(0)
  const pendingRef = useRef<boolean>(false)

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
