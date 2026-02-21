import { useState } from 'react'
import { Slider } from './Slider'

const HSL_COLORS = [
  { id: 'red', label: 'R', color: '#ef4444' },
  { id: 'orange', label: 'O', color: '#f97316' },
  { id: 'yellow', label: 'Y', color: '#eab308' },
  { id: 'green', label: 'G', color: '#22c55e' },
  { id: 'cyan', label: 'C', color: '#06b6d4' },
  { id: 'blue', label: 'B', color: '#3b82f6' },
  { id: 'purple', label: 'P', color: '#a855f7' },
  { id: 'magenta', label: 'M', color: '#ec4899' },
]

export function HSLPanel({ hsl, onChange }) {
  const [activeColor, setActiveColor] = useState('red')
  const active = hsl?.[activeColor] ?? { h: 0, s: 0, l: 0 }

  return (
    <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">HSL / Color</h3>
      <div className="flex gap-1.5 mb-4 justify-center">
        {HSL_COLORS.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveColor(c.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
            style={{
              backgroundColor: c.color,
              boxShadow: activeColor === c.id ? '0 0 0 2px #fff' : 'none',
              opacity: activeColor === c.id ? 1 : 0.6,
            }}
            title={c.id}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        <Slider
          label="Hue"
          value={active.h}
          onChange={(v) => onChange(activeColor, 'h', v)}
          min={-1}
          max={1}
          defaultValue={0}
        />
        <Slider
          label="Saturation"
          value={active.s}
          onChange={(v) => onChange(activeColor, 's', v)}
          min={-1}
          max={1}
          defaultValue={0}
        />
        <Slider
          label="Luminance"
          value={active.l}
          onChange={(v) => onChange(activeColor, 'l', v)}
          min={-1}
          max={1}
          defaultValue={0}
        />
      </div>
    </div>
  )
}
