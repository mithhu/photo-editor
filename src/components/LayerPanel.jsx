import { useMemo } from 'react'

const SHAPE_ICONS = { circle: '●', square: '■', triangle: '▲', star: '★', heart: '♥', 'arrow-right': '→', 'arrow-up': '↑', sticker: '📎' }

export function LayerPanel({ textOverlays, shapeOverlays, layerVisibility, onReorder, onToggleVisibility, onDelete }) {
  const layers = useMemo(() => {
    const texts = (textOverlays || []).map((t, i) => ({ ...t, layerType: 'text', originalIndex: i, label: t.text || 'Text', icon: 'T' }))
    const shapes = (shapeOverlays || []).map((s, i) => ({
      ...s,
      layerType: 'shape',
      originalIndex: i,
      label: s.type === 'sticker' ? `${s.emoji || ''} Sticker` : (s.type?.replace('-', ' ') || 'Shape'),
      icon: s.type === 'sticker' ? (s.emoji || '📎') : (SHAPE_ICONS[s.type] || '●'),
    }))
    return [...texts, ...shapes].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
  }, [textOverlays, shapeOverlays])

  if (!layers.length) return null

  return (
    <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Layers</h3>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {layers.map((layer) => {
          const isVisible = layerVisibility?.[layer.id] !== false
          return (
            <div key={layer.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800/50 group">
              <span className="text-xs text-zinc-500 w-5 text-center">{layer.icon}</span>
              <span className="flex-1 text-xs text-zinc-300 truncate">{layer.label}</span>
              <button onClick={() => onToggleVisibility(layer.id)} className={`text-xs ${isVisible ? 'text-zinc-400' : 'text-zinc-600'} hover:text-amber-400`} title={isVisible ? 'Hide' : 'Show'}>
                {isVisible ? '👁' : '👁‍🗨'}
              </button>
              <button onClick={() => onReorder(layer.layerType, layer.originalIndex, layer.originalIndex - 1)} className="text-xs text-zinc-500 hover:text-zinc-300" title="Move up">↑</button>
              <button onClick={() => onReorder(layer.layerType, layer.originalIndex, layer.originalIndex + 1)} className="text-xs text-zinc-500 hover:text-zinc-300" title="Move down">↓</button>
              <button onClick={() => onDelete(layer.layerType, layer.originalIndex)} className="text-xs text-red-400 hover:text-red-300">×</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
