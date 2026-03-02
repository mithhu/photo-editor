import { useCallback } from 'react'
import type { EditState, MirrorEffect } from '../types'

interface MirrorEffectPanelProps {
  mirrorEffect: MirrorEffect
  onUpdate: (changes: Partial<EditState>) => void
}

const MIRROR_PRESETS: { type: MirrorEffect['type']; label: string; emoji: string; desc: string }[] = [
  { type: 'none', label: 'None', emoji: '⊘', desc: 'Original' },
  { type: 'horizontal', label: 'Horizontal', emoji: '↔️', desc: 'Left mirrors right' },
  { type: 'vertical', label: 'Vertical', emoji: '↕️', desc: 'Top mirrors bottom' },
  { type: 'quad', label: 'Quad', emoji: '◫', desc: '4-way mirror' },
  { type: 'kaleidoscope', label: 'Kaleidoscope', emoji: '❖', desc: '8-way pattern' },
]

export function MirrorEffectPanel({ mirrorEffect, onUpdate }: MirrorEffectPanelProps) {
  const select = useCallback((type: MirrorEffect['type']) => {
    onUpdate({ mirrorEffect: { type } })
  }, [onUpdate])

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-300">Mirror & Symmetry</h3>
      <p className="text-[10px] text-zinc-500">
        Create mesmerizing symmetry effects.
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {MIRROR_PRESETS.map((p) => (
          <button
            key={p.type}
            onClick={() => select(p.type)}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-lg transition-colors ${
              mirrorEffect.type === p.type
                ? 'bg-purple-500/20 border border-purple-500 text-white'
                : 'bg-zinc-800/60 border border-transparent hover:bg-zinc-700/80 text-zinc-400'
            }`}
          >
            <span className="text-xl">{p.emoji}</span>
            <span className="text-[10px] font-medium">{p.label}</span>
            <span className="text-[8px] text-zinc-500">{p.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
