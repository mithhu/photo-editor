import { useCallback } from 'react'
import type { EditState, ColorSplash } from '../types'

interface ColorSplashPanelProps {
  colorSplash: ColorSplash
  onUpdate: (changes: Partial<EditState>) => void
  onSliderUpdate: (changes: ((prev: EditState) => EditState) | Partial<EditState>) => void
}

const HUE_PRESETS = [
  { label: 'Red', hue: 0, color: '#ef4444' },
  { label: 'Orange', hue: 30, color: '#f97316' },
  { label: 'Yellow', hue: 60, color: '#eab308' },
  { label: 'Green', hue: 120, color: '#22c55e' },
  { label: 'Cyan', hue: 180, color: '#06b6d4' },
  { label: 'Blue', hue: 240, color: '#3b82f6' },
  { label: 'Purple', hue: 280, color: '#a855f7' },
  { label: 'Pink', hue: 330, color: '#ec4899' },
]

export function ColorSplashPanel({ colorSplash, onUpdate, onSliderUpdate }: ColorSplashPanelProps) {
  const toggle = useCallback(() => {
    onUpdate({ colorSplash: { ...colorSplash, enabled: !colorSplash.enabled } })
  }, [colorSplash, onUpdate])

  const setHue = useCallback((hue: number) => {
    onUpdate({ colorSplash: { ...colorSplash, enabled: true, hue } })
  }, [colorSplash, onUpdate])

  const setRange = useCallback((range: number) => {
    onSliderUpdate((prev: EditState) => ({
      ...prev,
      colorSplash: { ...prev.colorSplash, range },
    }))
  }, [onSliderUpdate])

  const setSaturation = useCallback((saturation: number) => {
    onSliderUpdate((prev: EditState) => ({
      ...prev,
      colorSplash: { ...prev.colorSplash, saturation },
    }))
  }, [onSliderUpdate])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Color Splash</h3>
        <button
          onClick={toggle}
          className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
            colorSplash.enabled
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-700 text-zinc-400'
          }`}
        >
          {colorSplash.enabled ? 'ON' : 'OFF'}
        </button>
      </div>
      <p className="text-[10px] text-zinc-500">
        Keep one color vibrant, turn everything else black & white.
      </p>

      {/* Color presets */}
      <div className="grid grid-cols-4 gap-1.5">
        {HUE_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setHue(p.hue)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              colorSplash.enabled && Math.abs(colorSplash.hue - p.hue) < 15
                ? 'bg-zinc-700 ring-1 ring-purple-500'
                : 'bg-zinc-800/60 hover:bg-zinc-700/80'
            }`}
          >
            <div
              className="w-6 h-6 rounded-full border border-zinc-600"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-[9px] text-zinc-400">{p.label}</span>
          </button>
        ))}
      </div>

      {colorSplash.enabled && (
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-zinc-500">Hue</label>
              <span className="text-[10px] text-zinc-500 tabular-nums">{colorSplash.hue}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={colorSplash.hue}
              onChange={(e) => setHue(parseInt(e.target.value))}
              className="w-full h-1.5 accent-purple-500"
              style={{
                background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
                borderRadius: 4,
              }}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-zinc-500">Color Range</label>
              <span className="text-[10px] text-zinc-500 tabular-nums">{colorSplash.range}°</span>
            </div>
            <input
              type="range"
              min={5}
              max={90}
              step={1}
              value={colorSplash.range}
              onChange={(e) => setRange(parseInt(e.target.value))}
              className="w-full h-1.5 accent-purple-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-zinc-500">Color Boost</label>
              <span className="text-[10px] text-zinc-500 tabular-nums">{Math.round(colorSplash.saturation * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={colorSplash.saturation}
              onChange={(e) => setSaturation(parseFloat(e.target.value))}
              className="w-full h-1.5 accent-purple-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}
