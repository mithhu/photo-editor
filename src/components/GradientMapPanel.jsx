import { useState } from 'react'

const PRESETS = [
  { id: 'classic', name: 'Classic', shadows: '#1a1a2e', highlights: '#e8d5b7' },
  { id: 'cyanotype', name: 'Cyanotype', shadows: '#00304e', highlights: '#c1e8ff' },
  { id: 'sepia', name: 'Sepia', shadows: '#2a1a0a', highlights: '#e8c88a' },
  { id: 'midnight', name: 'Midnight', shadows: '#0a0a3a', highlights: '#8888ff' },
  { id: 'sunset', name: 'Sunset', shadows: '#2d1b3d', highlights: '#ff9e6d' },
  { id: 'forest', name: 'Forest', shadows: '#0a2a1a', highlights: '#a8e6a3' },
  { id: 'infrared', name: 'Infrared', shadows: '#1a0a2a', highlights: '#ff6b9d' },
  { id: 'gold', name: 'Gold', shadows: '#1a1400', highlights: '#ffd700' },
  { id: 'ice', name: 'Ice', shadows: '#0a1a2a', highlights: '#e0f0ff' },
  { id: 'neon', name: 'Neon', shadows: '#0d0221', highlights: '#ff00ff' },
  { id: 'ember', name: 'Ember', shadows: '#1a0505', highlights: '#ff4422' },
  { id: 'ocean', name: 'Ocean', shadows: '#001122', highlights: '#44ddaa' },
]

export function GradientMapPanel({ editState, applyChange }) {
  const gm = editState.gradientMap || { enabled: false, shadows: '#1a1a2e', highlights: '#e8d5b7', intensity: 0.7 }
  const [activePreset, setActivePreset] = useState(null)

  const update = (patch) => {
    applyChange({ gradientMap: { ...gm, ...patch } })
  }

  return (
    <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300">Gradient Map / Duotone</h3>
        <button
          onClick={() => update({ enabled: !gm.enabled })}
          className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
            gm.enabled
              ? 'bg-indigo-500 text-white'
              : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
          }`}
        >
          {gm.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {gm.enabled && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActivePreset(p.id)
                  update({ shadows: p.shadows, highlights: p.highlights })
                }}
                className={`group relative rounded-lg overflow-hidden transition-all ${
                  activePreset === p.id ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-zinc-900' : ''
                }`}
              >
                <div
                  className="h-8 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${p.shadows}, ${p.highlights})`,
                  }}
                />
                <span className="block text-[9px] text-zinc-400 group-hover:text-zinc-300 py-0.5 truncate">
                  {p.name}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 flex-1">
              <span className="text-[10px] text-zinc-500 uppercase w-16 shrink-0">Shadows</span>
              <input
                type="color"
                value={gm.shadows || '#1a1a2e'}
                onChange={(e) => { setActivePreset(null); update({ shadows: e.target.value }) }}
                className="w-8 h-6 rounded cursor-pointer border border-zinc-700 bg-transparent"
              />
              <span className="text-[10px] text-zinc-500 font-mono">{gm.shadows}</span>
            </label>
            <label className="flex items-center gap-2 flex-1">
              <span className="text-[10px] text-zinc-500 uppercase w-16 shrink-0">Highlights</span>
              <input
                type="color"
                value={gm.highlights || '#e8d5b7'}
                onChange={(e) => { setActivePreset(null); update({ highlights: e.target.value }) }}
                className="w-8 h-6 rounded cursor-pointer border border-zinc-700 bg-transparent"
              />
              <span className="text-[10px] text-zinc-500 font-mono">{gm.highlights}</span>
            </label>
          </div>

          <div
            className="h-4 rounded-lg border border-zinc-700/50"
            style={{ background: `linear-gradient(90deg, ${gm.shadows || '#1a1a2e'}, ${gm.highlights || '#e8d5b7'})` }}
          />

          <label className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-16 shrink-0">Intensity</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round((gm.intensity ?? 0.7) * 100)}
              onChange={(e) => update({ intensity: e.target.value / 100 })}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs text-zinc-500 w-8 text-right font-mono">
              {Math.round((gm.intensity ?? 0.7) * 100)}%
            </span>
          </label>

          <button
            onClick={() => applyChange({ gradientMap: { enabled: false, shadows: '#1a1a2e', highlights: '#e8d5b7', intensity: 0.7 } })}
            className="w-full py-1.5 text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}
