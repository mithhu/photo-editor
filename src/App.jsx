import { useState, useRef, useEffect } from 'react'
import { INITIAL_EDIT_STATE } from './constants'
import { useEditHistory } from './hooks/useEditHistory'
import {
  ImageUpload,
  EditorHeader,
  EditorCanvas,
  EditorSidebar,
  ShareModal,
} from './components'

export default function App() {
  const [imageSrc, setImageSrc] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
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
          <ImageUpload onImageLoad={handleImageLoad} loading={uploadLoading} onLoadingChange={setUploadLoading} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <EditorHeader
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onNewImage={handleNewImage}
        onDownload={handleDownload}
        onShare={() => setShowShareModal(true)}
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0 overflow-y-auto lg:overflow-hidden">
        <EditorCanvas
          imageSrc={imageSrc}
          editState={editState}
          canvasRef={canvasRef}
          onZoomPanChange={(v) => applyChange((s) => ({ ...s, ...v }))}
        />
        <EditorSidebar
          editState={editState}
          applyChange={applyChange}
          applySliderChange={applySliderChange}
          onAddText={() =>
            applyChange((s) => ({
              ...s,
              textOverlays: [...(s.textOverlays || []), { id: Date.now(), text: 'Text', x: 0.5, y: 0.5, fontSize: 32, color: '#ffffff' }],
            }))
          }
        />
      </div>

      {showShareModal && (
        <ShareModal
          canvasRef={canvasRef}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}
