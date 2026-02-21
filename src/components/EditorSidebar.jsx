import { useState, useRef, useEffect, useCallback } from 'react'
import { Slider } from './Slider'
import { SuggestionChips } from './SuggestionChips'
import { HSLPanel } from './HSLPanel'
import { ColorWheelPanel } from './ColorWheelPanel'
import { SplitTonePanel } from './SplitTonePanel'
import { CurvesPanel } from './CurvesPanel'
import { MaskPanel } from './MaskPanel'
import { LayerPanel } from './LayerPanel'
import { StickerPanel } from './StickerPanel'
import { AIToolsPanel } from './AIToolsPanel'
import { TemplatePanel } from './TemplatePanel'
import { ImageInfoPanel } from './ImageInfoPanel'
import { FILTER_PRESETS, INITIAL_EDIT_STATE, TEXT_OVERLAY_FONTS, FRAME_PRESETS, LIGHT_LEAK_PRESETS } from '../constants'
import { CROP_RATIOS } from '../utils/cropUtils'
import { FILM_EMULATIONS } from '../utils/filmEmulation'
import { useFilterPreviews } from '../hooks/useFilterPreviews'
import { useExposureSuggestions } from '../hooks/useExposureSuggestions'
import { usePortraitCrop } from '../hooks/usePortraitCrop'
import { parseCubeLUT } from '../utils/lutParser'

export function EditorSidebar({
  editState,
  applyChange,
  applySliderChange,
  onAddText,
  historyIndex,
  historyLength,
  imageSrc,
  onImageReplace,
  canvasRef,
  onApplyChange,
}) {
  const [expandedTextId, setExpandedTextId] = useState(null)
  const [lutError, setLutError] = useState(null)
  const [imageDims, setImageDims] = useState(null)
  const lutInputRef = useRef(null)
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

  const ratioLabels = { original: 'Original', '1:1': '1:1', '4:5': '4:5', '16:9': '16:9', '9:16': '9:16', '3:4': '3:4', '2:3': '2:3', custom: 'Custom' }

  useEffect(() => {
    if (!imageSrc) return
    const img = new Image()
    img.onload = () => setImageDims({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = imageSrc
  }, [imageSrc])

  const handleLutImport = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLutError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseCubeLUT(reader.result)
        applyChange((s) => ({ ...s, lut: parsed, lutName: file.name }))
      } catch (err) {
        setLutError(err.message)
      }
    }
    reader.readAsText(file)
    if (lutInputRef.current) lutInputRef.current.value = ''
  }, [applyChange])

  const handleResizeWidth = useCallback((w) => {
    const val = Math.max(0, Math.round(w))
    if (editState.resize?.lockAspect && imageDims && imageDims.w > 0 && val > 0) {
      const aspect = imageDims.h / imageDims.w
      applyChange((s) => ({ ...s, resize: { ...s.resize, width: val, height: Math.round(val * aspect) } }))
    } else {
      applyChange((s) => ({ ...s, resize: { ...s.resize, width: val } }))
    }
  }, [applyChange, editState.resize?.lockAspect, imageDims])

  const handleResizeHeight = useCallback((h) => {
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
              onApply={(changes) => applyChange((s) => ({ ...s, ...changes }))}
            />
          </div>
          <div className="space-y-4">
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
                onChange={(v) => applyChange((s) => ({ ...s, tiltShift: { ...s.tiltShift, blur: v } }))}
                min={0}
                max={20}
                step={0.5}
                defaultValue={0}
              />
              <Slider
                label="Position"
                value={editState.tiltShift?.position ?? 50}
                onChange={(v) => applyChange((s) => ({ ...s, tiltShift: { ...s.tiltShift, position: v } }))}
                min={0}
                max={100}
                step={1}
                defaultValue={50}
              />
              <Slider
                label="Size"
                value={editState.tiltShift?.size ?? 30}
                onChange={(v) => applyChange((s) => ({ ...s, tiltShift: { ...s.tiltShift, size: v } }))}
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
                onChange={(v) => applyChange((s) => ({ ...s, grain: { ...s.grain, amount: v } }))}
                min={0}
                max={100}
                step={1}
                defaultValue={0}
              />
              <Slider
                label="Size"
                value={editState.grain?.size ?? 1}
                onChange={(v) => applyChange((s) => ({ ...s, grain: { ...s.grain, size: v } }))}
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
                    onChange={(e) => applyChange((s) => ({ ...s, selectiveColor: { ...s.selectiveColor, hue: Number(e.target.value) } }))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                    }}
                  />
                </div>
                <Slider
                  label="Range"
                  value={editState.selectiveColor?.range ?? 30}
                  onChange={(v) => applyChange((s) => ({ ...s, selectiveColor: { ...s.selectiveColor, range: v } }))}
                  min={5}
                  max={90}
                  step={1}
                  defaultValue={30}
                  unit="°"
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
                onChange={(v) => applyChange((s) => ({ ...s, lightLeak: { ...s.lightLeak, intensity: v } }))}
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
            onChange={(channel, points) =>
              applyChange((s) => ({
                ...s,
                curves: { ...s.curves, [channel]: points },
              }))
            }
          />
        </div>
        <MaskPanel
          masks={editState.masks || []}
          onMasksChange={(masks) => applyChange({ masks })}
        />
      </div>

      {/* HSL Panel + Color Grading + Split Toning */}
      <div>
        <HSLPanel
          hsl={editState.hsl}
          onChange={(colorId, channel, value) =>
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
            onChange={(zone, val) =>
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
            onChange={(val) => applyChange((s) => ({ ...s, splitTone: val }))}
          />
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
              {['x', 'y', 'w', 'h'].map((k) => (
                <div key={k}>
                  <label className="text-xs text-zinc-500">{k.toUpperCase()}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round((editState.customCrop?.[k] ?? (k === 'w' || k === 'h' ? 1 : 0)) * 100)}
                    onChange={(e) => {
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
              onChange={(v) => applyChange((s) => ({ ...s, perspective: { ...(s.perspective ?? { horizontal: 0, vertical: 0, rotation: 0 }), horizontal: v } }))}
              min={-45}
              max={45}
              step={0.5}
              defaultValue={0}
              unit="deg"
            />
            <Slider
              label="Vertical"
              value={editState.perspective?.vertical ?? 0}
              onChange={(v) => applyChange((s) => ({ ...s, perspective: { ...(s.perspective ?? { horizontal: 0, vertical: 0, rotation: 0 }), vertical: v } }))}
              min={-45}
              max={45}
              step={0.5}
              defaultValue={0}
              unit="deg"
            />
            <Slider
              label="Fine rotation"
              value={editState.perspective?.rotation ?? 0}
              onChange={(v) => applyChange((s) => ({ ...s, perspective: { ...(s.perspective ?? { horizontal: 0, vertical: 0, rotation: 0 }), rotation: v } }))}
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
                placeholder={imageDims?.w || '0'}
                onChange={(e) => handleResizeWidth(Number(e.target.value) || 0)}
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
                placeholder={imageDims?.h || '0'}
                onChange={(e) => handleResizeHeight(Number(e.target.value) || 0)}
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
                  onChange={(e) =>
                    applyChange((s) => ({ ...s, frame: { ...s.frame, color: e.target.value } }))
                  }
                  className="w-8 h-8 rounded cursor-pointer border border-zinc-700"
                />
                <span className="text-xs text-zinc-500">{editState.frame?.color || '#ffffff'}</span>
              </div>
              <Slider
                label="Width"
                value={editState.frame?.width ?? 10}
                onChange={(v) =>
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
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => applyChange({ drawingMode: drawingMode === 'brush' ? null : 'brush' })}
              className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                drawingMode === 'brush' ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
              }`}
            >
              Brush
            </button>
            <button
              onClick={() => applyChange({ drawingMode: drawingMode === 'eraser' ? null : 'eraser' })}
              className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                drawingMode === 'eraser' ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
              }`}
            >
              Eraser
            </button>
            <button
              onClick={() => applyChange({ drawingMode: drawingMode === 'heal' ? null : 'heal', healSource: null })}
              className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                drawingMode === 'heal' ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
              }`}
            >
              Heal
            </button>
            <button
              onClick={() => applyChange({ drawingMode: drawingMode === 'picker' ? null : 'picker' })}
              className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                drawingMode === 'picker' ? 'bg-indigo-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
              }`}
              title="Pick a color from the image"
            >
              💧 Pick
            </button>
          </div>
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
                onClick={() => applyChange({ brushColor: editState.pickedColor })}
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
                onChange={(e) => applyChange({ brushColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border border-zinc-700"
              />
              <button
                onClick={() => applyChange({ drawingMode: 'picker' })}
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
              onChange={(v) => applySliderChange('brushSize', v)}
              min={1}
              max={50}
              step={1}
              defaultValue={5}
              unit="px"
            />
            <Slider
              label="Opacity"
              value={brushOpacity}
              onChange={(v) => applySliderChange('brushOpacity', v)}
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
                  shapeOverlays: [...(s.shapeOverlays || []), sticker],
                }))
              }
            />
          </div>
          {(editState.shapeOverlays || []).length > 0 && (
            <div className="space-y-3 max-h-64 overflow-y-auto mt-4">
              {(editState.shapeOverlays || []).map((shape, i) => (
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
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        applyChange((s) => ({
                          ...s,
                          shapeOverlays: (s.shapeOverlays || []).map((o, j) => (j === i ? { ...o, size: v } : o)),
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
                        onChange={(e) =>
                          applyChange((s) => ({
                            ...s,
                            shapeOverlays: (s.shapeOverlays || []).map((o, j) => (j === i ? { ...o, color: e.target.value } : o)),
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
                const updateText = (prop, value) =>
                  applyChange((s) => ({
                    ...s,
                    textOverlays: (s.textOverlays || []).map((o, j) => (j === i ? { ...o, [prop]: value } : o)),
                  }))
                const toggleProp = (prop, onVal, offVal) =>
                  applyChange((s) => ({
                    ...s,
                    textOverlays: (s.textOverlays || []).map((o, j) =>
                      j === i ? { ...o, [prop]: o[prop] === onVal ? offVal : onVal } : o
                    ),
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
                            onChange={(e) => updateText('fontFamily', e.target.value)}
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
                            onChange={(e) => updateText('color', e.target.value)}
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
                          onChange={(v) => updateText('fontSize', Math.round(v))}
                          min={8}
                          max={200}
                          step={1}
                          defaultValue={32}
                          unit="px"
                        />
                        <Slider
                          label="Opacity"
                          value={t.opacity ?? 1}
                          onChange={(v) => updateText('opacity', v)}
                          min={0.1}
                          max={1}
                          step={0.05}
                          defaultValue={1}
                        />
                        <Slider
                          label="X Position"
                          value={t.x ?? 0.5}
                          onChange={(v) => updateText('x', v)}
                          min={0}
                          max={1}
                          step={0.01}
                          defaultValue={0.5}
                        />
                        <Slider
                          label="Y Position"
                          value={t.y ?? 0.5}
                          onChange={(v) => updateText('y', v)}
                          min={0}
                          max={1}
                          step={0.01}
                          defaultValue={0.5}
                        />
                        <Slider
                          label="Rotation"
                          value={t.rotation ?? 0}
                          onChange={(v) => updateText('rotation', v)}
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
            onToggleVisibility={(id) =>
              applyChange((s) => ({
                ...s,
                layerVisibility: { ...s.layerVisibility, [id]: s.layerVisibility?.[id] === false },
              }))
            }
            onReorder={(type, from, to) =>
              applyChange((s) => {
                const key = type === 'text' ? 'textOverlays' : 'shapeOverlays'
                const arr = [...(s[key] || [])]
                if (to < 0 || to >= arr.length) return s
                const [item] = arr.splice(from, 1)
                arr.splice(to, 0, item)
                return { ...s, [key]: arr }
              })
            }
            onDelete={(type, index) =>
              applyChange((s) => {
                const key = type === 'text' ? 'textOverlays' : 'shapeOverlays'
                return { ...s, [key]: (s[key] || []).filter((_, i) => i !== index) }
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
            {FILM_EMULATIONS.map((em) => (
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
                onChange={(v) => applySliderChange('filmIntensity', v)}
                min={0.1}
                max={1}
                step={0.05}
                defaultValue={1}
              />
              <Slider
                label="Film Grain"
                value={editState.filmGrain ?? 0}
                onChange={(v) => applySliderChange('filmGrain', v)}
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
          <div className="grid grid-cols-3 gap-3">
            {FILTER_PRESETS.map((p) => (
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

      {/* Image Info */}
      <div>
        <ImageInfoPanel imageSrc={imageSrc} />
      </div>
    </aside>
  )
}
