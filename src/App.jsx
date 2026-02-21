import { lazy, Suspense, useState, useRef, useEffect } from 'react'
import { INITIAL_EDIT_STATE } from './constants'
import { useEditHistory } from './hooks/useEditHistory'
import { useProjectSave } from './hooks/useProjectSave'
import { analyzeAndEnhance } from './utils/autoEnhance'
import { ImageUpload, EditorHeader, ShortcutsOverlay } from './components'

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
const CompareSlider = lazy(() =>
  import('./components/CompareSlider').then((m) => ({ default: m.CompareSlider }))
)

function EditorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center text-zinc-500">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-zinc-600 border-t-indigo-500 rounded-full mx-auto mb-3" />
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
  const [showCompare, setShowCompare] = useState(false)
  const [showShortcutsOverlay, setShowShortcutsOverlay] = useState(false)
  const [swRegistration, setSwRegistration] = useState(null)
  const canvasRef = useRef(null)

  const [hasSavedProject, setHasSavedProject] = useState(() => {
    try {
      const raw = localStorage.getItem('photosai-project')
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

  useEffect(() => {
    const handler = (e) => setSwRegistration(e.detail)
    window.addEventListener('sw-update-available', handler)
    return () => window.removeEventListener('sw-update-available', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return

      if (e.key === '?') {
        e.preventDefault()
        if (imageSrc) setShowShortcutsOverlay((v) => !v)
        return
      }

      if (showShortcutsOverlay) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setShowShortcutsOverlay(false)
        }
        return
      }

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
      if (e.key === 'b') {
        e.preventDefault()
        applyChange((s) => ({ ...s, drawingMode: s.drawingMode === 'brush' ? null : 'brush' }))
      }
      if (e.key === 'e') {
        e.preventDefault()
        applyChange((s) => ({ ...s, drawingMode: s.drawingMode === 'eraser' ? null : 'eraser' }))
      }
      if (e.key === 'h') {
        e.preventDefault()
        applyChange((s) => ({ ...s, drawingMode: s.drawingMode === 'heal' ? null : 'heal', healSource: null }))
      }
      if (e.key === 'i') {
        e.preventDefault()
        applyChange((s) => ({ ...s, drawingMode: s.drawingMode === 'picker' ? null : 'picker' }))
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        applyChange((s) => ({ ...s, drawingMode: null, healSource: null }))
      }
      if (e.key === '[' || e.key === '-') {
        e.preventDefault()
        applyChange((s) => ({ ...s, brushSize: Math.max(1, (s.brushSize ?? 5) - 5) }))
      }
      if (e.key === ']' || e.key === '+' || e.key === '=') {
        e.preventDefault()
        applyChange((s) => ({ ...s, brushSize: Math.min(50, (s.brushSize ?? 5) + 5) }))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imageSrc, showShortcutsOverlay, undo, redo, applyChange])

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

  const handleUpdate = () => {
    const waiting = swRegistration?.waiting
    if (waiting) {
      waiting.postMessage('SKIP_WAITING')
    }
  }

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
        {uploadLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="animate-spin w-10 h-10 border-3 border-zinc-600 border-t-indigo-500 rounded-full mx-auto mb-4" />
              <p className="text-sm text-zinc-300">Loading image...</p>
            </div>
          </div>
        )}
        {swRegistration && (
          <div className="fixed top-0 inset-x-0 flex items-center justify-center gap-3 px-4 py-2 bg-indigo-500 text-zinc-900 text-sm font-medium z-50">
            <span>A new version is available!</span>
            <button onClick={handleUpdate} className="px-3 py-1 bg-zinc-900 text-indigo-400 rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors">Update Now</button>
            <button onClick={() => setSwRegistration(null)} className="text-zinc-800 hover:text-zinc-900 text-lg leading-none">×</button>
          </div>
        )}
        <h1 className="text-4xl font-bold tracking-tight mb-1">
          <span className="text-indigo-400">Photos</span><span className="text-zinc-200">AI</span>
        </h1>
        <p className="text-zinc-500 text-sm mb-8">AI-powered photo editing in your browser</p>
        {hasSavedProject && (
          <div className="mb-4 p-4 bg-zinc-800 border border-zinc-700 rounded-xl text-center">
            <p className="text-zinc-300 text-sm mb-2">You have an unsaved project</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => { restore(); setHasSavedProject(false) }} className="px-4 py-2 bg-indigo-500 text-zinc-900 rounded-lg text-sm font-medium">Restore</button>
              <button onClick={() => { clear(); setHasSavedProject(false) }} className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg text-sm">Discard</button>
            </div>
          </div>
        )}
        <div className="w-full max-w-md">
          <ImageUpload onImageLoad={handleImageLoad} loading={uploadLoading} onLoadingChange={setUploadLoading} />
          {installPrompt && (
            <button
              onClick={handleInstall}
              className="mt-4 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 rounded-lg text-sm transition-colors w-full"
            >
              Install App for Offline Use
            </button>
          )}
          <button
            onClick={() => setMode('collage')}
            className="w-full mt-4 px-4 py-3 bg-zinc-800 border border-zinc-700 hover:border-indigo-500/50 rounded-xl text-zinc-300 hover:text-indigo-400 transition-colors"
          >
            Create Collage
          </button>
          <button
            onClick={() => setMode('batch')}
            className="w-full mt-2 px-4 py-3 bg-zinc-800 border border-zinc-700 hover:border-purple-500/50 rounded-xl text-zinc-300 hover:text-purple-400 transition-colors"
          >
            Edit Multiple Photos
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
      {swRegistration && (
        <div className="flex items-center justify-center gap-3 px-4 py-2 bg-indigo-500 text-zinc-900 text-sm font-medium">
          <span>A new version is available!</span>
          <button
            onClick={handleUpdate}
            className="px-3 py-1 bg-zinc-900 text-indigo-400 rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors"
          >
            Update Now
          </button>
          <button
            onClick={() => setSwRegistration(null)}
            className="text-zinc-800 hover:text-zinc-900 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}
      <EditorHeader
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        showCompare={showCompare}
        onToggleCompare={() => setShowCompare((v) => !v)}
        onAutoEnhance={handleAutoEnhance}
        onNewImage={handleNewImage}
        onDownload={handleDownload}
        onShare={() => setShowShareModal(true)}
        onBatch={() => setMode('batch')}
        onResetAll={reset}
        onOpenShortcuts={() => setShowShortcutsOverlay(true)}
      />

      <div className="flex-1 flex flex-col lg:flex-row lg:gap-4 lg:p-4 min-h-0 overflow-hidden relative">
        <Suspense fallback={<EditorFallback />}>
          <EditorCanvas
            imageSrc={imageSrc}
            editState={editState}
            canvasRef={canvasRef}
            isComparing={false}
            onZoomPanChange={(v) => applyChange((s) => ({ ...s, ...v }))}
            onApplyChange={applyChange}
            onImageReplace={(newSrc) => { setImageSrc(newSrc) }}
          />

          {/* Desktop sidebar */}
          <div className="hidden lg:flex flex-shrink-0 min-h-0">
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
          </div>

          {/* Mobile bottom tray */}
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
        {showCompare && (
          <CompareSlider
            canvasRef={canvasRef}
            imageSrc={imageSrc}
            visible={showCompare}
            onClose={() => setShowCompare(false)}
          />
        )}
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
        <ShortcutsOverlay
          visible={showShortcutsOverlay}
          onClose={() => setShowShortcutsOverlay(false)}
        />
      </Suspense>
    </div>
  )
}
