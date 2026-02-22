import { useState, useEffect, useRef } from 'react'
import { generateFilterPreviews } from '../utils/filterPreviews'

export function useFilterPreviews(imageSrc: string | null): { previews: Record<string, string>; loading: boolean } {
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<boolean>(false)
  const prevSrcRef = useRef<string | null>(null)

  useEffect(() => {
    if (!imageSrc) return

    let cancelled = false
    prevSrcRef.current = imageSrc

    requestAnimationFrame(() => {
      if (cancelled) return
      setLoading(true)
      generateFilterPreviews(imageSrc)
        .then((result: Record<string, string>) => {
          if (!cancelled) {
            setPreviews(result)
            setLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false)
        })
    })

    return () => { cancelled = true }
  }, [imageSrc])

  return { previews, loading }
}
