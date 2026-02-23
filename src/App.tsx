import { lazy, Suspense, useState, useRef, useEffect, useCallback } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { INITIAL_EDIT_STATE } from './constants'
import { useEditHistory } from './hooks/useEditHistory'
import { useProjectSave } from './hooks/useProjectSave'
import { analyzeAndEnhance } from './utils/autoEnhance'
import { ImageUpload, EditorHeader, ShortcutsOverlay } from './components'
import { OnboardingTour } from './components/OnboardingTour'
import type { EditState, TextOverlay, FaceKeypoint } from './types'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

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
const BeforeAfterCard = lazy(() =>
  import('./components/BeforeAfterCard').then((m) => ({ default: m.BeforeAfterCard }))
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
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [mode, setMode] = useState<'editor' | 'collage' | 'batch'>('editor')
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [uploadLoading, setUploadLoading] = useState<boolean>(false)
  const [showShareModal, setShowShareModal] = useState<boolean>(false)
  const [showBeforeAfter, setShowBeforeAfter] = useState<boolean>(false)
  const [showExportDialog, setShowExportDialog] = useState<boolean>(false)
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null)
  const [showCompare, setShowCompare] = useState<boolean>(false)
  const [showShortcutsOverlay, setShowShortcutsOverlay] = useState<boolean>(false)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [hasSavedProject, setHasSavedProject] = useState<boolean>(() => {
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
    applyNestedSliderChange,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    historyIndex,
    historyLength,
  } = useEditHistory(INITIAL_EDIT_STATE)

  const [beautyProcessing, setBeautyProcessing] = useState<boolean>(false)
  const [faceKeypoints, setFaceKeypoints] = useState<FaceKeypoint[] | null>(null)
  const [showTour, setShowTour] = useState<boolean>(false)

  const handleTourComplete = useCallback(() => setShowTour(false), [])

  const { clear, restore } = useProjectSave(imageSrc, editState, setEditState, setImageSrc)

  useEffect(() => {
    if (imageSrc) {
      import('./utils/faceMesh').then(m => m.loadFaceMesh())
      const img = new Image()
      img.onload = () => {
        import('./utils/beautyPipeline').then(m => {
          m.detectAndCacheKeypoints(img).then(kp => {
            if (kp) setFaceKeypoints(kp)
          })
        })
      }
      img.src = imageSrc
    } else {
      setFaceKeypoints(null)
    }
  }, [imageSrc])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => setSwRegistration((e as CustomEvent<ServiceWorkerRegistration>).detail)
    window.addEventListener('sw-update-available', handler)
    return () => window.removeEventListener('sw-update-available', handler)
  }, [])

  const handleInstall = async (): Promise<void> => {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase()
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
        applyChange((s: EditState) => ({ ...s, drawingMode: s.drawingMode === 'brush' ? null : 'brush' }))
      }
      if (e.key === 'e') {
        e.preventDefault()
        applyChange((s: EditState) => ({ ...s, drawingMode: s.drawingMode === 'eraser' ? null : 'eraser' }))
      }
      if (e.key === 'h') {
        e.preventDefault()
        applyChange((s: EditState) => ({ ...s, drawingMode: s.drawingMode === 'heal' ? null : 'heal', healSource: null }))
      }
      if (e.key === 'i') {
        e.preventDefault()
        applyChange((s: EditState) => ({ ...s, drawingMode: s.drawingMode === 'picker' ? null : 'picker' }))
      }
      if (e.key === 'w') {
        e.preventDefault()
        applyChange((s: EditState) => ({ ...s, drawingMode: s.drawingMode === 'wand' ? null : 'wand', selectionMask: null }))
      }
      if (e.key === 'g') {
        e.preventDefault()
        applyChange((s: EditState) => ({ ...s, drawingMode: s.drawingMode === 'blur' ? null : 'blur' }))
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        applyChange((s: EditState) => ({ ...s, drawingMode: null, healSource: null, selectionMask: null }))
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editState.selectionMask && editState.drawingMode === 'wand') {
          e.preventDefault()
          const canvas = canvasRef.current
          if (canvas) {
            const ctx = canvas.getContext('2d')
            if (ctx) {
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
              const d = imgData.data
              const mask = editState.selectionMask
              for (let j = 0; j < mask.length; j++) {
                if (mask[j] >= 128) d[j * 4 + 3] = 0
              }
              ctx.putImageData(imgData, 0, 0)
            }
          }
        }
      }
      if (e.key === '[' || e.key === '-') {
        e.preventDefault()
        applyChange((s: EditState) => ({ ...s, brushSize: Math.max(1, (s.brushSize ?? 5) - 5) }))
      }
      if (e.key === ']' || e.key === '+' || e.key === '=') {
        e.preventDefault()
        applyChange((s: EditState) => ({ ...s, brushSize: Math.min(50, (s.brushSize ?? 5) + 5) }))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imageSrc, showShortcutsOverlay, undo, redo, applyChange, editState.drawingMode, editState.selectionMask])

  const handleImageLoad = (src: string): void => {
    setImageSrc(src)
    setOriginalImageSrc(src)
    reset()
    try {
      if (!localStorage.getItem('photosai-tour-completed')) {
        setTimeout(() => setShowTour(true), 600)
      }
    } catch { /* storage unavailable */ }
  }

  const handleAutoEnhance = (): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { beauty: beautyHint, reshape: reshapeHint, ...adjustments } = analyzeAndEnhance(canvas)
    applyChange((prev: EditState) => ({
      ...prev,
      ...adjustments,
      beauty: beautyHint
        ? { ...prev.beauty, ...beautyHint }
        : prev.beauty,
      faceReshape: reshapeHint
        ? { ...prev.faceReshape, ...reshapeHint }
        : prev.faceReshape,
    }))
  }

  const handleNewImage = (): void => {
    setImageSrc(null)
    reset()
    clear()
  }

  const handleDownload = (): void => setShowExportDialog(true)

  const handleUpdate = (): void => {
    const waiting = swRegistration?.waiting
    if (waiting) {
      waiting.postMessage('SKIP_WAITING')
    }
  }

  if (mode === 'collage') {
    return (
      <Suspense fallback={<EditorFallback />}>
        <CollageBuilder
          onComplete={(dataUrl: string) => {
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
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 safe-area-top">
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

  const addTextOverlay = (): void =>
    applyChange((s: EditState) => ({
      ...s,
      textOverlays: [...(s.textOverlays || []), { id: Date.now(), text: 'Text', x: 0.5, y: 0.5, fontSize: 32, color: '#ffffff' } as unknown as TextOverlay],
    }))

  return (
    <div className="h-dvh flex flex-col overflow-hidden safe-area-top">
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
        canvasRef={canvasRef}
      />

      <div className="flex-1 flex flex-col lg:flex-row lg:gap-4 lg:p-4 min-h-0 overflow-hidden relative">
        <Suspense fallback={<EditorFallback />}>
          <EditorCanvas
            imageSrc={imageSrc}
            editState={editState}
            canvasRef={canvasRef}
            isComparing={false}
            onZoomPanChange={(v: Partial<EditState>) => applyChange((s: EditState) => ({ ...s, ...v }))}
            onApplyChange={applyChange}
            onImageReplace={(newSrc: string) => { setImageSrc(newSrc) }}
            onBeautyProcessingChange={setBeautyProcessing}
          />

          {/* Desktop sidebar */}
          <div className="hidden lg:flex flex-shrink-0 min-h-0 max-h-full">
            <EditorSidebar
              editState={editState}
              applyChange={applyChange}
              applySliderChange={applySliderChange}
              applyNestedSliderChange={applyNestedSliderChange}
              beautyProcessing={beautyProcessing}
              faceKeypoints={faceKeypoints}
              onAddText={addTextOverlay}
              historyIndex={historyIndex}
              historyLength={historyLength}
              imageSrc={imageSrc}
              onImageReplace={(newSrc: string) => { setImageSrc(newSrc) }}
              canvasRef={canvasRef}
              onApplyChange={applyChange}
            />
          </div>

          {/* Mobile bottom tray */}
          <MobileBottomTray
            editState={editState}
            applyChange={applyChange}
            applySliderChange={applySliderChange}
            applyNestedSliderChange={applyNestedSliderChange}
            beautyProcessing={beautyProcessing}
            faceKeypoints={faceKeypoints}
            onAddText={addTextOverlay}
            imageSrc={imageSrc}
            onImageReplace={(newSrc: string) => { setImageSrc(newSrc) }}
            canvasRef={canvasRef}
            onApplyChange={applyChange}
          />
        </Suspense>
      </div>

      <OnboardingTour active={showTour} onComplete={handleTourComplete} />

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
            onBeforeAfter={() => { setShowShareModal(false); setShowBeforeAfter(true) }}
          />
        )}
        {showBeforeAfter && originalImageSrc && (
          <BeforeAfterCard
            originalSrc={originalImageSrc}
            canvasRef={canvasRef}
            onClose={() => setShowBeforeAfter(false)}
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
      <Analytics />
      <SpeedInsights />
    </div>
  )
}
