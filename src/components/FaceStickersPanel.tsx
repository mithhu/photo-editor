import { useState, useCallback } from 'react'
import { FACE_STICKER_CATEGORIES, type FaceStickerDef } from '../data/faceStickers'
import type { FaceKeypoint, FaceStickerInstance, EditState } from '../types'

interface FaceStickersPanelProps {
  faceStickers: FaceStickerInstance[]
  faceKeypoints: FaceKeypoint[] | null
  onUpdate: (changes: Partial<EditState>) => void
}

export function FaceStickersPanel({ faceStickers, faceKeypoints, onUpdate }: FaceStickersPanelProps) {
  const [activeCat, setActiveCat] = useState(FACE_STICKER_CATEGORIES[0].id)

  const hasFace = faceKeypoints && faceKeypoints.length >= 468

  const addSticker = useCallback((def: FaceStickerDef) => {
    const instance: FaceStickerInstance = {
      id: `fs-${def.id}-${Date.now()}`,
      stickerId: def.id,
      emoji: def.emoji,
      anchor: def.anchor,
      offsetY: def.offsetY,
      scale: def.scale,
      rotation: def.rotation ?? 0,
    }
    onUpdate({ faceStickers: [...faceStickers, instance] })
  }, [faceStickers, onUpdate])

  const removeSticker = useCallback((id: string) => {
    onUpdate({ faceStickers: faceStickers.filter((s) => s.id !== id) })
  }, [faceStickers, onUpdate])

  const clearAll = useCallback(() => {
    onUpdate({ faceStickers: [] })
  }, [onUpdate])

  const updateSticker = useCallback((id: string, changes: Partial<FaceStickerInstance>) => {
    onUpdate({
      faceStickers: faceStickers.map((s) =>
        s.id === id ? { ...s, ...changes } : s
      ),
    })
  }, [faceStickers, onUpdate])

  const activeCategory = FACE_STICKER_CATEGORIES.find((c) => c.id === activeCat) ?? FACE_STICKER_CATEGORIES[0]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Face Stickers</h3>
        {faceStickers.length > 0 && (
          <button
            onClick={clearAll}
            className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {!hasFace && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2.5">
          <p className="text-[10px] text-yellow-400/80 leading-relaxed">
            Upload a photo with a visible face for auto-placement. You can still add stickers manually.
          </p>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {FACE_STICKER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            className={`px-2 py-1 text-[10px] rounded-md transition-colors ${
              activeCat === cat.id
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sticker grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {activeCategory.stickers.map((sticker) => (
          <button
            key={sticker.id}
            onClick={() => addSticker(sticker)}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/80 transition-colors group"
            title={sticker.label}
          >
            <span className="text-xl group-hover:scale-110 transition-transform">
              {sticker.emoji}
            </span>
            <span className="text-[8px] text-zinc-500 truncate w-full text-center">
              {sticker.label}
            </span>
          </button>
        ))}
      </div>

      {/* Active stickers list */}
      {faceStickers.length > 0 && (
        <div className="space-y-2 mt-2">
          <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider">
            Active ({faceStickers.length})
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {faceStickers.map((sticker) => (
              <div
                key={sticker.id}
                className="flex items-center gap-2 bg-zinc-800/60 rounded-lg p-2"
              >
                <span className="text-lg">{sticker.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] text-zinc-500 w-8">Size</label>
                    <input
                      type="range"
                      min={0.2}
                      max={3}
                      step={0.1}
                      value={sticker.scale}
                      onChange={(e) => updateSticker(sticker.id, { scale: parseFloat(e.target.value) })}
                      className="flex-1 h-1 accent-purple-500"
                    />
                    <span className="text-[9px] text-zinc-500 w-6 text-right tabular-nums">
                      {sticker.scale.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <label className="text-[9px] text-zinc-500 w-8">Rot</label>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={5}
                      value={sticker.rotation}
                      onChange={(e) => updateSticker(sticker.id, { rotation: parseInt(e.target.value) })}
                      className="flex-1 h-1 accent-purple-500"
                    />
                    <span className="text-[9px] text-zinc-500 w-6 text-right tabular-nums">
                      {sticker.rotation}°
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeSticker(sticker.id)}
                  className="text-zinc-600 hover:text-red-400 text-xs transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
