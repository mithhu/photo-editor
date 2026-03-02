import { useCallback } from 'react'
import type { EditState, DateStamp } from '../types'

interface DateStampPanelProps {
  dateStamp: DateStamp
  onUpdate: (changes: Partial<EditState>) => void
}

const STAMP_STYLES: { id: DateStamp['style']; label: string; preview: string }[] = [
  { id: 'film', label: 'Film Camera', preview: "'98  12  25" },
  { id: 'digital', label: 'Digital', preview: '2026-02-21 14:30' },
  { id: 'minimal', label: 'Minimal', preview: '21.02.26' },
  { id: 'retro', label: 'Retro', preview: 'FEB 21 2026' },
  { id: 'polaroid', label: 'Polaroid', preview: '02/21/26' },
]

const POSITIONS: { id: DateStamp['position']; label: string }[] = [
  { id: 'bottom-right', label: '↘ Bottom Right' },
  { id: 'bottom-left', label: '↙ Bottom Left' },
  { id: 'top-right', label: '↗ Top Right' },
  { id: 'top-left', label: '↖ Top Left' },
]

const STAMP_COLORS = [
  { label: 'Orange', color: '#ff6b00' },
  { label: 'Yellow', color: '#ffd700' },
  { label: 'Red', color: '#ff3b30' },
  { label: 'White', color: '#ffffff' },
  { label: 'Green', color: '#4cd964' },
  { label: 'Amber', color: '#ff9500' },
]

const FORMAT_OPTIONS = [
  { id: 'date', label: 'Date Only' },
  { id: 'datetime', label: 'Date & Time' },
  { id: 'custom', label: 'Custom Text' },
]

export function DateStampPanel({ dateStamp, onUpdate }: DateStampPanelProps) {
  const update = useCallback((changes: Partial<DateStamp>) => {
    onUpdate({ dateStamp: { ...dateStamp, ...changes } })
  }, [dateStamp, onUpdate])

  const toggle = useCallback(() => {
    update({ enabled: !dateStamp.enabled })
  }, [dateStamp.enabled, update])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Date Stamp</h3>
        <button
          onClick={toggle}
          className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
            dateStamp.enabled
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-700 text-zinc-400'
          }`}
        >
          {dateStamp.enabled ? 'ON' : 'OFF'}
        </button>
      </div>
      <p className="text-[10px] text-zinc-500">
        Add a film-camera style date/time stamp.
      </p>

      {/* Style presets */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-zinc-500">Style:</p>
        <div className="grid grid-cols-3 gap-1">
          {STAMP_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => update({ enabled: true, style: s.id })}
              className={`p-2 rounded-lg text-left transition-colors ${
                dateStamp.style === s.id && dateStamp.enabled
                  ? 'bg-purple-500/20 border border-purple-500'
                  : 'bg-zinc-800/60 border border-transparent hover:bg-zinc-700/80'
              }`}
            >
              <p className="text-[10px] font-medium text-zinc-300">{s.label}</p>
              <p className="text-[8px] text-zinc-500 font-mono mt-0.5">{s.preview}</p>
            </button>
          ))}
        </div>
      </div>

      {dateStamp.enabled && (
        <div className="space-y-3">
          {/* Format */}
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">Content:</p>
            <div className="flex gap-1 flex-wrap">
              {FORMAT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => update({ format: f.id })}
                  className={`px-2 py-1 text-[10px] rounded-md transition-colors ${
                    dateStamp.format === f.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {dateStamp.format === 'custom' && (
            <input
              type="text"
              value={dateStamp.text}
              onChange={(e) => update({ text: e.target.value })}
              placeholder="Your text here..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-purple-500"
            />
          )}

          {/* Position */}
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">Position:</p>
            <div className="grid grid-cols-2 gap-1">
              {POSITIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => update({ position: p.id })}
                  className={`px-2 py-1.5 text-[10px] rounded-md transition-colors ${
                    dateStamp.position === p.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">Color:</p>
            <div className="flex gap-1.5">
              {STAMP_COLORS.map((c) => (
                <button
                  key={c.color}
                  onClick={() => update({ color: c.color })}
                  className={`w-7 h-7 rounded-full border-2 transition-colors ${
                    dateStamp.color === c.color ? 'border-white' : 'border-zinc-600'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
