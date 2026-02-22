import { Slider } from './Slider'
import type { SplitTone } from '../types'

interface SplitTonePanelProps {
  splitTone: SplitTone | undefined
  onChange: (value: SplitTone) => void
}

export function SplitTonePanel({ splitTone, onChange }: SplitTonePanelProps) {
  const st: SplitTone = splitTone || {
    highlightHue: 0,
    highlightSat: 0,
    shadowHue: 0,
    shadowSat: 0,
    balance: 0,
  }

  return (
    <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Split Toning</h3>
      <div className="space-y-4">
        <div>
          <span className="text-xs text-zinc-400 font-medium block mb-2">Highlights</span>
          <Slider
            label="Hue"
            value={st.highlightHue}
            onChange={(v) => onChange({ ...st, highlightHue: v })}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0}
          />
          <Slider
            label="Saturation"
            value={st.highlightSat}
            onChange={(v) => onChange({ ...st, highlightSat: v })}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0}
          />
        </div>
        <div>
          <span className="text-xs text-zinc-400 font-medium block mb-2">Shadows</span>
          <Slider
            label="Hue"
            value={st.shadowHue}
            onChange={(v) => onChange({ ...st, shadowHue: v })}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0}
          />
          <Slider
            label="Saturation"
            value={st.shadowSat}
            onChange={(v) => onChange({ ...st, shadowSat: v })}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0}
          />
        </div>
        <Slider
          label="Balance"
          value={st.balance}
          onChange={(v) => onChange({ ...st, balance: v })}
          min={-1}
          max={1}
          step={0.01}
          defaultValue={0}
        />
      </div>
    </div>
  )
}
