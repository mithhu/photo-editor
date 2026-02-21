import { lazy, Suspense, useState, useRef, useEffect } from 'react'
import { INITIAL_EDIT_STATE } from './constants'
import { useEditHistory } from './hooks/useEditHistory'
import { useProjectSave } from './hooks/useProjectSave'
import { analyzeAndEnhance } from './utils/autoEnhance'
import { ImageUpload, EditorHeader } from './components'

const EditorCanvas = lazy(() =>
  import('./components/EditorCanvas').then((m) => ({ default: m.EditorCanvas }))
)
const EditorSidebar = lazy(() =>
  import('./components/EditorSidebar').then((m) => ({ default: m.EditorSidebar }))
)
const MobileBottomTray = lazy(() =>
  import('./components/MobileBottomTray').then((m) => ({ default: m.MobileBottomTray }))
)
const ShareModal = lazy(() =>
  import('./components/ShareModal').then((m) => ({ default: m.ShareModal }))
)
const ExportDialog = lazy(() =>
  import('./components/ExportDialog').then((m) => ({ default: m.ExportDialog }))
)
const CollageBuilder = lazy(() =>
  import('./components/CollageBuilder').then((m) => ({ default: m.CollageBuilder }))
)
const BatchProcessor = lazy(() =>
  import('./components/BatchProcessor').then((m) => ({ default: m.BatchProcessor }))
)

function EditorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center text-zinc-500">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-zinc-600 border-t-amber-500 rounded-full mx-auto mb-3" />
        <p className="text-sm">Loading editor...</p>
      </div>
    </div>
  )
}

export default function App() {
  const [imageSrc, setImageSrc] = useState(null)
  const [mode, setMode] = useState('editor')
  const [installPrompt, setInstallPrompt] = useState(null)
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
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

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

  if (mode === 'collage') {
    return (
      <Suspense fallback={<EditorFallback />}>
        <CollageBuilder
          onComplete={(dataUrl) => {
            setImageSrc(dataUrl)
            setMode('editor')
          }}
          onBack={() => setMode('editor')}
        />
      </Suspense>
    )
  }

  if (mode === 'batch') {
    return (
      <Suspense fallback={<EditorFallback />}>
        <BatchProcessor
          editState={editState}
          onBack={() => setMode('editor')}
        />
      </Suspense>
    )
  }

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
          {installPrompt && (
            <button
              onClick={handleInstall}
              className="mt-4 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-sm transition-colors w-full"
            >
              Install App for Offline Use
            </button>
          )}
          <button
            onClick={() => setMode('collage')}
            className="w-full mt-4 px-4 py-3 bg-zinc-800 border border-zinc-700 hover:border-amber-500/50 rounded-xl text-zinc-300 hover:text-amber-400 transition-colors"
          >
            Create Collage
          </button>
          <button
            onClick={() => setMode('batch')}
            className="w-full mt-2 px-4 py-3 bg-zinc-800 border border-zinc-700 hover:border-purple-500/50 rounded-xl text-zinc-300 hover:text-purple-400 transition-colors"
          >
            Batch Process
          </button>
        </div>
      </div>
    )
  }

  const addTextOverlay = () =>
    applyChange((s) => ({
      ...s,
      textOverlays: [...(s.textOverlays || []), { id: Date.now(), text: 'Text', x: 0.5, y: 0.5, fontSize: 32, color: '#ffffff' }],
    }))

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
        onBatch={() => setMode('batch')}
        onResetAll={reset}
      />

      {/* Desktop: side-by-side layout */}
      <div className="flex-1 hidden lg:flex flex-row gap-4 p-4 min-h-0 overflow-hidden">
        <Suspense fallback={<EditorFallback />}>
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
            onAddText={addTextOverlay}
            historyIndex={historyIndex}
            historyLength={historyLength}
            imageSrc={imageSrc}
            onImageReplace={(newSrc) => { setImageSrc(newSrc) }}
            canvasRef={canvasRef}
            onApplyChange={applyChange}
          />
        </Suspense>
      </div>

      {/* Mobile: full-screen canvas + bottom tray overlay */}
      <div className="flex-1 flex flex-col lg:hidden min-h-0">
        <Suspense fallback={<EditorFallback />}>
          <div className="flex-1 min-h-0 p-2 pb-20">
            <EditorCanvas
              imageSrc={imageSrc}
              editState={editState}
              canvasRef={canvasRef}
              isComparing={isComparing}
              onZoomPanChange={(v) => applyChange((s) => ({ ...s, ...v }))}
              onApplyChange={applyChange}
            />
          </div>
          <MobileBottomTray
            editState={editState}
            applyChange={applyChange}
            applySliderChange={applySliderChange}
            onAddText={addTextOverlay}
            imageSrc={imageSrc}
            onImageReplace={(newSrc) => { setImageSrc(newSrc) }}
            canvasRef={canvasRef}
            onApplyChange={applyChange}
          />
        </Suspense>
      </div>

      <Suspense fallback={null}>
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
      </Suspense>
    </div>
  )
}
