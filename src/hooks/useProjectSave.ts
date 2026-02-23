import { useCallback, useEffect, useRef } from 'react'
import { INITIAL_EDIT_STATE } from '../constants'
import type { EditState } from '../types'

const STORAGE_KEY = 'photosai-project'
const AUTO_SAVE_INTERVAL = 10000

interface SavedProject {
  imageSrc: string
  editState: EditState
  savedAt: number
}

export function useProjectSave(
  imageSrc: string | null,
  editState: EditState,
  setEditState: React.Dispatch<React.SetStateAction<EditState>>,
  setImageSrc: (src: string) => void
): { save: () => void; load: () => SavedProject | null; clear: () => void; restore: () => boolean } {
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const save = useCallback(() => {
    if (!imageSrc) return
    try {
      const project: SavedProject = { imageSrc, editState, savedAt: Date.now() }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
    } catch {
      // Storage full or unavailable
    }
  }, [imageSrc, editState])

  const load = useCallback((): SavedProject | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const project: SavedProject = JSON.parse(raw)
      if (!project.imageSrc) return null
      return project
    } catch {
      return null
    }
  }, [])

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const restore = useCallback((): boolean => {
    const project = load()
    if (!project) return false
    setImageSrc(project.imageSrc)
    setEditState({ ...INITIAL_EDIT_STATE, ...project.editState })
    return true
  }, [load, setImageSrc, setEditState])

  useEffect(() => {
    if (!imageSrc) return
    autoSaveRef.current = setInterval(save, AUTO_SAVE_INTERVAL)
    return () => clearInterval(autoSaveRef.current!)
  }, [imageSrc, save])

  useEffect(() => {
    const handleUnload = () => save()
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [save])

  return { save, load, clear, restore }
}
