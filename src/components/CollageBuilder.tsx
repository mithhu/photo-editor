import { useState, useCallback, type ReactNode, type ChangeEvent } from 'react'

interface CollageLayout {
  id: string
  name: string
  cols: number
  rows: number
  cells: number
  custom?: boolean
}

interface OutputSize {
  id: string
  label: string
  w: number
  h: number
}

const COLLAGE_LAYOUTS: CollageLayout[] = [
  { id: 'grid-2', name: '2 Photos', cols: 2, rows: 1, cells: 2 },
  { id: 'grid-3h', name: '3 Horizontal', cols: 3, rows: 1, cells: 3 },
  { id: 'grid-3v', name: '3 Vertical', cols: 1, rows: 3, cells: 3 },
  { id: 'grid-4', name: '4 Grid', cols: 2, rows: 2, cells: 4 },
  { id: 'grid-6', name: '6 Grid', cols: 3, rows: 2, cells: 6 },
  { id: 'left-right', name: '1+2', cols: 2, rows: 2, custom: true, cells: 3 },
  { id: 'top-bottom', name: '2+1', cols: 2, rows: 2, custom: true, cells: 3 },
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

async function drawCustomLayout(ctx: CanvasRenderingContext2D, layoutId: string, images: Record<number, string>, canvasW: number, canvasH: number, gap: number, radius: number): Promise<void> {
  if (layoutId === 'left-right') {
    const leftW = (canvasW - gap * 3) * 0.5
    const rightW = (canvasW - gap * 3) * 0.5
    const halfH = (canvasH - gap * 3) / 2

    if (images[0]) {
      const img = await loadImage(images[0])
      drawImageCover(ctx, img, gap, gap, leftW, canvasH - gap * 2, radius)
    }
    if (images[1]) {
      const img = await loadImage(images[1])
      drawImageCover(ctx, img, leftW + gap * 2, gap, rightW, halfH, radius)
    }
    if (images[2]) {
      const img = await loadImage(images[2])
      drawImageCover(ctx, img, leftW + gap * 2, halfH + gap * 2, rightW, halfH, radius)
    }
  } else if (layoutId === 'top-bottom') {
    const topH = (canvasH - gap * 3) * 0.5
    const bottomH = (canvasH - gap * 3) * 0.5
    const halfW = (canvasW - gap * 3) / 2

    if (images[0]) {
      const img = await loadImage(images[0])
      drawImageCover(ctx, img, gap, gap, halfW, topH, radius)
    }
    if (images[1]) {
      const img = await loadImage(images[1])
      drawImageCover(ctx, img, halfW + gap * 2, gap, halfW, topH, radius)
    }
    if (images[2]) {
      const img = await loadImage(images[2])
      drawImageCover(ctx, img, gap, topH + gap * 2, canvasW - gap * 2, bottomH, radius)
    }
  }
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

  const filledCount = Object.keys(images).filter((k) => Number(k) < layout.cells).length
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

      const { cols, rows, cells, custom, id } = layout

      if (custom) {
        await drawCustomLayout(ctx, id, images, canvas.width, canvas.height, gap, radius)
      } else {
        const cellW = (canvas.width - gap * (cols + 1)) / cols
        const cellH = (canvas.height - gap * (rows + 1)) / rows

        for (let i = 0; i < cells; i++) {
          const col = i % cols
          const row = Math.floor(i / cols)
          const x = gap + col * (cellW + gap)
          const y = gap + row * (cellH + gap)

          if (images[i]) {
            const img = await loadImage(images[i])
            drawImageCover(ctx, img, x, y, cellW, cellH, radius)
          }
        }
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
          <img
            src={images[index]}
            alt=""
            className="w-full h-full object-cover"
            style={{ borderRadius: `${radius}px` }}
          />
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
    [images, radius],
  )

  const renderPreviewCells = (): ReactNode => {
    const { cols, cells: count, custom, id } = layout

    if (custom) {
      if (id === 'left-right') {
        return (
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: `${gap}px`,
              backgroundColor: bgColor,
              padding: `${gap}px`,
            }}
          >
            <div
              className="row-span-2 cursor-pointer overflow-hidden"
              onClick={() => handleCellClick(0)}
            >
              {renderCell(0)}
            </div>
            <div className="cursor-pointer overflow-hidden" onClick={() => handleCellClick(1)}>
              {renderCell(1)}
            </div>
            <div className="cursor-pointer overflow-hidden" onClick={() => handleCellClick(2)}>
              {renderCell(2)}
            </div>
          </div>
        )
      }
      if (id === 'top-bottom') {
        return (
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: `${gap}px`,
              backgroundColor: bgColor,
              padding: `${gap}px`,
            }}
          >
            <div className="cursor-pointer overflow-hidden" onClick={() => handleCellClick(0)}>
              {renderCell(0)}
            </div>
            <div className="cursor-pointer overflow-hidden" onClick={() => handleCellClick(1)}>
              {renderCell(1)}
            </div>
            <div
              className="col-span-2 cursor-pointer overflow-hidden"
              onClick={() => handleCellClick(2)}
            >
              {renderCell(2)}
            </div>
          </div>
        )
      }
    }

    const cells: ReactNode[] = []
    for (let i = 0; i < count; i++) {
      cells.push(
        <div
          key={i}
          className="cursor-pointer overflow-hidden"
          onClick={() => handleCellClick(i)}
        >
          {renderCell(i)}
        </div>,
      )
    }
    return (
      <div
        className="grid h-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: `${gap}px`,
          backgroundColor: bgColor,
          padding: `${gap}px`,
        }}
      >
        {cells}
      </div>
    )
  }

  const renderLayoutThumbnail = (l: CollageLayout): ReactNode => {
    const isActive = layout.id === l.id
    if (l.custom) {
      if (l.id === 'left-right') {
        return (
          <div
            className={`grid h-10 rounded border-2 transition-colors ${isActive ? 'border-indigo-500' : 'border-zinc-600 hover:border-zinc-500'}`}
            style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '2px', padding: '2px' }}
          >
            <div className="row-span-2 bg-zinc-500 rounded-sm" />
            <div className="bg-zinc-500 rounded-sm" />
            <div className="bg-zinc-500 rounded-sm" />
          </div>
        )
      }
      return (
        <div
          className={`grid h-10 rounded border-2 transition-colors ${isActive ? 'border-indigo-500' : 'border-zinc-600 hover:border-zinc-500'}`}
          style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '2px', padding: '2px' }}
        >
          <div className="bg-zinc-500 rounded-sm" />
          <div className="bg-zinc-500 rounded-sm" />
          <div className="col-span-2 bg-zinc-500 rounded-sm" />
        </div>
      )
    }

    const cells: ReactNode[] = []
    for (let i = 0; i < l.cells; i++) {
      cells.push(<div key={i} className="bg-zinc-500 rounded-sm" />)
    }
    return (
      <div
        className={`grid h-10 rounded border-2 transition-colors ${isActive ? 'border-indigo-500' : 'border-zinc-600 hover:border-zinc-500'}`}
        style={{ gridTemplateColumns: `repeat(${l.cols}, 1fr)`, gap: '2px', padding: '2px' }}
      >
        {cells}
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
            <div className="grid grid-cols-4 gap-2">
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
                  <span className="text-[10px] text-zinc-500 mt-0.5 block text-center">
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
