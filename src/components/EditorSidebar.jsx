import { Slider } from './Slider'
import { FILTER_PRESETS, INITIAL_EDIT_STATE } from '../constants'
import { CROP_RATIOS } from '../utils/cropUtils'

export function EditorSidebar({
  editState,
  applyChange,
  applySliderChange,
  onAddText,
}) {
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
    cropRatio,
    preset,
  } = editState

  const ratioLabels = { original: 'Original', '1:1': '1:1', '4:5': '4:5', '16:9': '16:9', '9:16': '9:16', '3:4': '3:4', '2:3': '2:3', custom: 'Custom' }

  return (
    <aside className="w-full lg:w-80 flex-shrink-0 lg:flex-shrink lg:min-h-0 flex flex-col gap-6 overflow-y-auto">
      <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Adjustments</h3>
        <div className="space-y-4">
          <Slider label="Brightness" value={brightness} onChange={(v) => applySliderChange('brightness', v)} />
          <Slider label="Contrast" value={contrast} onChange={(v) => applySliderChange('contrast', v)} />
          <Slider label="Saturation" value={saturation} onChange={(v) => applySliderChange('saturation', v)} />
          <Slider label="Exposure" value={exposure} onChange={(v) => applySliderChange('exposure', v)} min={0.5} max={1.5} />
          <Slider label="Highlights" value={highlights} onChange={(v) => applySliderChange('highlights', v)} min={0.5} max={1.5} />
          <Slider label="Shadows" value={shadows} onChange={(v) => applySliderChange('shadows', v)} min={0.5} max={1.5} />
          <Slider label="Warmth" value={warmth} onChange={(v) => applySliderChange('warmth', v)} min={-1} max={1} />
          <Slider label="Tint" value={tint} onChange={(v) => applySliderChange('tint', v)} min={-1} max={1} />
          <Slider label="Vibrance" value={vibrance} onChange={(v) => applySliderChange('vibrance', v)} min={-1} max={1} />
        </div>
        <button
          onClick={() => applyChange(INITIAL_EDIT_STATE)}
          className="mt-4 w-full py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
        >
          Reset Adjustments
        </button>
      </div>

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

      <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
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
      </div>

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
    </aside>
  )
}
