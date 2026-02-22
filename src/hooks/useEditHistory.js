import { useState, useRef, useCallback, useEffect } from 'react'

const HISTORY_LIMIT = 30

export function useEditHistory(initialState) {
  const [editState, setEditState] = useState(initialState)
  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])
  const sliderCommitRef = useRef(null)
  const nestedSliderCommitRef = useRef(null)

  const applyChange = useCallback((updater) => {
    setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), editState])
    setFuture([])
    setEditState((s) => (typeof updater === 'function' ? updater(s) : { ...s, ...updater }))
  }, [editState])

  const applySliderChange = useCallback((key, value) => {
    if (!sliderCommitRef.current) {
      setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), editState])
      setFuture([])
    }
    clearTimeout(sliderCommitRef.current)
    setEditState((s) => ({ ...s, [key]: value }))
    sliderCommitRef.current = setTimeout(() => {
      sliderCommitRef.current = null
    }, 500)
  }, [editState])

  const applyNestedSliderChange = useCallback((updater) => {
    if (!nestedSliderCommitRef.current) {
      setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), editState])
      setFuture([])
    }
    clearTimeout(nestedSliderCommitRef.current)
    setEditState((s) => (typeof updater === 'function' ? updater(s) : { ...s, ...updater }))
    nestedSliderCommitRef.current = setTimeout(() => {
      nestedSliderCommitRef.current = null
    }, 500)
  }, [editState])

  useEffect(() => () => {
    clearTimeout(sliderCommitRef.current)
    clearTimeout(nestedSliderCommitRef.current)
  }, [])

  const undo = useCallback(() => {
    if (history.length === 0) return
    const previous = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setFuture((f) => [editState, ...f])
    setEditState(previous)
  }, [history, editState])

  const redo = useCallback(() => {
    if (future.length === 0) return
    const next = future[0]
    setFuture((f) => f.slice(1))
    setHistory((h) => [...h, editState])
    setEditState(next)
  }, [future, editState])

  const reset = useCallback(() => {
    setEditState(initialState)
    setHistory([])
    setFuture([])
  }, [initialState])

  return {
    editState,
    setEditState,
    applyChange,
    applySliderChange,
    applyNestedSliderChange,
    undo,
    redo,
    reset,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    historyIndex: history.length,
    historyLength: history.length + 1 + future.length,
  }
}
