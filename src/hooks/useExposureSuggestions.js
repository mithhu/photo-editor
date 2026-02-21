import { useState, useCallback } from 'react'
import { getExposureSuggestions } from '../utils/exposureSuggestions'

export function useExposureSuggestions(canvasRef) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)

  const analyze = useCallback(() => {
    const canvas = canvasRef?.current
    if (!canvas) return
    setLoading(true)
    requestAnimationFrame(() => {
      try {
        const results = getExposureSuggestions(canvas)
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
