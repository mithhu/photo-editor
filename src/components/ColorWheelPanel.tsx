import { Slider } from './Slider'
import type { ColorGradeZone } from '../types'

interface ColorGrade {
  shadows: ColorGradeZone
  midtones: ColorGradeZone
  highlights: ColorGradeZone
}

type ColorGradeZoneId = keyof ColorGrade

interface SectionDef {
  id: ColorGradeZoneId
  label: string
}

interface ColorWheelPanelProps {
  colorGrade: ColorGrade | undefined
  onChange: (zone: ColorGradeZoneId, value: ColorGradeZone) => void
}

export function ColorWheelPanel({ colorGrade, onChange }: ColorWheelPanelProps) {
  const sections: SectionDef[] = [
    { id: 'shadows', label: 'Shadows' },
    { id: 'midtones', label: 'Midtones' },
    { id: 'highlights', label: 'Highlights' },
  ]

  return (
    <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">Color Grading</h3>
      <div className="space-y-5">
        {sections.map(({ id, label }) => {
          const val: ColorGradeZone = colorGrade?.[id] || { r: 0, g: 0, b: 0 }
          const hasValue = val.r !== 0 || val.g !== 0 || val.b !== 0
          return (
            <div key={id}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-zinc-400 font-medium">{label}</span>
                {hasValue && (
                  <button
                    type="button"
                    onClick={() => onChange(id, { r: 0, g: 0, b: 0 })}
                    className="text-xs text-zinc-500 hover:text-indigo-400"
                  >
                    ↺
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <Slider
                  label="R"
                  value={val.r}
                  onChange={(v) => onChange(id, { ...val, r: v })}
                  min={-1}
                  max={1}
                  step={0.01}
                  defaultValue={0}
                />
                <Slider
                  label="G"
                  value={val.g}
                  onChange={(v) => onChange(id, { ...val, g: v })}
                  min={-1}
                  max={1}
                  step={0.01}
                  defaultValue={0}
                />
                <Slider
                  label="B"
                  value={val.b}
                  onChange={(v) => onChange(id, { ...val, b: v })}
                  min={-1}
                  max={1}
                  step={0.01}
                  defaultValue={0}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
