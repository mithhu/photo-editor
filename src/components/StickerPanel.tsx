import React, { useCallback } from 'react'
import { STICKER_CATEGORIES, STICKER_DEFAULT_SIZE } from '../constants'

interface StickerData {
  id: number
  type: 'sticker'
  emoji: string
  x: number
  y: number
  size: number
  color: string
  rotation: number
}

interface StickerPanelProps {
  onAddSticker?: (sticker: StickerData) => void
}

export function StickerPanel({ onAddSticker }: StickerPanelProps) {
  const handleStickerClick = useCallback(
    (emoji: string) => {
      onAddSticker?.({
        id: Date.now(),
        type: 'sticker',
        emoji,
        x: 0.5,
        y: 0.5,
        size: STICKER_DEFAULT_SIZE,
        color: '#ffffff',
        rotation: 0,
      })
    },
    [onAddSticker],
  )

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-medium text-zinc-400">Stickers</h4>
      {STICKER_CATEGORIES.map((category) => (
        <div key={category.id}>
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-2">{category.label}</p>
          <div className="grid grid-cols-5 gap-2">
            {category.emojis.map((emoji, i) => (
              <button
                key={`${category.id}-${i}`}
                onClick={() => handleStickerClick(emoji)}
                className="aspect-square flex items-center justify-center text-2xl bg-zinc-700/80 hover:bg-zinc-600 rounded-lg transition-colors active:scale-95"
                title={`Add ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
