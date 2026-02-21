import { useState, useRef, useEffect } from 'react'
import { INITIAL_EDIT_STATE } from './constants'
import { useEditHistory } from './hooks/useEditHistory'
import {
  ImageUpload,
  EditorHeader,
  EditorCanvas,
  EditorSidebar,
  ShareModal,
  ExportDialog,
} from './components'

export default function App() {
  const [imageSrc, setImageSrc] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [isComparing, setIsComparing] = useState(false)
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
    historyIndex,
    historyLength,
  } = useEditHistory(INITIAL_EDIT_STATE)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!imageSrc) return
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
      if (e.key === 'b') {
        e.preventDefault()
        applyChange((s) => ({ ...s, drawingMode: s.drawingMode === 'brush' ? null : 'brush' }))
      }
      if (e.key === 'e') {
        e.preventDefault()
        applyChange((s) => ({ ...s, drawingMode: s.drawingMode === 'eraser' ? null : 'eraser' }))
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        applyChange((s) => ({ ...s, drawingMode: null }))
      }
      if (e.key === '[') {
        e.preventDefault()
        applyChange((s) => ({ ...s, brushSize: Math.max(1, (s.brushSize ?? 5) - 5) }))
      }
      if (e.key === ']') {
        e.preventDefault()
        applyChange((s) => ({ ...s, brushSize: Math.min(50, (s.brushSize ?? 5) + 5) }))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imageSrc, undo, redo, applyChange])

  const handleImageLoad = (src) => {
    setImageSrc(src)
    reset()
  }

  const handleNewImage = () => {
    setImageSrc(null)
    reset()
  }

  const handleDownload = () => setShowExportDialog(true)

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
        onCompareStart={() => setIsComparing(true)}
        onCompareEnd={() => setIsComparing(false)}
        onNewImage={handleNewImage}
        onDownload={handleDownload}
        onShare={() => setShowShareModal(true)}
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0 overflow-y-auto lg:overflow-hidden">
        <EditorCanvas
          imageSrc={imageSrc}
          editState={editState}
          canvasRef={canvasRef}
          isComparing={isComparing}
          onZoomPanChange={(v) => applyChange((s) => ({ ...s, ...v }))}
          onApplyChange={applyChange}
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
          historyIndex={historyIndex}
          historyLength={historyLength}
        />
      </div>

      {showShareModal && (
        <ShareModal
          canvasRef={canvasRef}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showExportDialog && (
        <ExportDialog
          canvasRef={canvasRef}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  )
}
