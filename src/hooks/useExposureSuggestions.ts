import { useState, useCallback, RefObject } from 'react'
import { getExposureSuggestions, type ExposureSuggestion } from '../utils/exposureSuggestions'

export function useExposureSuggestions(canvasRef: RefObject<HTMLCanvasElement | null>): {
  suggestions: ExposureSuggestion[]
  loading: boolean
  analyze: () => void
  clear: () => void
} {
  const [suggestions, setSuggestions] = useState<ExposureSuggestion[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  const analyze = useCallback(() => {
    const canvas = canvasRef?.current
    if (!canvas) return
    setLoading(true)
    requestAnimationFrame(() => {
      try {
        const results: ExposureSuggestion[] = getExposureSuggestions(canvas)
        setSuggestions(results)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    })
  }, [canvasRef])

  const clear = useCallback(() => setSuggestions([]), [])

  return { suggestions, loading, analyze, clear }
}
