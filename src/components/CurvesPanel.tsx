import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { buildCurveLUT } from '../utils/curvesUtils'
import type { CurvePoints } from '../types'

interface ChannelDef {
  id: keyof CurvePoints
  label: string
  color: string
}

const CHANNELS: ChannelDef[] = [
  { id: 'rgb', label: 'RGB', color: '#ffffff' },
  { id: 'red', label: 'R', color: '#ef4444' },
  { id: 'green', label: 'G', color: '#22c55e' },
  { id: 'blue', label: 'B', color: '#3b82f6' },
]

const CANVAS_SIZE = 200
const POINT_RADIUS = 4
const HIT_RADIUS = 10
const DEFAULT_POINTS: [number, number][] = [[0, 0], [1, 1]]

function drawCurveCanvas(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  channelColor: string,
): void {
  const w = CANVAS_SIZE
  const h = CANVAS_SIZE

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = '#2a2a2a'
  ctx.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    const pos = (i / 4) * w
    ctx.beginPath()
    ctx.moveTo(pos, 0)
    ctx.lineTo(pos, h)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, pos)
    ctx.lineTo(w, pos)
    ctx.stroke()
  }

  ctx.strokeStyle = '#3f3f46'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.lineTo(w, 0)
  ctx.stroke()

  const lut = buildCurveLUT(points)
  ctx.strokeStyle = channelColor
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * w
    const y = h - (lut[i] / 255) * h
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  const sorted = [...points].sort((a, b) => a[0] - b[0])
  sorted.forEach(([px, py]) => {
    const cx = px * w
    const cy = h - py * h
    ctx.beginPath()
    ctx.arc(cx, cy, POINT_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = channelColor
    ctx.fill()
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1.5
    ctx.stroke()
  })
}

interface CurvesPanelProps {
  curves: CurvePoints | undefined
  onChange: (channel: keyof CurvePoints, points: [number, number][]) => void
}

export function CurvesPanel({ curves, onChange }: CurvesPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeChannel, setActiveChannel] = useState<keyof CurvePoints>('rgb')
  const [draggingIdx, setDraggingIdx] = useState<number>(-1)

  const points: [number, number][] = useMemo(
    () => curves?.[activeChannel] ?? DEFAULT_POINTS,
    [curves, activeChannel],
  )
  const channelColor: string = CHANNELS.find((c) => c.id === activeChannel)?.color ?? '#ffffff'

  const redraw = useCallback((): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawCurveCanvas(ctx, points, channelColor)
  }, [points, channelColor])

  useEffect(() => {
    redraw()
  }, [redraw])

  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_SIZE / rect.width
    const scaleY = CANVAS_SIZE / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const findPointIndex = useCallback(
    (pos: { x: number; y: number }): number => {
      const sorted = [...points].sort((a, b) => a[0] - b[0])
      for (let i = 0; i < sorted.length; i++) {
        const px = sorted[i][0] * CANVAS_SIZE
        const py = (1 - sorted[i][1]) * CANVAS_SIZE
        const dx = pos.x - px
        const dy = pos.y - py
        if (Math.sqrt(dx * dx + dy * dy) < HIT_RADIUS) return i
      }
      return -1
    },
    [points],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): void => {
      e.preventDefault()
      const pos = getCanvasPos(e)
      if (!pos) return
      const idx = findPointIndex(pos)
      if (idx >= 0) {
        setDraggingIdx(idx)
      } else {
        const nx = Math.max(0, Math.min(1, pos.x / CANVAS_SIZE))
        const ny = Math.max(0, Math.min(1, 1 - pos.y / CANVAS_SIZE))
        const newPoints: [number, number][] = [...points, [nx, ny]].sort((a, b) => a[0] - b[0]) as [number, number][]
        onChange(activeChannel, newPoints)
        const addedIdx = newPoints.findIndex((p) => p[0] === nx && p[1] === ny)
        setDraggingIdx(addedIdx)
      }
    },
    [getCanvasPos, findPointIndex, points, onChange, activeChannel],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent): void => {
      if (draggingIdx < 0) return
      const pos = getCanvasPos(e)
      if (!pos) return
      const sorted = [...points].sort((a, b) => a[0] - b[0])
      const nx = Math.max(0, Math.min(1, pos.x / CANVAS_SIZE))
      const ny = Math.max(0, Math.min(1, 1 - pos.y / CANVAS_SIZE))
      const updated: [number, number][] = sorted.map((p, i) => (i === draggingIdx ? [nx, ny] : p)) as [number, number][]
      onChange(activeChannel, updated.sort((a, b) => a[0] - b[0]))
    },
    [draggingIdx, getCanvasPos, points, onChange, activeChannel],
  )

  const handleMouseUp = useCallback((): void => {
    setDraggingIdx(-1)
  }, [])

  useEffect(() => {
    if (draggingIdx < 0) return
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingIdx, handleMouseMove, handleMouseUp])

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): void => {
      e.preventDefault()
      const pos = getCanvasPos(e)
      if (!pos) return
      const sorted = [...points].sort((a, b) => a[0] - b[0])
      const idx = findPointIndex(pos)
      if (idx > 0 && idx < sorted.length - 1) {
        onChange(
          activeChannel,
          sorted.filter((_, i) => i !== idx),
        )
      }
    },
    [getCanvasPos, findPointIndex, points, onChange, activeChannel],
  )

  return (
    <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Curves</h3>
      <div className="flex gap-1 mb-3">
        {CHANNELS.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setActiveChannel(ch.id)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeChannel === ch.id
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            style={activeChannel === ch.id ? { color: ch.color } : undefined}
          >
            {ch.label}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="w-full rounded-lg cursor-crosshair"
        style={{ aspectRatio: '1 / 1' }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      />
      {points.length > 2 && (
        <button
          onClick={() => onChange(activeChannel, [[0, 0], [1, 1]])}
          className="mt-3 w-full py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
        >
          Reset {CHANNELS.find((c) => c.id === activeChannel)?.label} Channel
        </button>
      )}
    </div>
  )
}
