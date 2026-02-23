import { useState, useRef, useEffect, useCallback, type RefObject, type ChangeEvent, type ReactNode } from 'react'
import { Slider } from './Slider'
import { SuggestionChips } from './SuggestionChips'
import { HSLPanel } from './HSLPanel'
import { ColorWheelPanel } from './ColorWheelPanel'
import { SplitTonePanel } from './SplitTonePanel'
import { CurvesPanel } from './CurvesPanel'
import { MaskPanel, type Mask } from './MaskPanel'
import { LayerPanel } from './LayerPanel'
import { StickerPanel } from './StickerPanel'
import { AIToolsPanel } from './AIToolsPanel'
import { TemplatePanel } from './TemplatePanel'
import { ImageInfoPanel } from './ImageInfoPanel'
import { HistogramPanel } from './HistogramPanel'
import { GradientMapPanel } from './GradientMapPanel'
import { ChannelMixerPanel } from './ChannelMixerPanel'
import { BeautyPanel } from './BeautyPanel'
import { FunAIPanel } from './FunAIPanel'
import { FILTER_PRESETS, INITIAL_EDIT_STATE, TEXT_OVERLAY_FONTS, FRAME_PRESETS, LIGHT_LEAK_PRESETS } from '../constants'
import { CROP_RATIOS } from '../utils/cropUtils'
import { FILM_EMULATIONS } from '../utils/filmEmulation'
import { useFilterPreviews } from '../hooks/useFilterPreviews'
import { useExposureSuggestions } from '../hooks/useExposureSuggestions'
import { usePortraitCrop } from '../hooks/usePortraitCrop'
import { parseCubeLUT } from '../utils/lutParser'
import { featherMask } from '../utils/magicWand'
import type { EditState, ShapeOverlay, FaceKeypoint } from '../types'

interface DrawingTool {
  id: string
  label: string
  extra: Record<string, unknown>
  icon: ReactNode
}

interface ShapeConfig {
  type: string
  icon: string
}

interface WhiteBalancePreset {
  label: string
  warmth: number
  tint: number
}

interface ImageDims {
  w: number
  h: number
}

export interface EditorSidebarProps {
  editState: EditState
  applyChange: (updater: ((prev: EditState) => EditState) | Partial<EditState>) => void
  applySliderChange: (key: string, value: number) => void
  applyNestedSliderChange: (updater: ((prev: EditState) => EditState) | Partial<EditState>) => void
  beautyProcessing: boolean
  faceKeypoints: FaceKeypoint[] | null
  onAddText: () => void
  historyIndex: number
  historyLength: number
  imageSrc: string | null
  onImageReplace: (src: string) => void
  canvasRef: RefObject<HTMLCanvasElement | null>
  onApplyChange: (updater: ((prev: EditState) => EditState) | Partial<EditState>) => void
}

const ratioLabels: Record<string, string> = {
  original: 'Original',
  '1:1': '1:1',
  '4:5': '4:5',
  '16:9': '16:9',
  '9:16': '9:16',
  '3:4': '3:4',
  '2:3': '2:3',
  custom: 'Custom',
}

export function EditorSidebar({
  editState,
  applyChange,
  applySliderChange,
  applyNestedSliderChange,
  beautyProcessing,
  faceKeypoints,
  onAddText,
  historyIndex,
  historyLength,
  imageSrc,
  onImageReplace,
  canvasRef,
  onApplyChange,
}: EditorSidebarProps) {
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
    brightness,
    contrast,
    saturation,
    exposure,
    highlights,
    shadows,
    warmth,
    tint,
    vibrance,
    clarity,
    dehaze,
    vignette,
    cropRatio,
    preset,
    drawingMode,
    brushColor,
    brushSize,
    brushOpacity,
    brushStrokes,
  } = editState

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

  return (
    <aside className="w-80 flex-shrink lg:min-h-0 flex flex-col gap-6 overflow-y-auto">
      {/* AI Tools */}
      <div>
        <AIToolsPanel
          imageSrc={imageSrc}
          onImageReplace={onImageReplace}
          canvasRef={canvasRef}
          onApplyChange={onApplyChange}
        />
      </div>

      {/* AI Beauty */}
      <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
        <BeautyPanel
          beauty={editState.beauty}
          faceReshape={editState.faceReshape}
          makeup={editState.makeup}
          onUpdate={(changes: Partial<EditState>) => applyChange(changes)}
          onSliderUpdate={(changes: ((prev: EditState) => EditState) | Partial<EditState>) => applyNestedSliderChange(changes)}
          beautyProcessing={beautyProcessing}
        />
      </div>

      {/* Fun AI */}
      <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
        <FunAIPanel
          emotion={editState.emotion}
          ageTransform={editState.ageTransform}
          onUpdate={(changes: Partial<EditState>) => applyChange(changes)}
          onSliderUpdate={(changes: ((prev: EditState) => EditState) | Partial<EditState>) => applyNestedSliderChange(changes)}
          processing={beautyProcessing}
          faceKeypoints={faceKeypoints}
        />
      </div>

      {/* Adjustments + Curves */}
      <div>
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Adjustments</h3>
          <div className="mb-4 pb-3 border-b border-zinc-700/50">
            <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-2">Suggestions</h4>
            <SuggestionChips
              suggestions={exposureSuggestions}
              loading={exposureLoading}
              onAnalyze={analyzeExposure}
              onApply={(changes: Partial<EditState>) => applyChange((s) => ({ ...s, ...changes }))}
            />
          </div>
          <div className="space-y-4">
            <Slider label="Brightness" value={brightness} onChange={(v: number) => applySliderChange('brightness', v)} defaultValue={1} />
            <Slider label="Contrast" value={contrast} onChange={(v: number) => applySliderChange('contrast', v)} defaultValue={1} />
            <Slider label="Saturation" value={saturation} onChange={(v: number) => applySliderChange('saturation', v)} defaultValue={1} />
            <Slider label="Exposure" value={exposure} onChange={(v: number) => applySliderChange('exposure', v)} min={0.5} max={1.5} defaultValue={1} />
            <Slider label="Highlights" value={highlights} onChange={(v: number) => applySliderChange('highlights', v)} min={0.5} max={1.5} defaultValue={1} />
            <Slider label="Shadows" value={shadows} onChange={(v: number) => applySliderChange('shadows', v)} min={0.5} max={1.5} defaultValue={1} />
            <Slider label="Warmth" value={warmth} onChange={(v: number) => applySliderChange('warmth', v)} min={-1} max={1} defaultValue={0} />
            <Slider label="Tint" value={tint} onChange={(v: number) => applySliderChange('tint', v)} min={-1} max={1} defaultValue={0} />
            <div className="flex flex-wrap gap-1 mt-2">
              {([
                { label: '☀️ Daylight', warmth: 0, tint: 0 },
                { label: '☁️ Cloudy', warmth: 8, tint: 2 },
                { label: '🏠 Shade', warmth: 12, tint: 4 },
                { label: '💡 Tungsten', warmth: -15, tint: -5 },
                { label: '💡 Fluorescent', warmth: -5, tint: 8 },
                { label: '📸 Flash', warmth: 3, tint: 1 },
              ] as WhiteBalancePreset[]).map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyChange({ warmth: p.warmth, tint: p.tint })}
                  className="px-2 py-1 text-[10px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Slider label="Vibrance" value={vibrance} onChange={(v: number) => applySliderChange('vibrance', v)} min={-1} max={1} defaultValue={0} />
            <Slider label="Clarity" value={clarity} onChange={(v: number) => applySliderChange('clarity', v)} min={-1} max={1} defaultValue={0} />
            <Slider label="Dehaze" value={dehaze} onChange={(v: number) => applySliderChange('dehaze', v)} min={-1} max={1} defaultValue={0} />
            <Slider label="Vignette" value={vignette} onChange={(v: number) => applySliderChange('vignette', v)} min={0} max={1} defaultValue={0} />
          </div>

          {/* Tilt-Shift / Focus Blur */}
          <div className="mt-4 pt-3 border-t border-zinc-700/50">
            <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-2">Focus / Tilt-Shift</h4>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => applyChange((s) => ({ ...s, tiltShift: { ...s.tiltShift, mode: 'linear' } }))}
                className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                  editState.tiltShift?.mode === 'linear' ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                }`}
              >
                Linear
              </button>
              <button
                onClick={() => applyChange((s) => ({ ...s, tiltShift: { ...s.tiltShift, mode: 'radial' } }))}
                className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                  editState.tiltShift?.mode === 'radial' ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                }`}
              >
                Radial
              </button>
            </div>
            <div className="space-y-4">
              <Slider
                label="Blur"
                value={editState.tiltShift?.blur ?? 0}
                onChange={(v: number) => applyChange((s) => ({ ...s, tiltShift: { ...s.tiltShift, blur: v } }))}
                min={0}
                max={20}
                step={0.5}
                defaultValue={0}
              />
              <Slider
                label="Position"
                value={editState.tiltShift?.position ?? 50}
                onChange={(v: number) => applyChange((s) => ({ ...s, tiltShift: { ...s.tiltShift, position: v } }))}
                min={0}
                max={100}
                step={1}
                defaultValue={50}
              />
              <Slider
                label="Size"
                value={editState.tiltShift?.size ?? 30}
                onChange={(v: number) => applyChange((s) => ({ ...s, tiltShift: { ...s.tiltShift, size: v } }))}
                min={0}
                max={100}
                step={1}
                defaultValue={30}
              />
            </div>
          </div>

          {/* Film Grain */}
          <div className="mt-4 pt-3 border-t border-zinc-700/50">
            <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-2">Film Grain</h4>
            <div className="space-y-4">
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

          {/* Selective Color (Color Splash) */}
          <div className="mt-4 pt-3 border-t border-zinc-700/50">
            <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-2">Selective Color</h4>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => applyChange((s) => ({ ...s, selectiveColor: { ...s.selectiveColor, enabled: !s.selectiveColor?.enabled } }))}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  editState.selectiveColor?.enabled ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                }`}
              >
                {editState.selectiveColor?.enabled ? 'On' : 'Off'}
              </button>
              <span className="text-xs text-zinc-500">Keep one color, desaturate the rest</span>
            </div>
            {editState.selectiveColor?.enabled && (
              <div className="space-y-4">
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

          {/* Light Leaks / Bokeh */}
          <div className="mt-4 pt-3 border-t border-zinc-700/50">
            <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-2">Light Leaks</h4>
            <div className="flex flex-wrap gap-2 mb-3">
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
                  className={`py-1.5 px-3 text-xs rounded-lg transition-colors ${
                    editState.lightLeak?.type === ll.id
                      ? 'bg-indigo-500 text-zinc-900 font-medium'
                      : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                  }`}
                >
                  {ll.name}
                </button>
              ))}
            </div>
            {editState.lightLeak?.type && editState.lightLeak.type !== 'none' && (
              <Slider
                label="Intensity"
                value={editState.lightLeak?.intensity ?? 0.5}
                onChange={(v: number) => applyChange((s) => ({ ...s, lightLeak: { ...s.lightLeak, intensity: v } }))}
                min={0}
                max={1}
                step={0.05}
                defaultValue={0.5}
              />
            )}
          </div>

          <button
            onClick={() => applyChange(INITIAL_EDIT_STATE)}
            className="mt-4 w-full py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
          >
            Reset Adjustments
          </button>
        </div>

        <div className="mt-6">
          <CurvesPanel
            curves={editState.curves}
            onChange={(channel: string, points: [number, number][]) =>
              applyChange((s) => ({
                ...s,
                curves: { ...s.curves, [channel]: points },
              }))
            }
          />
        </div>
        <MaskPanel
          masks={(editState.masks || []) as Mask[]}
          onMasksChange={(masks) => applyChange({ masks })}
        />
      </div>

      {/* HSL Panel + Color Grading + Split Toning */}
      <div>
        <HSLPanel
          hsl={editState.hsl}
          onChange={(colorId: string, channel: string, value: number) =>
            applyChange((s) => ({
              ...s,
              hsl: {
                ...s.hsl,
                [colorId]: { ...s.hsl[colorId], [channel]: value },
              },
            }))
          }
        />
        <div className="mt-6">
          <ColorWheelPanel
            colorGrade={editState.colorGrade}
            onChange={(zone: string, val: { r: number; g: number; b: number }) =>
              applyChange((s) => ({
                ...s,
                colorGrade: { ...(s.colorGrade || {}), [zone]: val },
              }))
            }
          />
        </div>
        <div className="mt-6">
          <SplitTonePanel
            splitTone={editState.splitTone}
            onChange={(val: EditState['splitTone']) => applyChange((s) => ({ ...s, splitTone: val }))}
          />
        </div>
        <div className="mt-6">
          <ChannelMixerPanel editState={editState} applyChange={applyChange} />
        </div>
      </div>

      {/* Crop + Rotate */}
      <div>
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Crop</h3>
          <div className="flex flex-wrap gap-2">
            {CROP_RATIOS.map((r) => (
              <button
                key={r}
                onClick={() =>
                  applyChange({
                    cropRatio: r,
                    customCrop: r === 'custom' ? { x: 0, y: 0, w: 1, h: 1 } : null,
                  })
                }
                className={`py-2 px-3 text-xs rounded-lg transition-colors ${
                  cropRatio === r ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                }`}
              >
                {ratioLabels[r] ?? r}
              </button>
            ))}
            <button
              onClick={handlePortraitCrop}
              disabled={portraitCropLoading || !imageSrc}
              className="py-2 px-3 text-xs rounded-lg transition-colors bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {portraitCropLoading ? 'Detecting...' : 'Portrait'}
            </button>
          </div>
          {portraitCropError && (
            <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
              {portraitCropError}
            </div>
          )}
          {cropRatio === 'custom' && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(['x', 'y', 'w', 'h'] as const).map((k) => (
                <div key={k}>
                  <label className="text-xs text-zinc-500">{k.toUpperCase()}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round((editState.customCrop?.[k] ?? (k === 'w' || k === 'h' ? 1 : 0)) * 100)}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const v = Number(e.target.value) / 100
                      applyChange((s) => ({
                        ...s,
                        customCrop: { ...(s.customCrop ?? { x: 0, y: 0, w: 1, h: 1 }), [k]: Math.max(0, Math.min(1, v)) },
                      }))
                    }}
                    className="w-full bg-zinc-800 px-2 py-1 rounded text-sm text-zinc-200"
                  />
                </div>
              ))}
            </div>
          )}
          {cropRatio !== 'original' && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() =>
                  applyChange({
                    cropRatio: 'original',
                    customCrop: null,
                  })
                }
                className="flex-1 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
              >
                Reset Crop
              </button>
            </div>
          )}
          {cropRatio !== 'original' && (
            <p className="mt-3 text-xs text-zinc-500">
              Drag the crop handles on the image to adjust. The crop is applied live to the canvas and will be included when you download or share.
            </p>
          )}
        </div>

        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Rotate</h3>
          <div className="flex gap-2">
            <button
              onClick={() => applyChange((s) => ({ ...s, rotation: (s.rotation - 90 + 360) % 360 }))}
              className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
            >
              ↺ -90°
            </button>
            <button
              onClick={() => applyChange((s) => ({ ...s, rotation: (s.rotation + 90) % 360 }))}
              className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
            >
              ↻ 90°
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => applyChange((s) => ({ ...s, flipH: !s.flipH }))}
              className={`flex-1 py-2 rounded-lg transition-colors ${editState.flipH ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'}`}
            >
              ↔ Flip H
            </button>
            <button
              onClick={() => applyChange((s) => ({ ...s, flipV: !s.flipV }))}
              className={`flex-1 py-2 rounded-lg transition-colors ${editState.flipV ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'}`}
            >
              ↕ Flip V
            </button>
          </div>
        </div>

        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Transform</h3>
          <div className="space-y-4">
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
                applyChange((s) => ({
                  ...s,
                  perspective: { horizontal: 0, vertical: 0, rotation: 0 },
                }))
              }
              className="w-full py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
            >
              Reset Transform
            </button>
          </div>
        </div>

        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Resize</h3>
          {imageDims && (
            <p className="text-xs text-zinc-500 mb-3">
              Original: {imageDims.w} × {imageDims.h}px
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 mb-3">
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
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => applyChange((s) => ({ ...s, resize: { ...s.resize, lockAspect: !s.resize?.lockAspect } }))}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                editState.resize?.lockAspect ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
              }`}
            >
              {editState.resize?.lockAspect ? '🔒 Locked' : '🔓 Unlocked'}
            </button>
            <span className="text-xs text-zinc-500">Aspect ratio</span>
          </div>
          {(editState.resize?.width > 0 || editState.resize?.height > 0) && (
            <button
              onClick={() => applyChange((s) => ({ ...s, resize: { width: 0, height: 0, lockAspect: true } }))}
              className="w-full py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
            >
              Reset to Original
            </button>
          )}
        </div>
      </div>

      {/* Frames */}
      <div>
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Frames</h3>
          <div className="grid grid-cols-4 gap-2 mb-4">
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
                className={`py-2 px-1 text-[11px] rounded-lg transition-colors text-center ${
                  editState.frame?.type === fp.id
                    ? 'bg-indigo-500 text-zinc-900 font-medium'
                    : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                }`}
              >
                {fp.name}
              </button>
            ))}
          </div>
          {editState.frame?.type && editState.frame.type !== 'none' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-400">Color</span>
                <input
                  type="color"
                  value={editState.frame?.color || '#ffffff'}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    applyChange((s) => ({ ...s, frame: { ...s.frame, color: e.target.value } }))
                  }
                  className="w-8 h-8 rounded cursor-pointer border border-zinc-700"
                />
                <span className="text-xs text-zinc-500">{editState.frame?.color || '#ffffff'}</span>
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
      </div>

      {/* Drawing + Shapes */}
      <div>
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Drawing</h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {([
              { id: 'brush', label: 'Brush', extra: {}, icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18.37 2.63a2.12 2.12 0 013 3L14 13l-4 1 1-4z" /><path d="M9 14.5A3.5 3.5 0 005 18c-1 0-2 1.2-2 2 1.7 0 3-.5 4-1.5a3.5 3.5 0 002-4" /></svg> },
              { id: 'eraser', label: 'Eraser', extra: {}, icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16a1 1 0 010-1.4l9.6-9.6a1 1 0 011.4 0l7 7a1 1 0 010 1.4L15.4 19" /><path d="M6.5 13.5L13 7" /></svg> },
              { id: 'heal', label: 'Heal', extra: { healSource: null }, icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.7 3.3a2.4 2.4 0 013 3l-8.4 8.4a2 2 0 01-1 .5l-3.3.8.8-3.3a2 2 0 01.5-1z" /><circle cx="9" cy="15" r="0.5" fill="currentColor" /><circle cx="12" cy="12" r="0.5" fill="currentColor" /><circle cx="15" cy="9" r="0.5" fill="currentColor" /></svg> },
              { id: 'blur', label: 'Blur', extra: {}, icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" opacity="0.7" /><circle cx="12" cy="12" r="6" opacity="0.4" /><circle cx="12" cy="12" r="9" opacity="0.2" /></svg> },
              { id: 'picker', label: 'Pick', extra: {}, icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /><circle cx="12" cy="12" r="3" /></svg> },
              { id: 'wand', label: 'Wand', extra: { selectionMask: null }, icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4l-1 1 5 5 1-1a2.12 2.12 0 00-3-3l-2-2z" /><path d="M14 5L3 16l2 2 1 3 3 0 11-11z" /><path d="M9 9l0.01 0M12 6l0.01 0M6 12l0.01 0" /></svg> },
            ] as DrawingTool[]).map((tool) => (
              <button
                key={tool.id}
                onClick={() => applyChange({ drawingMode: drawingMode === tool.id ? null : tool.id, ...tool.extra } as Partial<EditState>)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-lg transition-colors ${
                  drawingMode === tool.id ? 'bg-indigo-500 text-white font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                }`}
                title={tool.label}
              >
                {tool.icon}
                <span className="text-[10px]">{tool.label}</span>
              </button>
            ))}
          </div>
          {drawingMode === 'wand' && (
            <div className="mb-4 p-3 bg-zinc-800/60 rounded-lg border border-zinc-700/50 space-y-3">
              <p className="text-xs text-zinc-400">
                {editState.selectionMask
                  ? 'Selection active — click elsewhere to reselect'
                  : 'Click on the image to select a color region'}
              </p>
              <Slider
                label="Tolerance"
                value={editState.wandTolerance ?? 32}
                onChange={(v: number) => applyChange({ wandTolerance: v })}
                min={1}
                max={100}
                step={1}
              />
              {editState.selectionMask && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
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
                        const ctx = canvas.getContext('2d')!
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
                        const ctx = canvas.getContext('2d')!
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
                      Desaturate
                    </button>
                    <button
                      onClick={() => {
                        const canvas = canvasRef?.current
                        if (!canvas) return
                        const ctx = canvas.getContext('2d')!
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
                      Brighten
                    </button>
                    <button
                      onClick={() => {
                        const canvas = canvasRef?.current
                        if (!canvas) return
                        const ctx = canvas.getContext('2d')!
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
                      Darken
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
          {editState.pickedColor && (
            <div className="mb-4 p-3 bg-zinc-800/60 rounded-lg border border-zinc-700/50 flex items-center gap-3">
              <span
                className="w-8 h-8 rounded-lg border border-zinc-600 shrink-0"
                style={{ background: editState.pickedColor }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-mono text-zinc-200">{editState.pickedColor}</span>
                <p className="text-[10px] text-zinc-500 mt-0.5">Copied to clipboard</p>
              </div>
              <button
                onClick={() => applyChange({ brushColor: editState.pickedColor! })}
                className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0"
              >
                Use as brush
              </button>
            </div>
          )}
          {drawingMode === 'heal' && (
            <div className="mb-4 p-3 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
              <p className="text-xs text-zinc-400 mb-1">
                {editState.healSource
                  ? 'Source set — click & drag on the area to heal'
                  : 'Click on the image to set the source point'}
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
          {drawingMode === 'brush' && (
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-zinc-400">Color</span>
              <input
                type="color"
                value={brushColor}
                onChange={(e: ChangeEvent<HTMLInputElement>) => applyChange({ brushColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border border-zinc-700"
              />
              <button
                onClick={() => applyChange({ drawingMode: 'picker' as EditState['drawingMode'] })}
                className="w-8 h-8 flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 rounded border border-zinc-600 text-sm"
                title="Pick color from image"
              >
                💧
              </button>
              <span className="text-xs text-zinc-500">{brushColor}</span>
            </div>
          )}
          <div className="space-y-4">
            <Slider
              label="Size"
              value={brushSize}
              onChange={(v: number) => applySliderChange('brushSize', v)}
              min={1}
              max={50}
              step={1}
              defaultValue={5}
              unit="px"
            />
            <Slider
              label="Opacity"
              value={brushOpacity}
              onChange={(v: number) => applySliderChange('brushOpacity', v)}
              min={0.1}
              max={1}
              step={0.05}
              defaultValue={1}
            />
          </div>
          {brushStrokes?.length > 0 && (
            <button
              onClick={() => applyChange({ brushStrokes: [] })}
              className="mt-4 w-full py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
            >
              Clear All Drawings
            </button>
          )}
        </div>

        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Shapes</h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {([
              { type: 'circle', icon: '●' },
              { type: 'square', icon: '■' },
              { type: 'triangle', icon: '▲' },
              { type: 'star', icon: '★' },
              { type: 'heart', icon: '♥' },
              { type: 'arrow-right', icon: '→' },
              { type: 'arrow-up', icon: '↑' },
            ] as ShapeConfig[]).map(({ type, icon }) => (
              <button
                key={type}
                onClick={() =>
                  applyChange((s) => ({
                    ...s,
                    shapeOverlays: [...(s.shapeOverlays || []), { id: Date.now(), type, x: 0.5, y: 0.5, size: 40, color: '#ffffff', rotation: 0 }],
                  }))
                }
                className="py-2 text-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
              >
                {icon}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <StickerPanel
              onAddSticker={(sticker) =>
                applyChange((s) => ({
                  ...s,
                  shapeOverlays: [...(s.shapeOverlays || []), sticker as ShapeOverlay],
                }))
              }
            />
          </div>
          {(editState.shapeOverlays || []).length > 0 && (
            <div className="space-y-3 max-h-64 overflow-y-auto mt-4">
              {(editState.shapeOverlays || []).map((shape: any, i: number) => (
                <div key={shape.id ?? i} className="bg-zinc-800/50 rounded-lg p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 capitalize flex items-center gap-1">
                      {shape.type === 'sticker' ? `${shape.emoji || ''} Sticker` : shape.type?.replace('-', ' ')}
                    </span>
                    <button
                      onClick={() =>
                        applyChange((s) => ({
                          ...s,
                          shapeOverlays: (s.shapeOverlays || []).filter((_, j) => j !== i),
                        }))
                      }
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 w-8">Size</span>
                    <input
                      type="range"
                      min={10}
                      max={300}
                      value={shape.size ?? 40}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const v = Number(e.target.value)
                        applyChange((s) => ({
                          ...s,
                          shapeOverlays: (s.shapeOverlays || []).map((o: any, j: number) => (j === i ? { ...o, size: v } : o)),
                        }))
                      }}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-[10px] text-zinc-400 w-8 text-right">{shape.size ?? 40}</span>
                  </div>
                  {shape.type !== 'sticker' && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 w-8">Color</span>
                      <input
                        type="color"
                        value={shape.color ?? '#ffffff'}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          applyChange((s) => ({
                            ...s,
                            shapeOverlays: (s.shapeOverlays || []).map((o: any, j: number) => (j === i ? { ...o, color: e.target.value } : o)),
                          }))
                        }
                        className="w-7 h-7 rounded cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Layers + Text */}
      <div>
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Text</h3>
          <button
            onClick={onAddText}
            className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
          >
            Add Text
          </button>
          {(editState.textOverlays || []).length > 0 && (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {(editState.textOverlays || []).map((t, i) => {
                const updateText = (prop: string, value: unknown) =>
                  applyChange((s) => ({
                    ...s,
                    textOverlays: (s.textOverlays || []).map((o, j) => (j === i ? { ...o, [prop]: value } : o)),
                  }))
                const toggleProp = (prop: string, onVal: unknown, offVal: unknown) =>
                  applyChange((s) => ({
                    ...s,
                    textOverlays: (s.textOverlays || []).map((o, j) =>
                      j === i ? { ...o, [prop]: (o as Record<string, unknown>)[prop] === onVal ? offVal : onVal } : o
                    ),
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
                        title="Settings"
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
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="color"
                            value={t.color ?? '#ffffff'}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => updateText('color', e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer"
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => toggleProp('fontWeight', 'bold', 'normal')}
                            className={`px-2 py-1 text-xs rounded ${t.fontWeight === 'bold' ? 'bg-indigo-500 text-zinc-900' : 'bg-zinc-700 text-zinc-300'}`}
                          >
                            <b>B</b>
                          </button>
                          <button
                            onClick={() => toggleProp('fontStyle', 'italic', 'normal')}
                            className={`px-2 py-1 text-xs rounded ${t.fontStyle === 'italic' ? 'bg-indigo-500 text-zinc-900' : 'bg-zinc-700 text-zinc-300'}`}
                          >
                            <i>I</i>
                          </button>
                          <button
                            onClick={() => toggleProp('textShadow', true, false)}
                            className={`px-2 py-1 text-xs rounded ${t.textShadow ? 'bg-indigo-500 text-zinc-900' : 'bg-zinc-700 text-zinc-300'}`}
                          >
                            Shadow
                          </button>
                        </div>
                        <Slider
                          label="Size"
                          value={t.fontSize ?? 32}
                          onChange={(v: number) => updateText('fontSize', Math.round(v))}
                          min={8}
                          max={200}
                          step={1}
                          defaultValue={32}
                          unit="px"
                        />
                        <Slider
                          label="Opacity"
                          value={t.opacity ?? 1}
                          onChange={(v: number) => updateText('opacity', v)}
                          min={0.1}
                          max={1}
                          step={0.05}
                          defaultValue={1}
                        />
                        <Slider
                          label="X Position"
                          value={t.x ?? 0.5}
                          onChange={(v: number) => updateText('x', v)}
                          min={0}
                          max={1}
                          step={0.01}
                          defaultValue={0.5}
                        />
                        <Slider
                          label="Y Position"
                          value={t.y ?? 0.5}
                          onChange={(v: number) => updateText('y', v)}
                          min={0}
                          max={1}
                          step={0.01}
                          defaultValue={0.5}
                        />
                        <Slider
                          label="Rotation"
                          value={t.rotation ?? 0}
                          onChange={(v: number) => updateText('rotation', v)}
                          min={-180}
                          max={180}
                          step={1}
                          defaultValue={0}
                          unit="deg"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-6">
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
        </div>
      </div>

      {/* Templates */}
      <div>
        <TemplatePanel applyChange={applyChange} editState={editState} />
      </div>

      {/* Film Emulations + Filters + History */}
      <div>
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Film Emulation</h3>
          <div className="flex gap-1 mb-2">
            {(['classic', 'trending'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilmTab(cat)}
                className={`px-2 py-0.5 text-[10px] rounded-full transition-colors capitalize ${
                  filmTab === cat ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={() => applyChange({ filmEmulation: null, filmGrain: 0 })}
              className={`py-2 px-3 text-xs rounded-lg transition-colors ${
                !editState.filmEmulation
                  ? 'bg-indigo-500 text-zinc-900 font-medium'
                  : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
              }`}
            >
              None
            </button>
            {FILM_EMULATIONS.filter((em) => em.category === filmTab).map((em) => (
              <button
                key={em.id}
                onClick={() => applyChange({ filmEmulation: em.id, filmGrain: em.id === 'koji' ? 0.06 : (editState.filmGrain || 0) })}
                className={`py-2 px-2 text-xs rounded-lg transition-colors ${
                  editState.filmEmulation === em.id
                    ? 'bg-indigo-500 text-zinc-900 font-medium'
                    : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                }`}
                title={em.description}
              >
                {em.name}
              </button>
            ))}
          </div>
          {editState.filmEmulation && (
            <div className="space-y-3">
              <Slider
                label="Intensity"
                value={editState.filmIntensity ?? 1}
                onChange={(v: number) => applySliderChange('filmIntensity', v)}
                min={0.1}
                max={1}
                step={0.05}
                defaultValue={1}
              />
              <Slider
                label="Film Grain"
                value={editState.filmGrain ?? 0}
                onChange={(v: number) => applySliderChange('filmGrain', v)}
                min={0}
                max={0.3}
                step={0.01}
                defaultValue={0}
              />
            </div>
          )}
        </div>

        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Filters</h3>
          <div className="flex gap-1 flex-wrap mb-2">
            {(['popular', 'mood', 'style', 'aesthetic', 'trending', 'portrait', 'film', 'retro', 'creative'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterTab(cat)}
                className={`px-2 py-0.5 text-[10px] rounded-full transition-colors capitalize ${
                  filterTab === cat ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {FILTER_PRESETS.filter((p) => p.category === 'all' || p.category === filterTab).map((p) => (
              <button
                key={p.id}
                onClick={() => applyChange({ preset: p.id })}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className={`w-[48px] h-[48px] rounded-lg overflow-hidden border-2 transition-colors ${
                    preset === p.id
                      ? 'border-indigo-500'
                      : 'border-zinc-700 group-hover:border-zinc-500'
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
                  className={`text-[10px] leading-tight transition-colors ${
                    preset === p.id
                      ? 'text-indigo-400 font-medium'
                      : 'text-zinc-400 group-hover:text-zinc-300'
                  }`}
                >
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">LUT (Color Grading)</h3>
          <input
            ref={lutInputRef}
            type="file"
            accept=".cube"
            onChange={handleLutImport}
            className="hidden"
          />
          {editState.lutName ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2.5 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
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
                className="w-full py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
              >
                Replace .cube
              </button>
            </div>
          ) : (
            <button
              onClick={() => lutInputRef.current?.click()}
              className="w-full py-2.5 text-sm bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 rounded-lg transition-colors"
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

        <GradientMapPanel editState={editState} applyChange={applyChange} />

        {/* Chromatic Aberration */}
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Chromatic Aberration</h3>
          <Slider
            label="Shift"
            value={editState.chromaticAberration ?? 0}
            onChange={(v: number) => applyChange({ chromaticAberration: v })}
            min={0}
            max={20}
            step={1}
          />
        </div>

        {/* Sharpen */}
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Sharpen</h3>
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
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Glitch</h3>
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
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Oil Paint</h3>
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
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Posterize</h3>
          <Slider label="Levels" value={editState.posterize ?? 0} onChange={(v: number) => applyChange({ posterize: v })} min={0} max={20} step={1} />
          <p className="text-[10px] text-zinc-500 mt-1">0 = off, 2-20 = color levels</p>
        </div>

        {/* Solarize */}
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Solarize</h3>
          <Slider label="Threshold" value={editState.solarize ?? 0} onChange={(v: number) => applyChange({ solarize: v })} min={0} max={255} step={1} />
        </div>

        {/* Emboss */}
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Emboss</h3>
          <Slider label="Amount" value={editState.emboss ?? 0} onChange={(v: number) => applyChange({ emboss: v })} min={0} max={100} step={1} />
        </div>

        {historyLength > 0 && (
          <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">History</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {Array.from({ length: historyLength }, (_, i) => {
                const isCurrent = i === historyIndex
                const label = i === 0 ? 'Initial' : `Step ${i}`
                return (
                  <div
                    key={i}
                    className={`text-xs px-2 py-1.5 rounded ${isCurrent ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500'}`}
                  >
                    {label}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Histogram + Image Info */}
      <div>
        <HistogramPanel canvasRef={canvasRef} />
        <div className="mt-4">
          <ImageInfoPanel imageSrc={imageSrc} />
        </div>
      </div>
    </aside>
  )
}
