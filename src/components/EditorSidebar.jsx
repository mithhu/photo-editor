import { useState } from 'react'
import { Slider } from './Slider'
import { HSLPanel } from './HSLPanel'
import { ColorWheelPanel } from './ColorWheelPanel'
import { SplitTonePanel } from './SplitTonePanel'
import { CurvesPanel } from './CurvesPanel'
import { LayerPanel } from './LayerPanel'
import { AIToolsPanel } from './AIToolsPanel'
import { FILTER_PRESETS, INITIAL_EDIT_STATE } from '../constants'
import { CROP_RATIOS } from '../utils/cropUtils'

const MOBILE_TABS = [
  { id: 'ai', label: 'AI' },
  { id: 'adjust', label: 'Adjust' },
  { id: 'color', label: 'Color' },
  { id: 'crop', label: 'Crop' },
  { id: 'draw', label: 'Draw' },
  { id: 'layers', label: 'Layers' },
  { id: 'filters', label: 'Filters' },
]

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
  const [activeTab, setActiveTab] = useState('adjust')

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

  return (
    <aside className="w-full lg:w-80 flex-shrink-0 lg:flex-shrink lg:min-h-0 flex flex-col gap-4 lg:gap-6 overflow-y-auto">
      {/* Mobile tab bar */}
      <div className="flex lg:hidden gap-1 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {MOBILE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-amber-500 text-zinc-900 font-medium'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* AI tab: AI Tools */}
      <div className={activeTab !== 'ai' ? 'hidden lg:block' : ''}>
        <AIToolsPanel
          imageSrc={imageSrc}
          onImageReplace={onImageReplace}
          canvasRef={canvasRef}
          onApplyChange={onApplyChange}
        />
      </div>

      {/* Adjust tab: Adjustments + Curves */}
      <div className={activeTab !== 'adjust' ? 'hidden lg:block' : ''}>
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Adjustments</h3>
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
          <button
            onClick={() => applyChange(INITIAL_EDIT_STATE)}
            className="mt-4 w-full py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
          >
            Reset Adjustments
          </button>
        </div>

        <div className="mt-4 lg:mt-6">
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
      </div>

      {/* Color tab: HSL Panel + Color Grading + Split Toning */}
      <div className={activeTab !== 'color' ? 'hidden lg:block' : ''}>
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
        <div className="mt-4 lg:mt-6">
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
        <div className="mt-4 lg:mt-6">
          <SplitTonePanel
            splitTone={editState.splitTone}
            onChange={(val) => applyChange((s) => ({ ...s, splitTone: val }))}
          />
        </div>
      </div>

      {/* Crop tab: Crop + Rotate */}
      <div className={activeTab !== 'crop' ? 'hidden lg:block' : ''}>
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
                  cropRatio === r ? 'bg-amber-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                }`}
              >
                {ratioLabels[r] ?? r}
              </button>
            ))}
          </div>
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
        </div>

        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-4 lg:mt-6">
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
              className={`flex-1 py-2 rounded-lg transition-colors ${editState.flipH ? 'bg-amber-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'}`}
            >
              ↔ Flip H
            </button>
            <button
              onClick={() => applyChange((s) => ({ ...s, flipV: !s.flipV }))}
              className={`flex-1 py-2 rounded-lg transition-colors ${editState.flipV ? 'bg-amber-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'}`}
            >
              ↕ Flip V
            </button>
          </div>
        </div>
      </div>

      {/* Draw tab: Drawing + Shapes */}
      <div className={activeTab !== 'draw' ? 'hidden lg:block' : ''}>
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Drawing</h3>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => applyChange({ drawingMode: drawingMode === 'brush' ? null : 'brush' })}
              className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                drawingMode === 'brush' ? 'bg-amber-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
              }`}
            >
              Brush
            </button>
            <button
              onClick={() => applyChange({ drawingMode: drawingMode === 'eraser' ? null : 'eraser' })}
              className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                drawingMode === 'eraser' ? 'bg-amber-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
              }`}
            >
              Eraser
            </button>
          </div>
          {drawingMode === 'brush' && (
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-zinc-400">Color</span>
              <input
                type="color"
                value={brushColor}
                onChange={(e) => applyChange({ brushColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border border-zinc-700"
              />
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

        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-4 lg:mt-6">
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
          {(editState.shapeOverlays || []).length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(editState.shapeOverlays || []).map((shape, i) => (
                <div key={shape.id ?? i} className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-zinc-400 w-20 shrink-0 capitalize">
                    {shape.type?.replace('-', ' ')}
                  </span>
                  <input
                    type="color"
                    value={shape.color ?? '#ffffff'}
                    onChange={(e) =>
                      applyChange((s) => ({
                        ...s,
                        shapeOverlays: (s.shapeOverlays || []).map((o, j) => (j === i ? { ...o, color: e.target.value } : o)),
                      }))
                    }
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={shape.size ?? 40}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      applyChange((s) => ({
                        ...s,
                        shapeOverlays: (s.shapeOverlays || []).map((o, j) => (j === i ? { ...o, size: Math.max(10, Math.min(200, v)) } : o)),
                      }))
                    }}
                    className="w-14 bg-zinc-800 px-2 py-1 rounded text-sm text-zinc-200"
                  />
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Layers tab: Layers + Text */}
      <div className={activeTab !== 'layers' ? 'hidden lg:block' : ''}>
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Text</h3>
          <button
            onClick={onAddText}
            className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
          >
            Add Text
          </button>
          {(editState.textOverlays || []).length > 0 && (
            <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
              {(editState.textOverlays || []).map((t, i) => (
                <div key={t.id ?? i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={t.text ?? ''}
                    onChange={(e) =>
                      applyChange((s) => ({
                        ...s,
                        textOverlays: (s.textOverlays || []).map((o, j) => (j === i ? { ...o, text: e.target.value } : o)),
                      }))
                    }
                    className="flex-1 bg-zinc-800 px-2 py-1 rounded text-sm text-zinc-200"
                    placeholder="Text"
                  />
                  <input
                    type="color"
                    value={t.color ?? '#ffffff'}
                    onChange={(e) =>
                      applyChange((s) => ({
                        ...s,
                        textOverlays: (s.textOverlays || []).map((o, j) => (j === i ? { ...o, color: e.target.value } : o)),
                      }))
                    }
                    className="w-8 h-8 rounded cursor-pointer"
                  />
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
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 lg:mt-6">
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

      {/* Filters tab: Filters + History */}
      <div className={activeTab !== 'filters' ? 'hidden lg:block' : ''}>
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Filters</h3>
          <div className="grid grid-cols-3 gap-2">
            {FILTER_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyChange({ preset: p.id })}
                className={`py-2 px-3 text-xs rounded-lg transition-colors ${
                  preset === p.id
                    ? 'bg-amber-500 text-zinc-900 font-medium'
                    : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {historyLength > 0 && (
          <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 mt-4 lg:mt-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">History</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {Array.from({ length: historyLength }, (_, i) => {
                const isCurrent = i === historyIndex
                const label = i === 0 ? 'Initial' : `Step ${i}`
                return (
                  <div
                    key={i}
                    className={`text-xs px-2 py-1.5 rounded ${isCurrent ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-500'}`}
                  >
                    {label}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
