import { useCallback } from 'react'
import { Slider } from './Slider'
import { EFFECT_OVERLAY_PRESETS, type EffectOverlayType } from '../utils/effectOverlays'
import type { EditState, EffectOverlay } from '../types'

interface EffectsPanelProps {
  effectOverlay: EffectOverlay
  onUpdate: (changes: Partial<EditState>) => void
  onSliderUpdate: (changes: ((prev: EditState) => EditState) | Partial<EditState>) => void
}

export function EffectsPanel({ effectOverlay, onUpdate, onSliderUpdate }: EffectsPanelProps) {
  const activeType = effectOverlay?.type ?? 'none'
  const intensity = effectOverlay?.intensity ?? 50

  const handleSelect = useCallback(
    (type: EffectOverlayType) => {
      const seed = type === activeType ? (effectOverlay?.seed ?? 42) : Math.floor(Math.random() * 100000)
      onUpdate({
        effectOverlay: { type, intensity: type === 'none' ? 0 : intensity || 50, seed },
      })
    },
    [activeType, intensity, effectOverlay?.seed, onUpdate],
  )

  const handleIntensity = useCallback(
    (v: number) => {
      onSliderUpdate((s: EditState) => ({
        ...s,
        effectOverlay: { ...s.effectOverlay, intensity: v },
      }))
    },
    [onSliderUpdate],
  )

  const handleReseed = useCallback(() => {
    onUpdate({
      effectOverlay: {
        ...effectOverlay,
        seed: Math.floor(Math.random() * 100000),
      },
    })
  }, [effectOverlay, onUpdate])

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Effects</h3>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {EFFECT_OVERLAY_PRESETS.map((preset) => {
          const isActive = activeType === preset.id
          return (
            <button
              key={preset.id}
              onClick={() => handleSelect(preset.id)}
              className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-all border ${
                isActive
                  ? 'bg-purple-500/20 border-purple-500 ring-1 ring-purple-500/50 text-purple-300'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 hover:border-purple-500/30 text-zinc-400'
              }`}
            >
              <span className="text-lg leading-none">{preset.emoji}</span>
              <span className="text-[10px] leading-tight">{preset.name}</span>
            </button>
          )
        })}
      </div>

      {activeType !== 'none' && (
        <div className="space-y-3">
          <Slider
            label="Intensity"
            value={intensity}
            onChange={handleIntensity}
            min={5}
            max={100}
            step={1}
            defaultValue={50}
          />
          <button
            onClick={handleReseed}
            className="w-full py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
          >
            Randomize Pattern
          </button>
        </div>
      )}
    </div>
  )
}
