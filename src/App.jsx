import { useState, useRef, useEffect } from 'react'
import { INITIAL_EDIT_STATE } from './constants'
import { useEditHistory } from './hooks/useEditHistory'
import {
  ImageUpload,
  EditorHeader,
  EditorCanvas,
  EditorSidebar,
} from './components'

export default function App() {
  const [imageSrc, setImageSrc] = useState(null)
  const canvasRef = useRef(null)

  const {
    editState,
    applyChange,
    applySliderChange,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  } = useEditHistory(INITIAL_EDIT_STATE)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!imageSrc) return
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imageSrc, undo, redo])

  const handleImageLoad = (src) => {
    setImageSrc(src)
    reset()
  }

  const handleNewImage = () => {
    setImageSrc(null)
    reset()
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `edited-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  if (!imageSrc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold text-amber-500 mb-2">Photo Editor</h1>
        <p className="text-zinc-500 mb-8">Edit your photos with filters and adjustments</p>
        <div className="w-full max-w-md">
          <ImageUpload onImageLoad={handleImageLoad} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <EditorHeader
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onNewImage={handleNewImage}
        onDownload={handleDownload}
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-auto">
        <EditorCanvas imageSrc={imageSrc} editState={editState} canvasRef={canvasRef} />
        <EditorSidebar
          editState={editState}
          applyChange={applyChange}
          applySliderChange={applySliderChange}
        />
      </div>
    </div>
  )
}
