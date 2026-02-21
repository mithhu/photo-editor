import { useState, useRef, useEffect } from 'react'
import { INITIAL_EDIT_STATE } from './constants'
import { useEditHistory } from './hooks/useEditHistory'
import { useProjectSave } from './hooks/useProjectSave'
import { analyzeAndEnhance } from './utils/autoEnhance'
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

  const [hasSavedProject, setHasSavedProject] = useState(() => {
    try {
      const raw = localStorage.getItem('photo-editor-project')
      return raw ? !!JSON.parse(raw).imageSrc : false
    } catch { return false }
  })

  const {
    editState,
    setEditState,
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

  const { clear, restore } = useProjectSave(imageSrc, editState, setEditState, setImageSrc)

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

  const handleAutoEnhance = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const suggested = analyzeAndEnhance(canvas)
    applyChange(suggested)
  }

  const handleNewImage = () => {
    setImageSrc(null)
    reset()
    clear()
  }

  const handleDownload = () => setShowExportDialog(true)

  if (!imageSrc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold text-amber-500 mb-2">Photo Editor</h1>
        <p className="text-zinc-500 mb-8">Edit your photos with filters and adjustments</p>
        {hasSavedProject && (
          <div className="mb-4 p-4 bg-zinc-800 border border-zinc-700 rounded-xl text-center">
            <p className="text-zinc-300 text-sm mb-2">You have an unsaved project</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => { restore(); setHasSavedProject(false) }} className="px-4 py-2 bg-amber-500 text-zinc-900 rounded-lg text-sm font-medium">Restore</button>
              <button onClick={() => { clear(); setHasSavedProject(false) }} className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg text-sm">Discard</button>
            </div>
          </div>
        )}
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
        onAutoEnhance={handleAutoEnhance}
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
