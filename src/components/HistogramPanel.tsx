import { useRef, useEffect, useState, useCallback } from 'react'

type HistogramMode = 'rgb' | 'luma'

interface HistogramPanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

export function HistogramPanel({ canvasRef }: HistogramPanelProps) {
  const histCanvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<HistogramMode>('rgb')

  const draw = useCallback((): void => {
    const src = canvasRef?.current
    const hc = histCanvasRef.current
    if (!src || !hc) return

    const ctx = src.getContext('2d')
    if (!ctx) return
    const step = Math.max(1, Math.floor(src.width * src.height / 50000))
    let imgData: ImageData
    try {
      imgData = ctx.getImageData(0, 0, src.width, src.height)
    } catch { return }
    const d = imgData.data

    const rHist = new Uint32Array(256)
    const gHist = new Uint32Array(256)
    const bHist = new Uint32Array(256)
    const lHist = new Uint32Array(256)

    for (let i = 0; i < d.length; i += 4 * step) {
      const r = d[i], g = d[i + 1], b = d[i + 2]
      rHist[r]++
      gHist[g]++
      bHist[b]++
      const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      lHist[luma]++
    }

    const hctx = hc.getContext('2d')
    if (!hctx) return
    const W = hc.width, H = hc.height
    hctx.clearRect(0, 0, W, H)

    const drawChannel = (hist: Uint32Array, color: string): void => {
      const max = Math.max(...hist)
      if (max === 0) return
      hctx.fillStyle = color
      hctx.beginPath()
      hctx.moveTo(0, H)
      for (let x = 0; x < 256; x++) {
        const h = (hist[x] / max) * H
        hctx.lineTo(x * (W / 256), H - h)
      }
      hctx.lineTo(W, H)
      hctx.closePath()
      hctx.fill()
    }

    if (mode === 'rgb') {
      drawChannel(rHist, 'rgba(255, 60, 60, 0.4)')
      drawChannel(gHist, 'rgba(60, 255, 60, 0.4)')
      drawChannel(bHist, 'rgba(60, 100, 255, 0.4)')
    } else {
      drawChannel(lHist, 'rgba(200, 200, 200, 0.5)')
    }
  }, [canvasRef, mode])

  useEffect(() => {
    draw()
    const id = setInterval(draw, 500)
    return () => clearInterval(id)
  }, [draw])

  return (
    <div className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-zinc-400">Histogram</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setMode('rgb')}
            className={`px-2 py-0.5 text-[10px] rounded ${mode === 'rgb' ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}
          >
            RGB
          </button>
          <button
            onClick={() => setMode('luma')}
            className={`px-2 py-0.5 text-[10px] rounded ${mode === 'luma' ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}
          >
            Luma
          </button>
        </div>
      </div>
      <canvas
        ref={histCanvasRef}
        width={256}
        height={80}
        className="w-full h-20 rounded bg-zinc-950 border border-zinc-800"
      />
    </div>
  )
}
