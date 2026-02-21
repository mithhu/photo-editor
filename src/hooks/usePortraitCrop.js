import { useState, useCallback } from 'react'
import { detectFaces, computePortraitCrop } from '../utils/faceCrop'

/**
 * Hook for face-detection portrait crop.
 * @param {string} imageSrc - Current image source
 * @param {function} onApplyChange - (fn) => void, receives state updater
 * @returns {{ handlePortraitCrop: () => Promise<void>, loading: boolean, error: string | null, faceCount: number | null }}
 */
export function usePortraitCrop(imageSrc, onApplyChange) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [faceCount, setFaceCount] = useState(null)

  const handlePortraitCrop = useCallback(async () => {
    if (!imageSrc) return
    setLoading(true)
    setError(null)
    setFaceCount(null)
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = imageSrc
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = () => reject(new Error('Failed to load image'))
      })
      const faces = await detectFaces(img)
      if (faces.length === 0) {
        setError('No faces detected')
        return
      }
      setFaceCount(faces.length)
      const crop = computePortraitCrop(faces, img.naturalWidth, img.naturalHeight)
      if (crop) {
        onApplyChange((s) => ({ ...s, customCrop: crop, cropRatio: 'custom' }))
      }
    } catch (err) {
      setError(err.message || 'Portrait crop failed')
    } finally {
      setLoading(false)
    }
  }, [imageSrc, onApplyChange])

  return { handlePortraitCrop, loading, error, faceCount }
}
