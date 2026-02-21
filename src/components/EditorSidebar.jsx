import { Slider } from './Slider'
import { FILTER_PRESETS, INITIAL_EDIT_STATE } from '../constants'

export function EditorSidebar({
  editState,
  applyChange,
  applySliderChange,
}) {
  const { brightness, contrast, saturation, cropRatio, preset } = editState

  return (
    <aside className="w-full lg:w-80 flex flex-col gap-6 overflow-y-auto">
      <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Adjustments</h3>
        <div className="space-y-4">
          <Slider label="Brightness" value={brightness} onChange={(v) => applySliderChange('brightness', v)} />
          <Slider label="Contrast" value={contrast} onChange={(v) => applySliderChange('contrast', v)} />
          <Slider label="Saturation" value={saturation} onChange={(v) => applySliderChange('saturation', v)} />
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
          {['original', '1:1', '4:5', '16:9'].map((r) => (
            <button
              key={r}
              onClick={() => applyChange({ cropRatio: r })}
              className={`py-2 px-3 text-xs rounded-lg transition-colors ${
                cropRatio === r ? 'bg-amber-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
              }`}
            >
              {r === 'original' ? 'Original' : r}
            </button>
          ))}
        </div>
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
