import { useCallback, useEffect, useRef } from 'react'

const STORAGE_KEY = 'photosai-project'
const AUTO_SAVE_INTERVAL = 10000

export function useProjectSave(imageSrc, editState, setEditState, setImageSrc) {
  const autoSaveRef = useRef(null)

  const save = useCallback(() => {
    if (!imageSrc) return
    try {
      const project = { imageSrc, editState, savedAt: Date.now() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
    } catch {
      // Storage full or unavailable
    }
  }, [imageSrc, editState])

  const load = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const project = JSON.parse(raw)
      if (!project.imageSrc) return null
      return project
    } catch {
      return null
    }
  }, [])

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const restore = useCallback(() => {
    const project = load()
    if (!project) return false
    setImageSrc(project.imageSrc)
    setEditState(project.editState)
    return true
  }, [load, setImageSrc, setEditState])

  useEffect(() => {
    if (!imageSrc) return
    autoSaveRef.current = setInterval(save, AUTO_SAVE_INTERVAL)
    return () => clearInterval(autoSaveRef.current)
  }, [imageSrc, save])

  useEffect(() => {
    const handleUnload = () => save()
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [save])

  return { save, load, clear, restore }
}
