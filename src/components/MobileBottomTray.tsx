import { useState, useRef, useEffect, useCallback, lazy, Suspense, ChangeEvent } from 'react'
import { Slider } from './Slider'
import { SuggestionChips } from './SuggestionChips'
import { ImageInfoPanel } from './ImageInfoPanel'
import { FILTER_PRESETS, INITIAL_EDIT_STATE, TEXT_OVERLAY_FONTS, FRAME_PRESETS, LIGHT_LEAK_PRESETS } from '../constants'
import { CROP_RATIOS } from '../utils/cropUtils'
import { FILM_EMULATIONS } from '../utils/filmEmulation'
import { useFilterPreviews } from '../hooks/useFilterPreviews'
import { useExposureSuggestions } from '../hooks/useExposureSuggestions'
import { usePortraitCrop } from '../hooks/usePortraitCrop'
import { parseCubeLUT } from '../utils/lutParser'
import { featherMask } from '../utils/magicWand'
import type { EditState, ShapeOverlay, FaceKeypoint } from '../types'
import type { Mask } from './MaskPanel'

const HSLPanel = lazy(() => import('./HSLPanel').then((m) => ({ default: m.HSLPanel })))
const CurvesPanel = lazy(() => import('./CurvesPanel').then((m) => ({ default: m.CurvesPanel })))
const ColorWheelPanel = lazy(() => import('./ColorWheelPanel').then((m) => ({ default: m.ColorWheelPanel })))
const SplitTonePanel = lazy(() => import('./SplitTonePanel').then((m) => ({ default: m.SplitTonePanel })))
const MaskPanel = lazy(() => import('./MaskPanel').then((m) => ({ default: m.MaskPanel })))
const AIToolsPanel = lazy(() => import('./AIToolsPanel').then((m) => ({ default: m.AIToolsPanel })))
const TemplatePanel = lazy(() => import('./TemplatePanel').then((m) => ({ default: m.TemplatePanel })))
const StickerPanel = lazy(() => import('./StickerPanel').then((m) => ({ default: m.StickerPanel })))
const LayerPanel = lazy(() => import('./LayerPanel').then((m) => ({ default: m.LayerPanel })))
const BeautyPanel = lazy(() => import('./BeautyPanel').then((m) => ({ default: m.BeautyPanel })))
const FunAIPanel = lazy(() => import('./FunAIPanel').then((m) => ({ default: m.FunAIPanel })))
const EffectsPanel = lazy(() => import('./EffectsPanel').then((m) => ({ default: m.EffectsPanel })))
const PhotoScorePanel = lazy(() => import('./PhotoScorePanel').then((m) => ({ default: m.PhotoScorePanel })))
const FaceStickersPanel = lazy(() => import('./FaceStickersPanel').then((m) => ({ default: m.FaceStickersPanel })))
const MoodQuotesPanel = lazy(() => import('./MoodQuotesPanel').then((m) => ({ default: m.MoodQuotesPanel })))
const ColorSplashPanel = lazy(() => import('./ColorSplashPanel').then((m) => ({ default: m.ColorSplashPanel })))
const MirrorEffectPanel = lazy(() => import('./MirrorEffectPanel').then((m) => ({ default: m.MirrorEffectPanel })))
const DateStampPanel = lazy(() => import('./DateStampPanel').then((m) => ({ default: m.DateStampPanel })))

interface TabItem {
  id: string
  icon: string
  label: string
}

interface ImageDims {
  w: number
  h: number
}

export interface MobileBottomTrayProps {
  editState: EditState
  applyChange: (updater: ((prev: EditState) => EditState) | Partial<EditState>) => void
  applySliderChange: (key: string, value: number) => void
  applyNestedSliderChange: (updater: ((prev: EditState) => EditState) | Partial<EditState>) => void
  beautyProcessing: boolean
  faceKeypoints: FaceKeypoint[] | null
  onAddText: () => void
  imageSrc: string | null
  onImageReplace: (src: string) => void
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onApplyChange: (updater: ((prev: EditState) => EditState) | Partial<EditState>) => void
}

const PRIMARY_TABS: TabItem[] = [
  { id: 'filters', icon: '✦', label: 'Filters' },
  { id: 'beauty', icon: '✨', label: 'Beauty' },
  { id: 'funai', icon: '🎭', label: 'Fun AI' },
  { id: 'stickers', icon: '🎪', label: 'Stickers' },
  { id: 'effects', icon: '🌟', label: 'Effects' },
  { id: 'ai', icon: '⚡', label: 'AI' },
  { id: 'crop', icon: '⬡', label: 'Crop' },
  { id: 'draw', icon: '✎', label: 'Draw' },
]

const MORE_TABS: TabItem[] = [
  { id: 'quotes', icon: '💬', label: 'Quotes' },
  { id: 'splash', icon: '🎯', label: 'Splash' },
  { id: 'mirror', icon: '🪞', label: 'Mirror' },
  { id: 'datestamp', icon: '📅', label: 'Date' },
  { id: 'adjust', icon: '☀', label: 'Adjust' },
  { id: 'color', icon: '🎨', label: 'Color' },
  { id: 'score', icon: '💯', label: 'Score' },
  { id: 'resize', icon: '↔', label: 'Resize' },
  { id: 'frames', icon: '▣', label: 'Frames' },
  { id: 'layers', icon: '◫', label: 'Layers' },
  { id: 'templates', icon: '▦', label: 'Templates' },
]


function PanelLoader() {
  return <div className="flex items-center justify-center py-4 text-zinc-500 text-xs">Loading...</div>
}

export function MobileBottomTray({
  editState,
  applyChange,
  applySliderChange,
  applyNestedSliderChange,
  beautyProcessing,
  faceKeypoints,
  onAddText,
  imageSrc,
  onImageReplace,
  canvasRef,
  onApplyChange,
}: MobileBottomTrayProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [subPanel, setSubPanel] = useState<string | null>(null)
  const [showMore, setShowMore] = useState<boolean>(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const moreRef = useRef<HTMLDivElement | null>(null)
  const [expandedTextId, setExpandedTextId] = useState<string | null>(null)
  const [lutError, setLutError] = useState<string | null>(null)
  const [imageDims, setImageDims] = useState<ImageDims | null>(null)
  const [filterTab, setFilterTab] = useState<string>('popular')
  const [filmTab, setFilmTab] = useState<string>('classic')
  const lutInputRef = useRef<HTMLInputElement | null>(null)
  const { previews: filterPreviews, loading: previewsLoading } = useFilterPreviews(imageSrc)
  const { suggestions: exposureSuggestions, loading: exposureLoading, analyze: analyzeExposure } = useExposureSuggestions(canvasRef)
  const {
    handlePortraitCrop,
    loading: portraitCropLoading,
    error: portraitCropError,
  } = usePortraitCrop(imageSrc, onApplyChange)

  const {
    brightness, contrast, saturation, exposure, highlights, shadows,
    warmth, tint, vibrance, clarity, dehaze, vignette,
    cropRatio, preset, drawingMode, brushColor, brushSize, brushOpacity, brushStrokes,
  } = editState

  const ratioLabels: Record<string, string> = { original: 'Original', '1:1': '1:1', '4:5': '4:5', '16:9': '16:9', '9:16': '9:16', '3:4': '3:4', '2:3': '2:3', custom: 'Custom' }

  useEffect(() => {
    if (!imageSrc) return
    const img = new Image()
    img.onload = () => setImageDims({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = imageSrc
  }, [imageSrc])

  const handleLutImport = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLutError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseCubeLUT(reader.result as string)
        applyChange((s) => ({ ...s, lut: parsed, lutName: file.name }))
      } catch (err) {
        setLutError((err as Error).message)
      }
    }
    reader.readAsText(file)
    if (lutInputRef.current) lutInputRef.current.value = ''
  }, [applyChange])

  const handleResizeWidth = useCallback((w: number) => {
    const val = Math.max(0, Math.round(w))
    if (editState.resize?.lockAspect && imageDims && imageDims.w > 0 && val > 0) {
      const aspect = imageDims.h / imageDims.w
      applyChange((s) => ({ ...s, resize: { ...s.resize, width: val, height: Math.round(val * aspect) } }))
    } else {
      applyChange((s) => ({ ...s, resize: { ...s.resize, width: val } }))
    }
  }, [applyChange, editState.resize?.lockAspect, imageDims])

  const handleResizeHeight = useCallback((h: number) => {
    const val = Math.max(0, Math.round(h))
    if (editState.resize?.lockAspect && imageDims && imageDims.h > 0 && val > 0) {
      const aspect = imageDims.w / imageDims.h
      applyChange((s) => ({ ...s, resize: { ...s.resize, height: val, width: Math.round(val * aspect) } }))
    } else {
      applyChange((s) => ({ ...s, resize: { ...s.resize, height: val } }))
    }
  }, [applyChange, editState.resize?.lockAspect, imageDims])

  const toggleCategory = useCallback((id: string) => {
    setShowMore(false)
    setActiveCategory((prev) => {
      if (prev === id) return null
      setSubPanel(null)
      return id
    })
  }, [])

  const isMoreTabActive = MORE_TABS.some((t) => t.id === activeCategory)

  useEffect(() => {
    if (!activeCategory && !showMore) return
    const handleBack = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveCategory(null)
        setSubPanel(null)
        setShowMore(false)
      }
    }
    window.addEventListener('keydown', handleBack)
    return () => window.removeEventListener('keydown', handleBack)
  }, [activeCategory, showMore])

  useEffect(() => {
    if (!showMore) return
    const handleOutsideClick = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false)
      }
    }
    document.addEventListener('pointerdown', handleOutsideClick)
    return () => document.removeEventListener('pointerdown', handleOutsideClick)
  }, [showMore])

  const renderPanel = () => {
    switch (activeCategory) {
      case 'adjust':
        if (subPanel === 'curves') {
          return (
            <Suspense fallback={<PanelLoader />}>
              <CurvesPanel
                curves={editState.curves}
                onChange={(channel: string, points: [number, number][]) =>
                  applyChange((s) => ({ ...s, curves: { ...s.curves, [channel]: points } }))
                }
              />
            </Suspense>
          )
        }
        if (subPanel === 'masks') {
          return (
            <Suspense fallback={<PanelLoader />}>
              <MaskPanel
                masks={(editState.masks || []) as Mask[]}
                onMasksChange={(masks) => applyChange({ masks })}
              />
            </Suspense>
          )
        }
        return (
          <div className="space-y-3 px-1">
            <div className="pb-2 border-b border-zinc-800/50">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Suggestions</h4>
              <SuggestionChips
                suggestions={exposureSuggestions}
                loading={exposureLoading}
                onAnalyze={analyzeExposure}
                onApply={(changes: Partial<EditState>) => applyChange((s) => ({ ...s, ...changes }))}
              />
            </div>
            <Slider label="Brightness" value={brightness} onChange={(v: number) => applySliderChange('brightness', v)} defaultValue={1} />
            <Slider label="Contrast" value={contrast} onChange={(v: number) => applySliderChange('contrast', v)} defaultValue={1} />
            <Slider label="Saturation" value={saturation} onChange={(v: number) => applySliderChange('saturation', v)} defaultValue={1} />
            <Slider label="Exposure" value={exposure} onChange={(v: number) => applySliderChange('exposure', v)} min={0.5} max={1.5} defaultValue={1} />
            <Slider label="Highlights" value={highlights} onChange={(v: number) => applySliderChange('highlights', v)} min={0.5} max={1.5} defaultValue={1} />
            <Slider label="Shadows" value={shadows} onChange={(v: number) => applySliderChange('shadows', v)} min={0.5} max={1.5} defaultValue={1} />
            <Slider label="Warmth" value={warmth} onChange={(v: number) => applySliderChange('warmth', v)} min={-1} max={1} defaultValue={0} />
            <Slider label="Tint" value={tint} onChange={(v: number) => applySliderChange('tint', v)} min={-1} max={1} defaultValue={0} />
            <div className="flex flex-wrap gap-1 mt-1">
              {[
                { label: '☀️ Daylight', warmth: 0, tint: 0 },
                { label: '☁️ Cloudy', warmth: 8, tint: 2 },
                { label: '🏠 Shade', warmth: 12, tint: 4 },
                { label: '💡 Tungsten', warmth: -15, tint: -5 },
                { label: '💡 Fluorescent', warmth: -5, tint: 8 },
                { label: '📸 Flash', warmth: 3, tint: 1 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyChange({ warmth: p.warmth, tint: p.tint })}
                  className="px-1.5 py-0.5 text-[9px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Slider label="Vibrance" value={vibrance} onChange={(v: number) => applySliderChange('vibrance', v)} min={-1} max={1} defaultValue={0} />
            <Slider label="Clarity" value={clarity} onChange={(v: number) => applySliderChange('clarity', v)} min={-1} max={1} defaultValue={0} />
            <Slider label="Dehaze" value={dehaze} onChange={(v: number) => applySliderChange('dehaze', v)} min={-1} max={1} defaultValue={0} />
            <Slider label="Vignette" value={vignette} onChange={(v: number) => applySliderChange('vignette', v)} min={0} max={1} defaultValue={0} />

            {/* Tilt-Shift */}
            <div className="pt-2 border-t border-zinc-800/50">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Focus / Tilt-Shift</h4>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => applyChange((s) => ({ ...s, tiltShift: { ...s.tiltShift, mode: 'linear' } }))}
                  className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                    editState.tiltShift?.mode === 'linear' ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  Linear
                </button>
                <button
                  onClick={() => applyChange((s) => ({ ...s, tiltShift: { ...s.tiltShift, mode: 'radial' } }))}
                  className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                    editState.tiltShift?.mode === 'radial' ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  Radial
                </button>
              </div>
              <div className="space-y-3">
                <Slider label="Blur" value={editState.tiltShift?.blur ?? 0} onChange={(v: number) => applyChange((s) => ({ ...s, tiltShift: { ...s.tiltShift, blur: v } }))} min={0} max={20} step={0.5} defaultValue={0} />
                <Slider label="Position" value={editState.tiltShift?.position ?? 50} onChange={(v: number) => applyChange((s) => ({ ...s, tiltShift: { ...s.tiltShift, position: v } }))} min={0} max={100} step={1} defaultValue={50} />
                <Slider label="Size" value={editState.tiltShift?.size ?? 30} onChange={(v: number) => applyChange((s) => ({ ...s, tiltShift: { ...s.tiltShift, size: v } }))} min={0} max={100} step={1} defaultValue={30} />
              </div>
            </div>

            {/* Film Grain */}
            <div className="pt-2 border-t border-zinc-800/50">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Film Grain</h4>
              <div className="space-y-3">
                <Slider
                  label="Amount"
                  value={editState.grain?.amount ?? 0}
                  onChange={(v: number) => applyChange((s) => ({ ...s, grain: { ...s.grain, amount: v } }))}
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={0}
                />
                <Slider
                  label="Size"
                  value={editState.grain?.size ?? 1}
                  onChange={(v: number) => applyChange((s) => ({ ...s, grain: { ...s.grain, size: v } }))}
                  min={1}
                  max={3}
                  step={1}
                  defaultValue={1}
                />
              </div>
            </div>

            {/* Selective Color */}
            <div className="pt-2 border-t border-zinc-800/50">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Selective Color</h4>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => applyChange((s) => ({ ...s, selectiveColor: { ...s.selectiveColor, enabled: !s.selectiveColor?.enabled } }))}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    editState.selectiveColor?.enabled ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {editState.selectiveColor?.enabled ? 'On' : 'Off'}
                </button>
                <span className="text-[10px] text-zinc-500">Color splash</span>
              </div>
              {editState.selectiveColor?.enabled && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-400">Hue</span>
                      <span className="text-xs text-zinc-500">{editState.selectiveColor?.hue ?? 0}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={editState.selectiveColor?.hue ?? 0}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => applyChange((s) => ({ ...s, selectiveColor: { ...s.selectiveColor, hue: Number(e.target.value) } }))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                      }}
                    />
                  </div>
                  <Slider
                    label="Range"
                    value={editState.selectiveColor?.range ?? 30}
                    onChange={(v: number) => applyChange((s) => ({ ...s, selectiveColor: { ...s.selectiveColor, range: v } }))}
                    min={5}
                    max={90}
                    step={1}
                    defaultValue={30}
                    unit="deg"
                  />
                </div>
              )}
            </div>

            {/* Gradient Map / Duotone */}
            <div className="pt-2 border-t border-zinc-800/50">
              <h4 className="text-[10px] font-medium text-zinc-500/70 uppercase tracking-wider mb-1.5">Duotone</h4>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => applyChange((s) => ({ ...s, gradientMap: { ...(s.gradientMap || {}), enabled: !s.gradientMap?.enabled } }))}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
                    editState.gradientMap?.enabled ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {editState.gradientMap?.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
              {editState.gradientMap?.enabled && (
                <div className="space-y-2">
                  <div className="grid grid-cols-6 gap-1">
                    {[
                      { s: '#1a1a2e', h: '#e8d5b7', n: 'Classic' }, { s: '#00304e', h: '#c1e8ff', n: 'Cyan' },
                      { s: '#2a1a0a', h: '#e8c88a', n: 'Sepia' }, { s: '#0a0a3a', h: '#8888ff', n: 'Night' },
                      { s: '#2d1b3d', h: '#ff9e6d', n: 'Sunset' }, { s: '#0a2a1a', h: '#a8e6a3', n: 'Forest' },
                      { s: '#1a0a2a', h: '#ff6b9d', n: 'IR' }, { s: '#1a1400', h: '#ffd700', n: 'Gold' },
                      { s: '#0a1a2a', h: '#e0f0ff', n: 'Ice' }, { s: '#0d0221', h: '#ff00ff', n: 'Neon' },
                      { s: '#1a0505', h: '#ff4422', n: 'Ember' }, { s: '#001122', h: '#44ddaa', n: 'Ocean' },
                    ].map((p, i) => (
                      <button
                        key={i}
                        onClick={() => applyChange((s) => ({ ...s, gradientMap: { ...s.gradientMap, shadows: p.s, highlights: p.h } }))}
                        className="rounded overflow-hidden"
                        title={p.n}
                      >
                        <div className="h-5 w-full" style={{ background: `linear-gradient(90deg, ${p.s}, ${p.h})` }} />
                      </button>
                    ))}
                  </div>
                  <Slider
                    label="Intensity"
                    value={Math.round((editState.gradientMap?.intensity ?? 0.7) * 100)}
                    onChange={(v: number) => applyChange((s) => ({ ...s, gradientMap: { ...s.gradientMap, intensity: v / 100 } }))}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                  />
                </div>
              )}
            </div>

            {/* Light Leaks */}
            <div className="pt-2 border-t border-zinc-800/50">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Light Leaks</h4>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {LIGHT_LEAK_PRESETS.map((ll) => (
                  <button
                    key={ll.id}
                    onClick={() =>
                      applyChange((s) => ({
                        ...s,
                        lightLeak: {
                          ...s.lightLeak,
                          type: ll.id,
                          intensity: ll.id === 'none' ? 0 : (s.lightLeak?.intensity || 0.5),
                        },
                      }))
                    }
                    className={`shrink-0 py-1.5 px-3 text-xs rounded-full transition-colors ${
                      editState.lightLeak?.type === ll.id ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {ll.name}
                  </button>
                ))}
              </div>
              {editState.lightLeak?.type && editState.lightLeak.type !== 'none' && (
                <div className="mt-2">
                  <Slider
                    label="Intensity"
                    value={editState.lightLeak?.intensity ?? 0.5}
                    onChange={(v: number) => applyChange((s) => ({ ...s, lightLeak: { ...s.lightLeak, intensity: v } }))}
                    min={0}
                    max={1}
                    step={0.05}
                    defaultValue={0.5}
                  />
                </div>
              )}
            </div>

            {/* Chromatic Aberration */}
            <div className="pt-2 border-t border-zinc-800/50">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Chromatic Aberration</h4>
              <Slider
                label="CA"
                value={editState.chromaticAberration ?? 0}
                onChange={(v: number) => applyChange({ chromaticAberration: v })}
                min={0}
                max={20}
                step={1}
              />
            </div>

            {/* Sharpen */}
            <div className="pt-2 border-t border-zinc-800/50">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Sharpen</h4>
              <Slider
                label="Amount"
                value={editState.sharpen ?? 0}
                onChange={(v: number) => applyChange({ sharpen: v })}
                min={0}
                max={100}
                step={1}
              />
            </div>

            {/* Glitch */}
            <div className="pt-2 border-t border-zinc-800/50">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Glitch</h4>
              <Slider
                label="Intensity"
                value={editState.glitch ?? 0}
                onChange={(v: number) => applyChange({ glitch: v })}
                min={0}
                max={100}
                step={1}
              />
            </div>

            {/* Oil Paint */}
            <div className="pt-2 border-t border-zinc-800/50">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Oil Paint</h4>
              <Slider
                label="Radius"
                value={editState.oilPaint ?? 0}
                onChange={(v: number) => applyChange({ oilPaint: v })}
                min={0}
                max={10}
                step={1}
              />
            </div>

            {/* Posterize */}
            <div className="pt-2 border-t border-zinc-800/50">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Posterize</h4>
              <Slider label="Levels" value={editState.posterize ?? 0} onChange={(v: number) => applyChange({ posterize: v })} min={0} max={20} step={1} />
              <p className="text-[10px] text-zinc-500 mt-1">0 = off, 2-20 = color levels</p>
            </div>

            {/* Solarize */}
            <div className="pt-2 border-t border-zinc-800/50">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Solarize</h4>
              <Slider label="Threshold" value={editState.solarize ?? 0} onChange={(v: number) => applyChange({ solarize: v })} min={0} max={255} step={1} />
            </div>

            {/* Emboss */}
            <div className="pt-2 border-t border-zinc-800/50">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Emboss</h4>
              <Slider label="Amount" value={editState.emboss ?? 0} onChange={(v: number) => applyChange({ emboss: v })} min={0} max={100} step={1} />
            </div>

            {/* Channel Mixer (simplified) */}
            <div className="pt-2 border-t border-zinc-800/50">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Channel Mixer</h4>
              <div className="space-y-2">
                {([
                  { ch: 'red', label: 'Red', color: '#f87171' },
                  { ch: 'green', label: 'Green', color: '#4ade80' },
                  { ch: 'blue', label: 'Blue', color: '#60a5fa' },
                ] as const).map(({ ch, label, color }) => {
                  const cm = editState.channelMixer || { red: { r: 100, g: 0, b: 0 }, green: { r: 0, g: 100, b: 0 }, blue: { r: 0, g: 0, b: 100 } }
                  const src = ch[0] as 'r' | 'g' | 'b'
                  return (
                    <label key={ch} className="flex items-center gap-2">
                      <span className="text-[10px] w-10 shrink-0" style={{ color }}>{label}</span>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        value={cm[ch]?.[src] ?? 100}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          applyChange({
                            channelMixer: {
                              ...cm,
                              [ch]: { ...cm[ch], [src]: Number(e.target.value) },
                            },
                          })
                        }
                        className="flex-1 accent-indigo-500 h-1"
                      />
                      <span className="text-[10px] text-zinc-500 w-8 text-right font-mono">{cm[ch]?.[src] ?? 100}%</span>
                    </label>
                  )
                })}
                <button
                  onClick={() =>
                    applyChange({
                      channelMixer: {
                        red: { r: 100, g: 0, b: 0 },
                        green: { r: 0, g: 100, b: 0 },
                        blue: { r: 0, g: 0, b: 100 },
                      },
                    })
                  }
                  className="w-full py-1 text-[10px] text-zinc-500 hover:text-zinc-300 bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setSubPanel('curves')} className="flex-1 py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg">Curves</button>
              <button onClick={() => setSubPanel('masks')} className="flex-1 py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg">Masks</button>
              <button onClick={() => applyChange(INITIAL_EDIT_STATE)} className="flex-1 py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg">Reset</button>
            </div>
          </div>
        )

      case 'filters':
        return (
          <div className="space-y-3 px-1">
            <div>
              <h4 className="text-[10px] font-medium text-zinc-500/70 uppercase tracking-wider mb-1.5">Film Emulation</h4>
              <div className="flex gap-1 mb-1.5">
                {['classic', 'trending'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilmTab(cat)}
                    className={`px-2 py-0.5 text-[9px] rounded-full transition-colors capitalize ${
                      filmTab === cat ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => applyChange({ filmEmulation: null, filmGrain: 0 })}
                  className={`shrink-0 py-1.5 px-3 text-xs rounded-full transition-colors ${
                    !editState.filmEmulation ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  None
                </button>
                {FILM_EMULATIONS.filter((em) => em.category === filmTab).map((em) => (
                  <button
                    key={em.id}
                    onClick={() => applyChange({ filmEmulation: em.id, filmGrain: em.id === 'koji' ? 0.06 : (editState.filmGrain || 0) })}
                    className={`shrink-0 py-1.5 px-3 text-xs rounded-full transition-colors ${
                      editState.filmEmulation === em.id ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {em.name}
                  </button>
                ))}
              </div>
              {editState.filmEmulation && (
                <div className="mt-2 space-y-2">
                  <Slider label="Intensity" value={editState.filmIntensity ?? 1} onChange={(v: number) => applySliderChange('filmIntensity', v)} min={0.1} max={1} step={0.05} defaultValue={1} />
                  <Slider label="Grain" value={editState.filmGrain ?? 0} onChange={(v: number) => applySliderChange('filmGrain', v)} min={0} max={0.3} step={0.01} defaultValue={0} />
                </div>
              )}
            </div>
            <div>
              <h4 className="text-[10px] font-medium text-zinc-500/70 uppercase tracking-wider mb-1.5">Filters</h4>
              <div className="flex gap-1 flex-wrap mb-1.5">
                {['popular', 'mood', 'style', 'aesthetic', 'trending', 'portrait', 'film', 'retro', 'creative', 'glow', 'y2k', 'film-analog', 'selfie', 'viral'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterTab(cat)}
                    className={`px-2 py-0.5 text-[9px] rounded-full transition-colors capitalize ${
                      filterTab === cat ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
                {FILTER_PRESETS.filter((p) => p.category === 'all' || p.category === filterTab).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyChange({ preset: p.id })}
                    className="shrink-0 flex flex-col items-center gap-1"
                  >
                    <div
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-colors ${
                        preset === p.id ? 'border-indigo-500' : 'border-zinc-700'
                      }`}
                    >
                      {filterPreviews[p.id] ? (
                        <img
                          src={filterPreviews[p.id]}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className={`w-full h-full ${previewsLoading ? 'animate-pulse' : ''} bg-zinc-700`} />
                      )}
                    </div>
                    <span
                      className={`text-[10px] leading-tight ${
                        preset === p.id ? 'text-indigo-400 font-medium' : 'text-zinc-400'
                      }`}
                    >
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-medium text-zinc-500/70 uppercase tracking-wider mb-1.5">LUT</h4>
              <input
                ref={lutInputRef}
                type="file"
                accept=".cube"
                onChange={handleLutImport}
                className="hidden"
              />
              {editState.lutName ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
                    <span className="text-xs text-indigo-400 font-mono truncate flex-1">{editState.lutName}</span>
                    <button
                      onClick={() => applyChange((s) => ({ ...s, lut: null, lutName: null }))}
                      className="text-xs text-red-400 hover:text-red-300 shrink-0"
                    >
                      Clear
                    </button>
                  </div>
                  <button
                    onClick={() => lutInputRef.current?.click()}
                    className="w-full py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg"
                  >
                    Replace .cube
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => lutInputRef.current?.click()}
                  className="w-full py-2 text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 rounded-lg"
                >
                  Import .cube File
                </button>
              )}
              {lutError && (
                <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                  {lutError}
                </div>
              )}
            </div>
          </div>
        )

      case 'resize':
        return (
          <div className="space-y-3 px-1">
            {imageDims && (
              <p className="text-xs text-zinc-500">
                Original: {imageDims.w} × {imageDims.h}px
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Width</label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={editState.resize?.width || ''}
                  placeholder={String(imageDims?.w || '0')}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleResizeWidth(Number(e.target.value) || 0)}
                  className="w-full bg-zinc-800 px-2 py-1.5 rounded text-sm text-zinc-200"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Height</label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={editState.resize?.height || ''}
                  placeholder={String(imageDims?.h || '0')}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleResizeHeight(Number(e.target.value) || 0)}
                  className="w-full bg-zinc-800 px-2 py-1.5 rounded text-sm text-zinc-200"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => applyChange((s) => ({ ...s, resize: { ...s.resize, lockAspect: !s.resize?.lockAspect } }))}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  editState.resize?.lockAspect ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'
                }`}
              >
                {editState.resize?.lockAspect ? '🔒 Locked' : '🔓 Unlocked'}
              </button>
              <span className="text-[10px] text-zinc-500">Aspect ratio</span>
            </div>
            {(editState.resize?.width > 0 || editState.resize?.height > 0) && (
              <button
                onClick={() => applyChange((s) => ({ ...s, resize: { width: 0, height: 0, lockAspect: true } }))}
                className="w-full py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg"
              >
                Reset to Original
              </button>
            )}
          </div>
        )

      case 'crop':
        if (subPanel === 'transform') {
          return (
            <div className="px-1 space-y-3">
              <h4 className="text-[10px] font-medium text-zinc-500/70 uppercase tracking-wider">Transform</h4>
              <Slider
                label="Horizontal"
                value={editState.perspective?.horizontal ?? 0}
                onChange={(v: number) => applyChange((s) => ({ ...s, perspective: { ...(s.perspective ?? { horizontal: 0, vertical: 0, rotation: 0 }), horizontal: v } }))}
                min={-45}
                max={45}
                step={0.5}
                defaultValue={0}
                unit="deg"
              />
              <Slider
                label="Vertical"
                value={editState.perspective?.vertical ?? 0}
                onChange={(v: number) => applyChange((s) => ({ ...s, perspective: { ...(s.perspective ?? { horizontal: 0, vertical: 0, rotation: 0 }), vertical: v } }))}
                min={-45}
                max={45}
                step={0.5}
                defaultValue={0}
                unit="deg"
              />
              <Slider
                label="Fine rotation"
                value={editState.perspective?.rotation ?? 0}
                onChange={(v: number) => applyChange((s) => ({ ...s, perspective: { ...(s.perspective ?? { horizontal: 0, vertical: 0, rotation: 0 }), rotation: v } }))}
                min={-180}
                max={180}
                step={0.1}
                defaultValue={0}
                unit="deg"
              />
              <button
                onClick={() =>
                  applyChange((s) => ({ ...s, perspective: { horizontal: 0, vertical: 0, rotation: 0 } }))
                }
                className="w-full py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg"
              >
                Reset Transform
              </button>
            </div>
          )
        }
        return (
          <div className="px-1">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CROP_RATIOS.map((r) => (
                <button
                  key={r}
                  onClick={() => applyChange({ cropRatio: r, customCrop: r === 'custom' ? { x: 0, y: 0, w: 1, h: 1 } : null })}
                  className={`shrink-0 py-1.5 px-3 text-xs rounded-full transition-colors ${
                    cropRatio === r ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {ratioLabels[r] ?? r}
                </button>
              ))}
              <button
                onClick={handlePortraitCrop}
                disabled={portraitCropLoading || !imageSrc}
                className="shrink-0 py-1.5 px-3 text-xs rounded-full transition-colors bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {portraitCropLoading ? 'Detecting...' : 'Portrait'}
              </button>
            </div>
            {portraitCropError && (
              <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                {portraitCropError}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button onClick={() => applyChange((s) => ({ ...s, rotation: (s.rotation - 90 + 360) % 360 }))} className="flex-1 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg">↺ -90°</button>
              <button onClick={() => applyChange((s) => ({ ...s, rotation: (s.rotation + 90) % 360 }))} className="flex-1 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg">↻ 90°</button>
              <button
                onClick={() => applyChange((s) => ({ ...s, flipH: !s.flipH }))}
                className={`flex-1 py-2 text-sm rounded-lg ${editState.flipH ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'}`}
              >
                ↔
              </button>
              <button
                onClick={() => applyChange((s) => ({ ...s, flipV: !s.flipV }))}
                className={`flex-1 py-2 text-sm rounded-lg ${editState.flipV ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'}`}
              >
                ↕
              </button>
            </div>
            <button
              onClick={() => setSubPanel('transform')}
              className="mt-2 w-full py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg"
            >
              Transform / Perspective
            </button>
            {cropRatio !== 'original' && (
              <button
                onClick={() => applyChange({ cropRatio: 'original', customCrop: null })}
                className="mt-2 w-full py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg"
              >
                Reset Crop
              </button>
            )}
          </div>
        )

      case 'frames':
        return (
          <div className="space-y-3 px-1">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {FRAME_PRESETS.map((fp) => (
                <button
                  key={fp.id}
                  onClick={() =>
                    applyChange((s) => ({
                      ...s,
                      frame: {
                        ...s.frame,
                        type: fp.id,
                        width: fp.id === 'none' ? 0 : Math.max(s.frame?.width || 0, 10),
                      },
                    }))
                  }
                  className={`shrink-0 py-1.5 px-3 text-xs rounded-full transition-colors ${
                    editState.frame?.type === fp.id ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {fp.name}
                </button>
              ))}
            </div>
            {editState.frame?.type && editState.frame.type !== 'none' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">Color</span>
                  <input
                    type="color"
                    value={editState.frame?.color || '#ffffff'}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      applyChange((s) => ({ ...s, frame: { ...s.frame, color: e.target.value } }))
                    }
                    className="w-8 h-8 rounded cursor-pointer border border-zinc-700"
                  />
                </div>
                <Slider
                  label="Width"
                  value={editState.frame?.width ?? 10}
                  onChange={(v: number) =>
                    applyChange((s) => ({ ...s, frame: { ...s.frame, width: v } }))
                  }
                  min={0}
                  max={50}
                  step={1}
                  defaultValue={10}
                  unit="px"
                />
              </div>
            )}
          </div>
        )

      case 'color':
        return (
          <Suspense fallback={<PanelLoader />}>
            <div className="space-y-4 px-1">
              <HSLPanel
                hsl={editState.hsl}
                onChange={(colorId: string, channel: string, value: number) =>
                  applyChange((s) => ({ ...s, hsl: { ...s.hsl, [colorId]: { ...s.hsl[colorId], [channel]: value } } }))
                }
              />
              <ColorWheelPanel
                colorGrade={editState.colorGrade}
                onChange={(zone: string, val: { r: number; g: number; b: number }) =>
                  applyChange((s) => ({ ...s, colorGrade: { ...(s.colorGrade || {}), [zone]: val } }))
                }
              />
              <SplitTonePanel
                splitTone={editState.splitTone}
                onChange={(val: EditState['splitTone']) => applyChange((s) => ({ ...s, splitTone: val }))}
              />
            </div>
          </Suspense>
        )

      case 'draw':
        return (
          <div className="space-y-3 px-1">
            <div className="flex gap-2">
              <button
                onClick={() => applyChange({ drawingMode: drawingMode === 'brush' ? null : 'brush' })}
                className={`flex-1 py-2 text-sm rounded-lg ${drawingMode === 'brush' ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'}`}
              >
                Brush
              </button>
              <button
                onClick={() => applyChange({ drawingMode: drawingMode === 'eraser' ? null : 'eraser' })}
                className={`flex-1 py-2 text-sm rounded-lg ${drawingMode === 'eraser' ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'}`}
              >
                Eraser
              </button>
              <button
                onClick={() => applyChange({ drawingMode: drawingMode === 'heal' ? null : 'heal', healSource: null })}
                className={`flex-1 py-2 text-sm rounded-lg ${drawingMode === 'heal' ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'}`}
              >
                Heal
              </button>
              <button
                onClick={() => applyChange({ drawingMode: drawingMode === 'blur' ? null : 'blur' })}
                className={`flex-1 py-2 text-sm rounded-lg ${drawingMode === 'blur' ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'}`}
              >
                Blur
              </button>
              <button
                onClick={() => applyChange({ drawingMode: drawingMode === 'picker' ? null : 'picker' })}
                className={`shrink-0 w-10 h-10 text-sm rounded-lg ${drawingMode === 'picker' ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'}`}
                title="Pick color"
              >
                💧
              </button>
              <button
                onClick={() => applyChange({ drawingMode: drawingMode === 'wand' ? null : 'wand', selectionMask: null })}
                className={`shrink-0 w-10 h-10 text-sm rounded-lg ${drawingMode === 'wand' ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'}`}
                title="Magic wand"
              >
                🪄
              </button>
              {drawingMode === 'brush' && (
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => applyChange({ brushColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border border-zinc-700 shrink-0"
                />
              )}
            </div>
            {editState.pickedColor && (
              <div className="flex items-center gap-2 p-2 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
                <span className="w-6 h-6 rounded border border-zinc-600 shrink-0" style={{ background: editState.pickedColor }} />
                <span className="text-xs font-mono text-zinc-200">{editState.pickedColor}</span>
                <button
                  onClick={() => applyChange({ brushColor: editState.pickedColor! })}
                  className="ml-auto text-[10px] text-indigo-400 hover:text-indigo-300"
                >
                  Use as brush
                </button>
              </div>
            )}
            {drawingMode === 'heal' && (
              <div className="p-2 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
                <p className="text-xs text-zinc-400">
                  {editState.healSource
                    ? 'Source set — tap & drag to heal'
                    : 'Tap on the image to set source'}
                </p>
                {editState.healSource && (
                  <button
                    onClick={() => applyChange({ healSource: null })}
                    className="mt-1 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Reset source
                  </button>
                )}
              </div>
            )}
            {drawingMode === 'wand' && (
              <div className="p-2 bg-zinc-800/60 rounded-lg border border-zinc-700/50 space-y-2 mb-2">
                <p className="text-xs text-zinc-400">
                  {editState.selectionMask ? 'Selection active — tap to reselect' : 'Tap to select a color region'}
                </p>
                <Slider label="Tolerance" value={editState.wandTolerance ?? 32} onChange={(v: number) => applyChange({ wandTolerance: v })} min={1} max={100} step={1} />
                {editState.selectionMask && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => {
                          const mask = editState.selectionMask!
                          const inv = new Uint8Array(mask.length)
                          for (let i = 0; i < mask.length; i++) inv[i] = mask[i] >= 128 ? 0 : 255
                          applyChange({ selectionMask: inv })
                        }}
                        className="py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
                      >
                        Invert
                      </button>
                      <button
                        onClick={() => {
                          const canvas = canvasRef?.current
                          if (!canvas) return
                          const f = featherMask(editState.selectionMask!, canvas.width, canvas.height, 4)
                          applyChange({ selectionMask: f })
                        }}
                        className="py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
                      >
                        Feather
                      </button>
                      <button
                        onClick={() => {
                          const canvas = canvasRef?.current
                          if (!canvas) return
                          const ctx = canvas.getContext('2d')
                          if (!ctx) return
                          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                          const d = imageData.data
                          const mask = editState.selectionMask!
                          for (let i = 0; i < mask.length; i++) {
                            if (mask[i] >= 128) d[i * 4 + 3] = 0
                          }
                          ctx.putImageData(imageData, 0, 0)
                        }}
                        className="py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          const canvas = canvasRef?.current
                          if (!canvas) return
                          const ctx = canvas.getContext('2d')
                          if (!ctx) return
                          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                          const d = imageData.data
                          const mask = editState.selectionMask!
                          for (let i = 0; i < mask.length; i++) {
                            if (mask[i] >= 128) {
                              const idx = i * 4
                              const gray = Math.round(d[idx] * 0.299 + d[idx + 1] * 0.587 + d[idx + 2] * 0.114)
                              d[idx] = gray
                              d[idx + 1] = gray
                              d[idx + 2] = gray
                            }
                          }
                          ctx.putImageData(imageData, 0, 0)
                        }}
                        className="py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
                      >
                        Desat
                      </button>
                      <button
                        onClick={() => {
                          const canvas = canvasRef?.current
                          if (!canvas) return
                          const ctx = canvas.getContext('2d')
                          if (!ctx) return
                          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                          const d = imageData.data
                          const mask = editState.selectionMask!
                          for (let i = 0; i < mask.length; i++) {
                            if (mask[i] >= 128) {
                              const idx = i * 4
                              d[idx] = Math.min(255, d[idx] + 30)
                              d[idx + 1] = Math.min(255, d[idx + 1] + 30)
                              d[idx + 2] = Math.min(255, d[idx + 2] + 30)
                            }
                          }
                          ctx.putImageData(imageData, 0, 0)
                        }}
                        className="py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
                      >
                        Bright
                      </button>
                      <button
                        onClick={() => {
                          const canvas = canvasRef?.current
                          if (!canvas) return
                          const ctx = canvas.getContext('2d')
                          if (!ctx) return
                          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                          const d = imageData.data
                          const mask = editState.selectionMask!
                          for (let i = 0; i < mask.length; i++) {
                            if (mask[i] >= 128) {
                              const idx = i * 4
                              d[idx] = Math.max(0, d[idx] - 30)
                              d[idx + 1] = Math.max(0, d[idx + 1] - 30)
                              d[idx + 2] = Math.max(0, d[idx + 2] - 30)
                            }
                          }
                          ctx.putImageData(imageData, 0, 0)
                        }}
                        className="py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
                      >
                        Dark
                      </button>
                    </div>
                    <button
                      onClick={() => applyChange({ selectionMask: null })}
                      className="w-full py-1.5 text-xs bg-red-900/40 hover:bg-red-900/60 text-red-400 rounded-lg transition-colors"
                    >
                      Clear selection
                    </button>
                  </div>
                )}
              </div>
            )}
            <Slider label="Size" value={brushSize} onChange={(v: number) => applySliderChange('brushSize', v)} min={1} max={50} step={1} defaultValue={5} unit="px" />
            <Slider label="Opacity" value={brushOpacity} onChange={(v: number) => applySliderChange('brushOpacity', v)} min={0.1} max={1} step={0.05} defaultValue={1} />
            {brushStrokes?.length > 0 && (
              <button onClick={() => applyChange({ brushStrokes: [] })} className="w-full py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg">
                Clear All Drawings
              </button>
            )}
            <div>
              <h4 className="text-[10px] font-medium text-zinc-500/70 uppercase tracking-wider mb-1.5 mt-2">Quick Shapes</h4>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { type: 'circle', icon: '●' },
                  { type: 'square', icon: '■' },
                  { type: 'triangle', icon: '▲' },
                  { type: 'star', icon: '★' },
                  { type: 'heart', icon: '♥' },
                  { type: 'arrow-right', icon: '→' },
                  { type: 'arrow-up', icon: '↑' },
                ].map(({ type, icon }) => (
                  <button
                    key={type}
                    onClick={() =>
                      applyChange((s) => ({
                        ...s,
                        shapeOverlays: [...(s.shapeOverlays || []), { id: Date.now(), type, x: 0.5, y: 0.5, size: 40, color: '#ffffff', rotation: 0 }],
                      }))
                    }
                    className="shrink-0 w-10 h-10 text-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg"
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 'layers':
        if (subPanel === 'stickers') {
          return (
            <Suspense fallback={<PanelLoader />}>
              <StickerPanel
                onAddSticker={(sticker) =>
                  applyChange((s) => ({
                    ...s,
                    shapeOverlays: [...(s.shapeOverlays || []), sticker as ShapeOverlay],
                  }))
                }
              />
            </Suspense>
          )
        }
        return (
          <div className="space-y-3 px-1">
            <div className="flex gap-2">
              <button
                onClick={onAddText}
                className="flex-1 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg"
              >
                + Add Text
              </button>
              <button
                onClick={() => setSubPanel('stickers')}
                className="flex-1 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg"
              >
                📎 Stickers
              </button>
            </div>
            <Suspense fallback={<PanelLoader />}>
              <LayerPanel
                textOverlays={editState.textOverlays}
                shapeOverlays={editState.shapeOverlays}
                layerVisibility={editState.layerVisibility}
                onToggleVisibility={(id: string | number) =>
                  applyChange((s) => ({
                    ...s,
                    layerVisibility: { ...s.layerVisibility, [String(id)]: s.layerVisibility?.[String(id)] === false },
                  }))
                }
                onReorder={(type: 'text' | 'shape', from: number, to: number) =>
                  applyChange((s) => {
                    const key = type === 'text' ? 'textOverlays' : 'shapeOverlays' as const
                    const arr = [...(s[key] || [])]
                    if (to < 0 || to >= arr.length) return s
                    const [item] = arr.splice(from, 1)
                    arr.splice(to, 0, item)
                    return { ...s, [key]: arr }
                  })
                }
                onDelete={(type: 'text' | 'shape', index: number) =>
                  applyChange((s) => {
                    const key = type === 'text' ? 'textOverlays' : 'shapeOverlays' as const
                    return { ...s, [key]: (s[key] || []).filter((_, i) => i !== index) }
                  })
                }
                onUpdateLayer={(type: 'text' | 'shape', index: number, patch: Record<string, unknown>) =>
                  applyChange((s) => {
                    const key = type === 'text' ? 'textOverlays' : 'shapeOverlays' as const
                    return { ...s, [key]: (s[key] || []).map((item: any, i: number) => i === index ? { ...item, ...patch } : item) }
                  })
                }
              />
            </Suspense>
            {(editState.textOverlays || []).map((t, i) => {
              const updateText = (prop: string, value: unknown) =>
                applyChange((s) => ({
                  ...s,
                  textOverlays: (s.textOverlays || []).map((o, j) => (j === i ? { ...o, [prop]: value } : o)),
                }))
              return (
                <div key={t.id ?? i} className="border border-zinc-700 rounded-lg p-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={t.text ?? ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => updateText('text', e.target.value)}
                      className="flex-1 bg-zinc-800 px-2 py-1 rounded text-sm text-zinc-200"
                      placeholder="Text"
                    />
                    <button
                      onClick={() => setExpandedTextId(expandedTextId === t.id ? null : t.id)}
                      className="text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      ⚙
                    </button>
                    <button
                      onClick={() =>
                        applyChange((s) => ({
                          ...s,
                          textOverlays: (s.textOverlays || []).filter((_, j) => j !== i),
                        }))
                      }
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      ×
                    </button>
                  </div>
                  {expandedTextId === t.id && (
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={t.fontFamily || 'sans-serif'}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => updateText('fontFamily', e.target.value)}
                          className="flex-1 bg-zinc-800 text-sm text-zinc-200 rounded px-2 py-1"
                        >
                          {TEXT_OVERLAY_FONTS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                        <input type="color" value={t.color ?? '#ffffff'} onChange={(e: ChangeEvent<HTMLInputElement>) => updateText('color', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                      </div>
                      <Slider label="Size" value={t.fontSize ?? 32} onChange={(v: number) => updateText('fontSize', Math.round(v))} min={12} max={120} step={1} defaultValue={32} unit="px" />
                      <Slider label="Opacity" value={t.opacity ?? 1} onChange={(v: number) => updateText('opacity', v)} min={0.1} max={1} step={0.05} defaultValue={1} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )

      case 'beauty':
        return (
          <Suspense fallback={<PanelLoader />}>
            <BeautyPanel
              beauty={editState.beauty}
              faceReshape={editState.faceReshape}
              makeup={editState.makeup}
              onUpdate={(changes: Partial<EditState>) => applyChange(changes)}
              onSliderUpdate={(changes: ((prev: EditState) => EditState) | Partial<EditState>) => applyNestedSliderChange(changes)}
              beautyProcessing={beautyProcessing}
            />
          </Suspense>
        )

      case 'funai':
        return (
          <Suspense fallback={<PanelLoader />}>
            <FunAIPanel
              emotion={editState.emotion}
              ageTransform={editState.ageTransform}
              onUpdate={(changes: Partial<EditState>) => applyChange(changes)}
              onSliderUpdate={(changes: ((prev: EditState) => EditState) | Partial<EditState>) => applyNestedSliderChange(changes)}
              processing={beautyProcessing}
              faceKeypoints={faceKeypoints}
            />
          </Suspense>
        )

      case 'stickers':
        return (
          <Suspense fallback={<PanelLoader />}>
            <FaceStickersPanel
              faceStickers={editState.faceStickers ?? []}
              faceKeypoints={faceKeypoints}
              onUpdate={(changes: Partial<EditState>) => applyChange(changes)}
            />
          </Suspense>
        )

      case 'effects':
        return (
          <Suspense fallback={<PanelLoader />}>
            <EffectsPanel
              effectOverlay={editState.effectOverlay}
              onUpdate={(changes: Partial<EditState>) => applyChange(changes)}
              onSliderUpdate={(changes: ((prev: EditState) => EditState) | Partial<EditState>) => applyNestedSliderChange(changes)}
            />
          </Suspense>
        )

      case 'ai':
        return (
          <Suspense fallback={<PanelLoader />}>
            <AIToolsPanel
              imageSrc={imageSrc}
              onImageReplace={onImageReplace}
              canvasRef={canvasRef}
              onApplyChange={onApplyChange}
            />
          </Suspense>
        )

      case 'templates':
        return (
          <Suspense fallback={<PanelLoader />}>
            <TemplatePanel applyChange={applyChange} editState={editState} />
            <div className="mt-4">
              <ImageInfoPanel imageSrc={imageSrc} />
            </div>
          </Suspense>
        )

      case 'score':
        return (
          <Suspense fallback={<PanelLoader />}>
            <PhotoScorePanel canvasRef={canvasRef} />
          </Suspense>
        )

      case 'quotes':
        return (
          <Suspense fallback={<PanelLoader />}>
            <MoodQuotesPanel
              canvasRef={canvasRef}
              faceKeypoints={faceKeypoints}
              onUpdate={(changes: Partial<EditState>) => applyChange(changes)}
              textOverlays={editState.textOverlays ?? []}
            />
          </Suspense>
        )

      case 'splash':
        return (
          <Suspense fallback={<PanelLoader />}>
            <ColorSplashPanel
              colorSplash={editState.colorSplash}
              onUpdate={(changes: Partial<EditState>) => applyChange(changes)}
              onSliderUpdate={(changes: ((prev: EditState) => EditState) | Partial<EditState>) => applyNestedSliderChange(changes)}
            />
          </Suspense>
        )

      case 'mirror':
        return (
          <Suspense fallback={<PanelLoader />}>
            <MirrorEffectPanel
              mirrorEffect={editState.mirrorEffect}
              onUpdate={(changes: Partial<EditState>) => applyChange(changes)}
            />
          </Suspense>
        )

      case 'datestamp':
        return (
          <Suspense fallback={<PanelLoader />}>
            <DateStampPanel
              dateStamp={editState.dateStamp}
              onUpdate={(changes: Partial<EditState>) => applyChange(changes)}
            />
          </Suspense>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none lg:hidden">
      {/* Slide-up panel */}
      {activeCategory && (
        <div
          ref={panelRef}
          className="pointer-events-auto bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-700/50 rounded-t-2xl max-h-[38vh] overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-xl px-4 pt-2 pb-1.5 flex items-center justify-between border-b border-zinc-800/50">
            {subPanel ? (
              <button onClick={() => setSubPanel(null)} className="text-xs text-indigo-400">← Back</button>
            ) : (
              <span className="text-xs font-medium text-zinc-300 capitalize">{activeCategory}</span>
            )}
            <button onClick={() => { setActiveCategory(null); setSubPanel(null) }} className="text-xs text-zinc-500">Done</button>
          </div>
          <div className="px-3 py-2">
            {renderPanel()}
          </div>
        </div>
      )}

      {/* More overflow grid */}
      {showMore && (
        <div
          ref={moreRef}
          className="pointer-events-auto bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-700/50 rounded-t-2xl px-4 pt-3 pb-2"
        >
          <div className="grid grid-cols-3 gap-2">
            {MORE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => toggleCategory(tab.id)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-colors ${
                  activeCategory === tab.id
                    ? 'bg-indigo-500/15 text-indigo-400'
                    : 'text-zinc-400 active:bg-zinc-800 hover:bg-zinc-800/50'
                }`}
              >
                <span className="text-xl leading-none">{tab.icon}</span>
                <span className="text-[11px] leading-tight">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Primary tab bar */}
      <div className="pointer-events-auto bg-zinc-900/85 backdrop-blur-xl border-t border-zinc-700/50 safe-area-bottom">
        <div className="flex justify-around px-1 py-2">
          {PRIMARY_TABS.map((cat) => (
            <button
              key={cat.id}
              data-tour={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[48px] ${
                activeCategory === cat.id
                  ? 'text-indigo-400'
                  : 'text-zinc-400 active:text-zinc-200'
              }`}
            >
              <span className="text-lg leading-none">{cat.icon}</span>
              <span className="text-[10px] leading-tight">{cat.label}</span>
            </button>
          ))}
          <button
            onClick={() => setShowMore((v) => !v)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[48px] ${
              showMore || isMoreTabActive
                ? 'text-indigo-400'
                : 'text-zinc-400 active:text-zinc-200'
            }`}
          >
            <span className="text-lg leading-none">⋯</span>
            <span className="text-[10px] leading-tight">More</span>
          </button>
        </div>
      </div>
    </div>
  )
}
