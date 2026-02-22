import { useMemo, useState } from 'react'
import type { TextOverlay, ShapeOverlay } from '../types'

interface Layer {
  id: string | number
  layerType: 'text' | 'shape'
  originalIndex: number
  label: string
  icon: string
  opacity?: number
  blendMode?: string
  [key: string]: unknown
}

const SHAPE_ICONS: Record<string, string> = { circle: '●', square: '■', triangle: '▲', star: '★', heart: '♥', 'arrow-right': '→', 'arrow-up': '↑', sticker: '📎' }
const BLEND_MODES: string[] = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion']

interface LayerPanelProps {
  textOverlays: TextOverlay[] | undefined
  shapeOverlays: ShapeOverlay[] | undefined
  layerVisibility: Record<string, boolean> | undefined
  onReorder: (layerType: 'text' | 'shape', fromIndex: number, toIndex: number) => void
  onToggleVisibility: (id: string | number) => void
  onDelete: (layerType: 'text' | 'shape', index: number) => void
  onUpdateLayer?: (layerType: 'text' | 'shape', index: number, updates: Record<string, unknown>) => void
}

export function LayerPanel({ textOverlays, shapeOverlays, layerVisibility, onReorder, onToggleVisibility, onDelete, onUpdateLayer }: LayerPanelProps) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null)

  const layers: Layer[] = useMemo(() => {
    const texts: Layer[] = (textOverlays || []).map((t, i) => ({ ...t, layerType: 'text' as const, originalIndex: i, label: t.text || 'Text', icon: 'T' }))
    const shapes: Layer[] = (shapeOverlays || []).map((s, i) => ({
      ...s,
      layerType: 'shape' as const,
      originalIndex: i,
      label: s.type === 'sticker' ? `${s.emoji || ''} Sticker` : (s.type?.replace('-', ' ') || 'Shape'),
      icon: s.type === 'sticker' ? (s.emoji || '📎') : (SHAPE_ICONS[s.type || ''] || '●'),
    }))
    return [...texts, ...shapes].sort((a, b) => (Number(a.id) ?? 0) - (Number(b.id) ?? 0))
  }, [textOverlays, shapeOverlays])

  if (!layers.length) return null

  return (
    <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Layers</h3>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {layers.map((layer) => {
          const isVisible = layerVisibility?.[String(layer.id)] !== false
          const isExpanded = expandedId === layer.id
          return (
            <div key={layer.id} className="rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800/50 group">
                <button onClick={() => setExpandedId(isExpanded ? null : layer.id)} className="text-xs text-zinc-600 hover:text-zinc-400">
                  {isExpanded ? '▾' : '▸'}
                </button>
                <span className="text-xs text-zinc-500 w-5 text-center">{layer.icon}</span>
                <span className="flex-1 text-xs text-zinc-300 truncate">{layer.label}</span>
                <button onClick={() => onToggleVisibility(layer.id)} className={`text-xs ${isVisible ? 'text-zinc-400' : 'text-zinc-600'} hover:text-indigo-400`} title={isVisible ? 'Hide' : 'Show'}>
                  {isVisible ? '👁' : '👁‍🗨'}
                </button>
                <button onClick={() => onReorder(layer.layerType, layer.originalIndex, layer.originalIndex - 1)} className="text-xs text-zinc-500 hover:text-zinc-300" title="Move up">↑</button>
                <button onClick={() => onReorder(layer.layerType, layer.originalIndex, layer.originalIndex + 1)} className="text-xs text-zinc-500 hover:text-zinc-300" title="Move down">↓</button>
                <button onClick={() => onDelete(layer.layerType, layer.originalIndex)} className="text-xs text-red-400 hover:text-red-300">×</button>
              </div>
              {isExpanded && (
                <div className="px-3 py-2 bg-zinc-800/40 space-y-2 border-t border-zinc-800/50">
                  <label className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 w-12 shrink-0">Opacity</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round((layer.opacity ?? 1) * 100)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateLayer?.(layer.layerType, layer.originalIndex, { opacity: Number(e.target.value) / 100 })}
                      className="flex-1 accent-indigo-500 h-1"
                    />
                    <span className="text-[10px] text-zinc-500 w-7 text-right font-mono">{Math.round((layer.opacity ?? 1) * 100)}%</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 w-12 shrink-0">Blend</span>
                    <select
                      value={(layer.blendMode as string) || 'normal'}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onUpdateLayer?.(layer.layerType, layer.originalIndex, { blendMode: e.target.value })}
                      className="flex-1 text-[10px] bg-zinc-700 text-zinc-300 rounded px-1.5 py-1 border border-zinc-600"
                    >
                      {BLEND_MODES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
