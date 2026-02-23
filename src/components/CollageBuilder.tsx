import { useState, useCallback, type ReactNode, type ChangeEvent } from 'react'

interface CellRect {
  x: number
  y: number
  w: number
  h: number
}

interface CollageLayout {
  id: string
  name: string
  cells: CellRect[]
}

interface OutputSize {
  id: string
  label: string
  w: number
  h: number
}

const COLLAGE_LAYOUTS: CollageLayout[] = [
  {
    id: 'grid-2',
    name: '2 Photos',
    cells: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  {
    id: 'grid-3h',
    name: '3 Horizontal',
    cells: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  {
    id: 'grid-3v',
    name: '3 Vertical',
    cells: [
      { x: 0, y: 0, w: 1, h: 1 / 3 },
      { x: 0, y: 1 / 3, w: 1, h: 1 / 3 },
      { x: 0, y: 2 / 3, w: 1, h: 1 / 3 },
    ],
  },
  {
    id: 'grid-4',
    name: '4 Grid',
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: 'grid-6',
    name: '6 Grid',
    cells: [
      { x: 0, y: 0, w: 1 / 3, h: 0.5 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 0.5 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 0.5 },
      { x: 0, y: 0.5, w: 1 / 3, h: 0.5 },
      { x: 1 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
      { x: 2 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
    ],
  },
  {
    id: 'left-right',
    name: '1+2',
    cells: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: 'top-bottom',
    name: '2+1',
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
  },
  {
    id: '5-grid',
    name: '5 Grid',
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 1 / 3, h: 0.5 },
      { x: 1 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
      { x: 2 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
    ],
  },
  {
    id: '5-focus',
    name: '5 Focus',
    cells: [
      { x: 0, y: 0, w: 0.6, h: 1 },
      { x: 0.6, y: 0, w: 0.4, h: 0.25 },
      { x: 0.6, y: 0.25, w: 0.4, h: 0.25 },
      { x: 0.6, y: 0.5, w: 0.4, h: 0.25 },
      { x: 0.6, y: 0.75, w: 0.4, h: 0.25 },
    ],
  },
  {
    id: '6-mosaic',
    name: '6 Mosaic',
    cells: [
      { x: 0, y: 0, w: 0.5, h: 1 / 3 },
      { x: 0.5, y: 0, w: 0.5, h: 1 / 3 },
      { x: 0, y: 1 / 3, w: 0.5, h: 1 / 3 },
      { x: 0.5, y: 1 / 3, w: 0.5, h: 1 / 3 },
      { x: 0, y: 2 / 3, w: 0.5, h: 1 / 3 },
      { x: 0.5, y: 2 / 3, w: 0.5, h: 1 / 3 },
    ],
  },
  {
    id: '3-hero',
    name: '3 Hero',
    cells: [
      { x: 0, y: 0, w: 1, h: 0.6 },
      { x: 0, y: 0.6, w: 0.5, h: 0.4 },
      { x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
    ],
  },
  {
    id: '4-cinema',
    name: '4 Cinema',
    cells: [
      { x: 0, y: 0, w: 0.25, h: 1 },
      { x: 0.25, y: 0, w: 0.25, h: 1 },
      { x: 0.5, y: 0, w: 0.25, h: 1 },
      { x: 0.75, y: 0, w: 0.25, h: 1 },
    ],
  },
  {
    id: 'diagonal-2',
    name: 'Top Heavy',
    cells: [
      { x: 0, y: 0, w: 1, h: 0.65 },
      { x: 0, y: 0.65, w: 1, h: 0.35 },
    ],
  },
  {
    id: '9-grid',
    name: '9 Grid',
    cells: [
      { x: 0, y: 0, w: 1 / 3, h: 1 / 3 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 / 3 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 / 3 },
      { x: 0, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 1 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 2 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 0, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 1 / 3, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 2 / 3, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
    ],
  },
  {
    id: '3-vert',
    name: '3 Strips',
    cells: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  {
    id: '4-quad-focus',
    name: '4 Quad Focus',
    cells: [
      { x: 0, y: 0, w: 2 / 3, h: 2 / 3 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 / 3 },
      { x: 2 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 0, y: 2 / 3, w: 2 / 3, h: 1 / 3 },
    ],
  },
  {
    id: '2-unequal',
    name: '2 Unequal',
    cells: [
      { x: 0, y: 0, w: 0.65, h: 1 },
      { x: 0.65, y: 0, w: 0.35, h: 1 },
    ],
  },
]

const OUTPUT_SIZES: OutputSize[] = [
  { id: 'sq', label: '1:1 (1080)', w: 1080, h: 1080 },
  { id: 'portrait', label: '4:5 (1080×1350)', w: 1080, h: 1350 },
  { id: 'story', label: '9:16 (1080×1920)', w: 1080, h: 1920 },
  { id: 'landscape', label: '16:9 (1920×1080)', w: 1920, h: 1080 },
]

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, radius: number): void {
  ctx.save()
  roundRect(ctx, x, y, w, h, radius)
  ctx.clip()

  const imgRatio = img.width / img.height
  const cellRatio = w / h
  let sx: number, sy: number, sw: number, sh: number
  if (imgRatio > cellRatio) {
    sh = img.height
    sw = sh * cellRatio
    sx = (img.width - sw) / 2
    sy = 0
  } else {
    sw = img.width
    sh = sw / cellRatio
    sx = 0
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
  ctx.restore()
}

function computeCellPixels(cell: CellRect, canvasW: number, canvasH: number, gap: number): { px: number; py: number; pw: number; ph: number } {
  const usableW = canvasW - gap * 2
  const usableH = canvasH - gap * 2
  const px = gap + cell.x * usableW + (cell.x > 0 ? gap * 0.5 : 0)
  const py = gap + cell.y * usableH + (cell.y > 0 ? gap * 0.5 : 0)
  const pw = cell.w * usableW - (cell.x > 0 ? gap * 0.5 : 0) - (cell.x + cell.w < 1 ? gap * 0.5 : 0)
  const ph = cell.h * usableH - (cell.y > 0 ? gap * 0.5 : 0) - (cell.y + cell.h < 1 ? gap * 0.5 : 0)
  return { px, py, pw, ph }
}

interface CollageBuilderProps {
  onComplete: (dataUrl: string) => void
  onBack: () => void
}

export function CollageBuilder({ onComplete, onBack }: CollageBuilderProps): React.JSX.Element {
  const [layout, setLayout] = useState<CollageLayout>(COLLAGE_LAYOUTS[3])
  const [images, setImages] = useState<Record<number, string>>({})
  const [gap, setGap] = useState<number>(4)
  const [radius, setRadius] = useState<number>(8)
  const [bgColor, setBgColor] = useState<string>('#000000')
  const [outputSize, setOutputSize] = useState<OutputSize>(OUTPUT_SIZES[0])
  const [creating, setCreating] = useState<boolean>(false)

  const handleCellClick = useCallback((cellIndex: number): void => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        setImages((prev) => ({ ...prev, [cellIndex]: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }, [])

  const removeImage = useCallback((cellIndex: number): void => {
    setImages((prev) => {
      const next = { ...prev }
      delete next[cellIndex]
      return next
    })
  }, [])

  const filledCount = Object.keys(images).filter((k) => Number(k) < layout.cells.length).length
  const canCreate = filledCount > 0

  const createCollage = useCallback(async (): Promise<void> => {
    setCreating(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = outputSize.w
      canvas.height = outputSize.h
      const ctx = canvas.getContext('2d')!

      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < layout.cells.length; i++) {
        if (!images[i]) continue
        const { px, py, pw, ph } = computeCellPixels(layout.cells[i], canvas.width, canvas.height, gap)
        const img = await loadImage(images[i])
        drawImageCover(ctx, img, px, py, pw, ph, radius)
      }

      onComplete(canvas.toDataURL('image/png'))
    } finally {
      setCreating(false)
    }
  }, [outputSize, bgColor, layout, images, gap, radius, onComplete])

  const renderCell = useCallback(
    (index: number): ReactNode => {
      if (images[index]) {
        return (
          <div className="relative w-full h-full group/cell">
            <img
              src={images[index]}
              alt=""
              className="w-full h-full object-cover"
              style={{ borderRadius: `${radius}px` }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeImage(index)
              }}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity hover:bg-red-500/90"
              title="Remove image"
            >
              ×
            </button>
          </div>
        )
      }
      return (
        <div
          className="w-full h-full border-2 border-dashed border-zinc-600 flex items-center justify-center text-zinc-500 text-2xl hover:border-indigo-500 hover:text-indigo-400 transition-colors"
          style={{ borderRadius: `${radius}px` }}
        >
          +
        </div>
      )
    },
    [images, radius, removeImage],
  )

  const renderPreviewCells = (): ReactNode => {
    const g = gap
    return (
      <div
        className="relative w-full h-full"
        style={{ backgroundColor: bgColor }}
      >
        {layout.cells.map((cell, i) => {
          const gapBefore = (x: number) => (x > 0 ? g / 2 : g)
          const gapAfter = (x: number, w: number) => (x + w < 1 ? g / 2 : g)

          const leftPx = gapBefore(cell.x)
          const topPx = gapBefore(cell.y)
          const rightPx = gapAfter(cell.x, cell.w)
          const bottomPx = gapAfter(cell.y, cell.h)

          return (
            <div
              key={i}
              className="absolute cursor-pointer overflow-hidden"
              style={{
                left: `calc(${cell.x * 100}% + ${leftPx}px)`,
                top: `calc(${cell.y * 100}% + ${topPx}px)`,
                width: `calc(${cell.w * 100}% - ${leftPx + rightPx}px)`,
                height: `calc(${cell.h * 100}% - ${topPx + bottomPx}px)`,
              }}
              onClick={() => handleCellClick(i)}
            >
              {renderCell(i)}
            </div>
          )
        })}
      </div>
    )
  }

  const renderLayoutThumbnail = (l: CollageLayout): ReactNode => {
    const isActive = layout.id === l.id
    return (
      <div
        className={`relative h-10 rounded border-2 transition-colors overflow-hidden ${isActive ? 'border-indigo-500' : 'border-zinc-600 hover:border-zinc-500'}`}
      >
        {l.cells.map((cell, i) => (
          <div
            key={i}
            className="absolute bg-zinc-500 rounded-sm"
            style={{
              left: `${cell.x * 100 + 4}%`,
              top: `${cell.y * 100 + 4}%`,
              width: `${cell.w * 100 - 8}%`,
              height: `${cell.h * 100 - 8}%`,
            }}
          />
        ))}
      </div>
    )
  }

  const aspectRatio = outputSize.w / outputSize.h

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-zinc-400 hover:text-indigo-400 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-lg font-semibold text-zinc-100">Collage Builder</h1>
        </div>
        <button
          onClick={createCollage}
          disabled={!canCreate || creating}
          className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-semibold rounded-lg text-sm transition-colors"
        >
          {creating ? 'Creating…' : 'Create Collage'}
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Preview area */}
        <div className="flex-1 flex items-center justify-center p-6 min-h-0">
          <div
            className="w-full max-h-full rounded-lg overflow-hidden shadow-2xl"
            style={{
              aspectRatio,
              maxWidth: aspectRatio >= 1 ? '680px' : `${Math.round(480 * aspectRatio)}px`,
            }}
          >
            {renderPreviewCells()}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-zinc-800 p-4 overflow-y-auto shrink-0 space-y-6">
          {/* Layout selector */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Layout
            </h3>
            <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
              {COLLAGE_LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setLayout(l)
                    setImages({})
                  }}
                  className="cursor-pointer"
                  title={l.name}
                >
                  {renderLayoutThumbnail(l)}
                  <span className="text-[10px] text-zinc-500 mt-0.5 block text-center truncate">
                    {l.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Output size */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Output Size
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {OUTPUT_SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setOutputSize(s)}
                  className={`px-2 py-1.5 rounded text-xs transition-colors ${
                    outputSize.id === s.id
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gap */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Gap</h3>
              <span className="text-xs text-zinc-500">{gap}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              value={gap}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setGap(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Border Radius */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Radius
              </h3>
              <span className="text-xs text-zinc-500">{radius}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              value={radius}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setRadius(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Background color */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Background
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-zinc-700"
              />
              <span className="text-xs text-zinc-500 font-mono">{bgColor}</span>
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-zinc-600 leading-relaxed">
            Click each cell to add a photo. Images are cropped to fill. Collage is exported at{' '}
            {outputSize.w}×{outputSize.h}px.
          </div>
        </aside>
      </div>
    </div>
  )
}
