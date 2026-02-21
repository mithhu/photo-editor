import { Slider } from './Slider'

const MAX_MASKS = 3

function createRadialMask() {
  return {
    id: Date.now(),
    type: 'radial',
    centerX: 0.5,
    centerY: 0.5,
    radiusX: 0.3,
    radiusY: 0.3,
    feather: 0.5,
    startX: 0,
    startY: 0.5,
    endX: 1,
    endY: 0.5,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    invert: false,
  }
}

function createLinearMask() {
  return {
    id: Date.now(),
    type: 'linear',
    centerX: 0.5,
    centerY: 0.5,
    radiusX: 0.3,
    radiusY: 0.3,
    feather: 0.5,
    startX: 0,
    startY: 0.5,
    endX: 1,
    endY: 0.5,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    invert: false,
  }
}

export function MaskPanel({ masks = [], onMasksChange }) {
  const addRadial = () => {
    if (masks.length >= MAX_MASKS) return
    onMasksChange([...(masks || []), createRadialMask()])
  }

  const addLinear = () => {
    if (masks.length >= MAX_MASKS) return
    onMasksChange([...(masks || []), createLinearMask()])
  }

  const updateMask = (index, updates) => {
    const next = [...(masks || [])]
    next[index] = { ...next[index], ...updates }
    onMasksChange(next)
  }

  const deleteMask = (index) => {
    onMasksChange((masks || []).filter((_, i) => i !== index))
  }

  return (
    <div className="mt-4 lg:mt-6 bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Local Adjustments</h3>
      <div className="flex gap-2 mb-4">
        <button
          onClick={addRadial}
          disabled={masks.length >= MAX_MASKS}
          className="flex-1 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 rounded-lg transition-colors"
        >
          Add Radial Mask
        </button>
        <button
          onClick={addLinear}
          disabled={masks.length >= MAX_MASKS}
          className="flex-1 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 rounded-lg transition-colors"
        >
          Add Linear Mask
        </button>
      </div>
      {masks.length >= MAX_MASKS && (
        <p className="text-xs text-zinc-500 mb-3">Max {MAX_MASKS} masks for performance.</p>
      )}
      <div className="space-y-4">
        {(masks || []).map((mask, index) => (
          <div
            key={mask.id ?? index}
            className="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700 space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-indigo-400 capitalize">
                {mask.type === 'radial' ? 'Radial' : 'Linear'} Mask {index + 1}
              </span>
              <button
                onClick={() => deleteMask(index)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            </div>
            {mask.type === 'radial' ? (
              <>
                <Slider
                  label="Center X"
                  value={mask.centerX ?? 0.5}
                  onChange={(v) => updateMask(index, { centerX: v })}
                  min={0}
                  max={1}
                  defaultValue={0.5}
                />
                <Slider
                  label="Center Y"
                  value={mask.centerY ?? 0.5}
                  onChange={(v) => updateMask(index, { centerY: v })}
                  min={0}
                  max={1}
                  defaultValue={0.5}
                />
                <Slider
                  label="Radius X"
                  value={mask.radiusX ?? 0.3}
                  onChange={(v) => updateMask(index, { radiusX: v })}
                  min={0.05}
                  max={1}
                  defaultValue={0.3}
                />
                <Slider
                  label="Radius Y"
                  value={mask.radiusY ?? 0.3}
                  onChange={(v) => updateMask(index, { radiusY: v })}
                  min={0.05}
                  max={1}
                  defaultValue={0.3}
                />
                <Slider
                  label="Feather"
                  value={mask.feather ?? 0.5}
                  onChange={(v) => updateMask(index, { feather: v })}
                  min={0}
                  max={1}
                  defaultValue={0.5}
                />
              </>
            ) : (
              <>
                <Slider
                  label="Start X"
                  value={mask.startX ?? 0}
                  onChange={(v) => updateMask(index, { startX: v })}
                  min={0}
                  max={1}
                  defaultValue={0}
                />
                <Slider
                  label="Start Y"
                  value={mask.startY ?? 0.5}
                  onChange={(v) => updateMask(index, { startY: v })}
                  min={0}
                  max={1}
                  defaultValue={0.5}
                />
                <Slider
                  label="End X"
                  value={mask.endX ?? 1}
                  onChange={(v) => updateMask(index, { endX: v })}
                  min={0}
                  max={1}
                  defaultValue={1}
                />
                <Slider
                  label="End Y"
                  value={mask.endY ?? 0.5}
                  onChange={(v) => updateMask(index, { endY: v })}
                  min={0}
                  max={1}
                  defaultValue={0.5}
                />
              </>
            )}
            <Slider
              label="Brightness"
              value={mask.brightness ?? 0}
              onChange={(v) => updateMask(index, { brightness: v })}
              min={-1}
              max={1}
              defaultValue={0}
            />
            <Slider
              label="Contrast"
              value={mask.contrast ?? 0}
              onChange={(v) => updateMask(index, { contrast: v })}
              min={-1}
              max={1}
              defaultValue={0}
            />
            <Slider
              label="Saturation"
              value={mask.saturation ?? 0}
              onChange={(v) => updateMask(index, { saturation: v })}
              min={-1}
              max={1}
              defaultValue={0}
            />
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={!!mask.invert}
                onChange={(e) => updateMask(index, { invert: e.target.checked })}
                className="rounded accent-indigo-500"
              />
              Invert mask
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
