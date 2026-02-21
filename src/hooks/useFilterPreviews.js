import { useState, useEffect, useRef } from 'react'
import { generateFilterPreviews } from '../utils/filterPreviews'

export function useFilterPreviews(imageSrc) {
  const [previews, setPreviews] = useState({})
  const [loading, setLoading] = useState(false)
  const prevSrcRef = useRef(null)

  useEffect(() => {
    if (!imageSrc) return

    let cancelled = false
    prevSrcRef.current = imageSrc

    requestAnimationFrame(() => {
      if (cancelled) return
      setLoading(true)
      generateFilterPreviews(imageSrc)
        .then((result) => {
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
