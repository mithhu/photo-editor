import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react'
import { Slider } from './Slider'
import { SuggestionChips } from './SuggestionChips'
import { FILTER_PRESETS, INITIAL_EDIT_STATE, TEXT_OVERLAY_FONTS } from '../constants'
import { CROP_RATIOS } from '../utils/cropUtils'
import { FILM_EMULATIONS } from '../utils/filmEmulation'
import { useFilterPreviews } from '../hooks/useFilterPreviews'
import { useExposureSuggestions } from '../hooks/useExposureSuggestions'

const HSLPanel = lazy(() => import('./HSLPanel').then((m) => ({ default: m.HSLPanel })))
const CurvesPanel = lazy(() => import('./CurvesPanel').then((m) => ({ default: m.CurvesPanel })))
const ColorWheelPanel = lazy(() => import('./ColorWheelPanel').then((m) => ({ default: m.ColorWheelPanel })))
const SplitTonePanel = lazy(() => import('./SplitTonePanel').then((m) => ({ default: m.SplitTonePanel })))
const MaskPanel = lazy(() => import('./MaskPanel').then((m) => ({ default: m.MaskPanel })))
const AIToolsPanel = lazy(() => import('./AIToolsPanel').then((m) => ({ default: m.AIToolsPanel })))
const TemplatePanel = lazy(() => import('./TemplatePanel').then((m) => ({ default: m.TemplatePanel })))

const CATEGORIES = [
  { id: 'adjust', icon: '☀', label: 'Adjust' },
  { id: 'filters', icon: '✦', label: 'Filters' },
  { id: 'crop', icon: '⬡', label: 'Crop' },
  { id: 'color', icon: '🎨', label: 'Color' },
  { id: 'draw', icon: '✎', label: 'Draw' },
  { id: 'layers', icon: '◫', label: 'Layers' },
  { id: 'ai', icon: '⚡', label: 'AI' },
  { id: 'templates', icon: '▦', label: 'More' },
]

function PanelLoader() {
  return <div className="flex items-center justify-center py-4 text-zinc-500 text-xs">Loading...</div>
}

export function MobileBottomTray({
  editState,
  applyChange,
  applySliderChange,
  onAddText,
  imageSrc,
  onImageReplace,
  canvasRef,
  onApplyChange,
}) {
  const [activeCategory, setActiveCategory] = useState(null)
  const [subPanel, setSubPanel] = useState(null)
  const panelRef = useRef(null)
  const [expandedTextId, setExpandedTextId] = useState(null)
  const { previews: filterPreviews, loading: previewsLoading } = useFilterPreviews(imageSrc)
  const { suggestions: exposureSuggestions, loading: exposureLoading, analyze: analyzeExposure } = useExposureSuggestions(canvasRef)

  const {
    brightness, contrast, saturation, exposure, highlights, shadows,
    warmth, tint, vibrance, clarity, dehaze, vignette,
    cropRatio, preset, drawingMode, brushColor, brushSize, brushOpacity, brushStrokes,
  } = editState

  const ratioLabels = { original: 'Original', '1:1': '1:1', '4:5': '4:5', '16:9': '16:9', '9:16': '9:16', '3:4': '3:4', '2:3': '2:3', custom: 'Custom' }

  const toggleCategory = useCallback((id) => {
    setActiveCategory((prev) => {
      if (prev === id) return null
      setSubPanel(null)
      return id
    })
  }, [])

  useEffect(() => {
    if (!activeCategory) return
    const handleBack = (e) => {
      if (e.key === 'Escape') {
        setActiveCategory(null)
        setSubPanel(null)
      }
    }
    window.addEventListener('keydown', handleBack)
    return () => window.removeEventListener('keydown', handleBack)
  }, [activeCategory])

  const renderPanel = () => {
    switch (activeCategory) {
      case 'adjust':
        if (subPanel === 'curves') {
          return (
            <Suspense fallback={<PanelLoader />}>
              <CurvesPanel
                curves={editState.curves}
                onChange={(channel, points) =>
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
                masks={editState.masks || []}
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
                onApply={(changes) => applyChange((s) => ({ ...s, ...changes }))}
              />
            </div>
            <Slider label="Brightness" value={brightness} onChange={(v) => applySliderChange('brightness', v)} defaultValue={1} />
            <Slider label="Contrast" value={contrast} onChange={(v) => applySliderChange('contrast', v)} defaultValue={1} />
            <Slider label="Saturation" value={saturation} onChange={(v) => applySliderChange('saturation', v)} defaultValue={1} />
            <Slider label="Exposure" value={exposure} onChange={(v) => applySliderChange('exposure', v)} min={0.5} max={1.5} defaultValue={1} />
            <Slider label="Highlights" value={highlights} onChange={(v) => applySliderChange('highlights', v)} min={0.5} max={1.5} defaultValue={1} />
            <Slider label="Shadows" value={shadows} onChange={(v) => applySliderChange('shadows', v)} min={0.5} max={1.5} defaultValue={1} />
            <Slider label="Warmth" value={warmth} onChange={(v) => applySliderChange('warmth', v)} min={-1} max={1} defaultValue={0} />
            <Slider label="Tint" value={tint} onChange={(v) => applySliderChange('tint', v)} min={-1} max={1} defaultValue={0} />
            <Slider label="Vibrance" value={vibrance} onChange={(v) => applySliderChange('vibrance', v)} min={-1} max={1} defaultValue={0} />
            <Slider label="Clarity" value={clarity} onChange={(v) => applySliderChange('clarity', v)} min={-1} max={1} defaultValue={0} />
            <Slider label="Dehaze" value={dehaze} onChange={(v) => applySliderChange('dehaze', v)} min={-1} max={1} defaultValue={0} />
            <Slider label="Vignette" value={vignette} onChange={(v) => applySliderChange('vignette', v)} min={0} max={1} defaultValue={0} />
            <div className="flex gap-2 pt-2">
              <button onClick={() => setSubPanel('curves')} className="flex-1 py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg">Curves</button>
              <button onClick={() => setSubPanel('masks')} className="flex-1 py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg">Masks</button>
              <button onClick={() => applyChange(INITIAL_EDIT_STATE)} className="flex-1 py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg">Reset</button>
            </div>
          </div>
        )

      case 'filters':
        return (
          <div className="space-y-4 px-1">
            <div>
              <h4 className="text-xs font-medium text-zinc-400 mb-2">Film Emulation</h4>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => applyChange({ filmEmulation: null, filmGrain: 0 })}
                  className={`shrink-0 py-1.5 px-3 text-xs rounded-full transition-colors ${
                    !editState.filmEmulation ? 'bg-amber-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  None
                </button>
                {FILM_EMULATIONS.map((em) => (
                  <button
                    key={em.id}
                    onClick={() => applyChange({ filmEmulation: em.id, filmGrain: em.id === 'koji' ? 0.06 : (editState.filmGrain || 0) })}
                    className={`shrink-0 py-1.5 px-3 text-xs rounded-full transition-colors ${
                      editState.filmEmulation === em.id ? 'bg-amber-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {em.name}
                  </button>
                ))}
              </div>
              {editState.filmEmulation && (
                <div className="mt-2 space-y-2">
                  <Slider label="Intensity" value={editState.filmIntensity ?? 1} onChange={(v) => applySliderChange('filmIntensity', v)} min={0.1} max={1} step={0.05} defaultValue={1} />
                  <Slider label="Grain" value={editState.filmGrain ?? 0} onChange={(v) => applySliderChange('filmGrain', v)} min={0} max={0.3} step={0.01} defaultValue={0} />
                </div>
              )}
            </div>
            <div>
              <h4 className="text-xs font-medium text-zinc-400 mb-2">Filters</h4>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
                {FILTER_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyChange({ preset: p.id })}
                    className="shrink-0 flex flex-col items-center gap-1"
                  >
                    <div
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-colors ${
                        preset === p.id ? 'border-amber-500' : 'border-zinc-700'
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
                        preset === p.id ? 'text-amber-400 font-medium' : 'text-zinc-400'
                      }`}
                    >
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 'crop':
        return (
          <div className="px-1">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CROP_RATIOS.map((r) => (
                <button
                  key={r}
                  onClick={() => applyChange({ cropRatio: r, customCrop: r === 'custom' ? { x: 0, y: 0, w: 1, h: 1 } : null })}
                  className={`shrink-0 py-1.5 px-3 text-xs rounded-full transition-colors ${
                    cropRatio === r ? 'bg-amber-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {ratioLabels[r] ?? r}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => applyChange((s) => ({ ...s, rotation: (s.rotation - 90 + 360) % 360 }))} className="flex-1 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg">↺ -90°</button>
              <button onClick={() => applyChange((s) => ({ ...s, rotation: (s.rotation + 90) % 360 }))} className="flex-1 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg">↻ 90°</button>
              <button
                onClick={() => applyChange((s) => ({ ...s, flipH: !s.flipH }))}
                className={`flex-1 py-2 text-sm rounded-lg ${editState.flipH ? 'bg-amber-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'}`}
              >
                ↔
              </button>
              <button
                onClick={() => applyChange((s) => ({ ...s, flipV: !s.flipV }))}
                className={`flex-1 py-2 text-sm rounded-lg ${editState.flipV ? 'bg-amber-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'}`}
              >
                ↕
              </button>
            </div>
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

      case 'color':
        return (
          <Suspense fallback={<PanelLoader />}>
            <div className="space-y-4 px-1">
              <HSLPanel
                hsl={editState.hsl}
                onChange={(colorId, channel, value) =>
                  applyChange((s) => ({ ...s, hsl: { ...s.hsl, [colorId]: { ...s.hsl[colorId], [channel]: value } } }))
                }
              />
              <ColorWheelPanel
                colorGrade={editState.colorGrade}
                onChange={(zone, val) =>
                  applyChange((s) => ({ ...s, colorGrade: { ...(s.colorGrade || {}), [zone]: val } }))
                }
              />
              <SplitTonePanel
                splitTone={editState.splitTone}
                onChange={(val) => applyChange((s) => ({ ...s, splitTone: val }))}
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
                className={`flex-1 py-2 text-sm rounded-lg ${drawingMode === 'brush' ? 'bg-amber-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'}`}
              >
                Brush
              </button>
              <button
                onClick={() => applyChange({ drawingMode: drawingMode === 'eraser' ? null : 'eraser' })}
                className={`flex-1 py-2 text-sm rounded-lg ${drawingMode === 'eraser' ? 'bg-amber-500 text-zinc-900 font-medium' : 'bg-zinc-700 text-zinc-300'}`}
              >
                Eraser
              </button>
              {drawingMode === 'brush' && (
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => applyChange({ brushColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border border-zinc-700 shrink-0"
                />
              )}
            </div>
            <Slider label="Size" value={brushSize} onChange={(v) => applySliderChange('brushSize', v)} min={1} max={50} step={1} defaultValue={5} unit="px" />
            <Slider label="Opacity" value={brushOpacity} onChange={(v) => applySliderChange('brushOpacity', v)} min={0.1} max={1} step={0.05} defaultValue={1} />
            {brushStrokes?.length > 0 && (
              <button onClick={() => applyChange({ brushStrokes: [] })} className="w-full py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg">
                Clear All Drawings
              </button>
            )}
            <div>
              <h4 className="text-xs font-medium text-zinc-400 mb-2 mt-2">Quick Shapes</h4>
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
        return (
          <div className="space-y-3 px-1">
            <button
              onClick={onAddText}
              className="w-full py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg"
            >
              + Add Text
            </button>
            {(editState.textOverlays || []).map((t, i) => {
              const updateText = (prop, value) =>
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
                      onChange={(e) => updateText('text', e.target.value)}
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
                          onChange={(e) => updateText('fontFamily', e.target.value)}
                          className="flex-1 bg-zinc-800 text-sm text-zinc-200 rounded px-2 py-1"
                        >
                          {TEXT_OVERLAY_FONTS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                        <input type="color" value={t.color ?? '#ffffff'} onChange={(e) => updateText('color', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                      </div>
                      <Slider label="Size" value={t.fontSize ?? 32} onChange={(v) => updateText('fontSize', Math.round(v))} min={12} max={120} step={1} defaultValue={32} unit="px" />
                      <Slider label="Opacity" value={t.opacity ?? 1} onChange={(v) => updateText('opacity', v)} min={0.1} max={1} step={0.05} defaultValue={1} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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
          className="pointer-events-auto bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-700/50 rounded-t-2xl max-h-[45vh] overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-xl px-4 pt-3 pb-2 flex items-center justify-between border-b border-zinc-800/50">
            {subPanel ? (
              <button onClick={() => setSubPanel(null)} className="text-xs text-amber-400">← Back</button>
            ) : (
              <span className="text-xs font-medium text-zinc-300 capitalize">{activeCategory}</span>
            )}
            <button onClick={() => { setActiveCategory(null); setSubPanel(null) }} className="text-xs text-zinc-500">Done</button>
          </div>
          <div className="p-4">
            {renderPanel()}
          </div>
        </div>
      )}

      {/* Category icon bar */}
      <div className="pointer-events-auto bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-700/50 safe-area-bottom">
        <div className="flex justify-around px-2 py-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg transition-colors min-w-[44px] ${
                activeCategory === cat.id
                  ? 'text-amber-400'
                  : 'text-zinc-400 active:text-zinc-200'
              }`}
            >
              <span className="text-lg leading-none">{cat.icon}</span>
              <span className="text-[10px] leading-tight">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
