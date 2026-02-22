import { useState, useCallback } from 'react'
import { detectFaces, computePortraitCrop } from '../utils/faceCrop'
import type { EditState } from '../types'

export function usePortraitCrop(
  imageSrc: string | null,
  onApplyChange: (updater: ((prev: EditState) => EditState) | Partial<EditState>) => void
): { handlePortraitCrop: () => Promise<void>; loading: boolean; error: string | null; faceCount: number | null } {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [faceCount, setFaceCount] = useState<number | null>(null)

  const handlePortraitCrop = useCallback(async () => {
    if (!imageSrc) return
    setLoading(true)
    setError(null)
    setFaceCount(null)
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = imageSrc
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
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
    } catch (err: any) {
      setError(err.message || 'Portrait crop failed')
    } finally {
      setLoading(false)
    }
  }, [imageSrc, onApplyChange])

  return { handlePortraitCrop, loading, error, faceCount }
}
