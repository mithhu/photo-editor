import React, { useState, useRef, useCallback, useEffect } from 'react'
import { canvasToBlob, shareNative, supportsNativeShare } from '../utils/shareUtils'

type Layout = 'side-by-side' | 'top-bottom' | 'split-diagonal' | 'swipe-line'

interface BeforeAfterCardProps {
  originalSrc: string
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onClose: () => void
}

const WATERMARK_HEIGHT = 40
const WATERMARK_BG = 'rgba(0,0,0,0.75)'
const WATERMARK_TEXT = 'Edited with PhotosAI  ✦  photosai.vercel.app'
const LABEL_FONT = 'bold 18px system-ui, -apple-system, sans-serif'
const WATERMARK_FONT = '14px system-ui, -apple-system, sans-serif'
const GAP = 8

const LAYOUTS: { id: Layout; label: string; icon: React.ReactNode }[] = [
  {
    id: 'side-by-side',
    label: 'Side by Side',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    id: 'top-bottom',
    label: 'Top / Bottom',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  {
    id: 'split-diagonal',
    label: 'Diagonal',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="21" y1="3" x2="3" y2="21" />
      </svg>
    ),
  },
  {
    id: 'swipe-line',
    label: 'Swipe',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="12" y1="3" x2="12" y2="21" />
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
) {
  ctx.font = LABEL_FONT
  const metrics = ctx.measureText(text)
  const padX = 12
  const padY = 6
  const w = metrics.width + padX * 2
  const h = 28

  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y, w, h, 6)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(text, x, y + padY)
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
) {
  const barY = canvasHeight - WATERMARK_HEIGHT
  ctx.fillStyle = WATERMARK_BG
  ctx.fillRect(0, barY, canvasWidth, WATERMARK_HEIGHT)

  const centerX = canvasWidth / 2
  const centerY = barY + WATERMARK_HEIGHT / 2

  ctx.font = WATERMARK_FONT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const textMetrics = ctx.measureText(WATERMARK_TEXT)
  const dotRadius = 4
  const dotOffset = textMetrics.width / 2 + 12

  ctx.fillStyle = '#9333ea'
  ctx.beginPath()
  ctx.arc(centerX - dotOffset, centerY, dotRadius, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.fillText(WATERMARK_TEXT, centerX, centerY)
}

function generateSideBySide(
  ctx: CanvasRenderingContext2D,
  origImg: HTMLImageElement,
  editedImg: HTMLImageElement,
) {
  const imgW = Math.max(origImg.width, editedImg.width)
  const imgH = Math.max(origImg.height, editedImg.height)
  const totalW = imgW * 2 + GAP
  const totalH = imgH + WATERMARK_HEIGHT

  ctx.canvas.width = Math.max(1200, totalW)
  ctx.canvas.height = totalH

  const scale = ctx.canvas.width / totalW
  const scaledW = imgW * scale
  const scaledH = imgH * scale
  ctx.canvas.height = scaledH + WATERMARK_HEIGHT

  ctx.fillStyle = '#18181b'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  const gapScaled = GAP * scale
  ctx.drawImage(origImg, 0, 0, scaledW, scaledH)
  ctx.drawImage(editedImg, scaledW + gapScaled, 0, scaledW, scaledH)

  drawLabel(ctx, 'BEFORE', scaledW / 2, 16)
  drawLabel(ctx, 'AFTER', scaledW + gapScaled + scaledW / 2, 16)
  drawWatermark(ctx, ctx.canvas.width, ctx.canvas.height)
}

function generateTopBottom(
  ctx: CanvasRenderingContext2D,
  origImg: HTMLImageElement,
  editedImg: HTMLImageElement,
) {
  const imgW = Math.max(origImg.width, editedImg.width)
  const imgH = Math.max(origImg.height, editedImg.height)
  const totalW = imgW
  const totalH = imgH * 2 + GAP + WATERMARK_HEIGHT

  const targetW = Math.max(1200, totalW)
  const scale = targetW / totalW
  const scaledW = imgW * scale
  const scaledH = imgH * scale
  const gapScaled = GAP * scale

  ctx.canvas.width = targetW
  ctx.canvas.height = scaledH * 2 + gapScaled + WATERMARK_HEIGHT

  ctx.fillStyle = '#18181b'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  ctx.drawImage(origImg, 0, 0, scaledW, scaledH)
  ctx.drawImage(editedImg, 0, scaledH + gapScaled, scaledW, scaledH)

  drawLabel(ctx, 'BEFORE', scaledW / 2, 16)
  drawLabel(ctx, 'AFTER', scaledW / 2, scaledH + gapScaled + 16)
  drawWatermark(ctx, ctx.canvas.width, ctx.canvas.height)
}

function generateDiagonal(
  ctx: CanvasRenderingContext2D,
  origImg: HTMLImageElement,
  editedImg: HTMLImageElement,
) {
  const w = editedImg.width
  const h = editedImg.height + WATERMARK_HEIGHT

  ctx.canvas.width = w
  ctx.canvas.height = h

  ctx.drawImage(editedImg, 0, 0)

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(w, 0)
  ctx.lineTo(0, editedImg.height)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(origImg, 0, 0, w, editedImg.height)
  ctx.restore()

  ctx.strokeStyle = 'rgba(255,255,255,0.8)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(w, 0)
  ctx.lineTo(0, editedImg.height)
  ctx.stroke()

  drawLabel(ctx, 'BEFORE', w * 0.25, editedImg.height * 0.15)
  drawLabel(ctx, 'AFTER', w * 0.75, editedImg.height * 0.75)
  drawWatermark(ctx, w, h)
}

function generateSwipeLine(
  ctx: CanvasRenderingContext2D,
  origImg: HTMLImageElement,
  editedImg: HTMLImageElement,
) {
  const w = editedImg.width
  const imgH = editedImg.height
  const h = imgH + WATERMARK_HEIGHT
  const splitX = Math.round(w / 2)

  ctx.canvas.width = w
  ctx.canvas.height = h

  ctx.drawImage(editedImg, 0, 0)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, splitX, imgH)
  ctx.clip()
  ctx.drawImage(origImg, 0, 0, w, imgH)
  ctx.restore()

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(splitX, 0)
  ctx.lineTo(splitX, imgH)
  ctx.stroke()

  const handleY = imgH / 2
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(splitX, handleY, 16, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#3f3f46'
  ctx.beginPath()
  ctx.moveTo(splitX - 6, handleY - 5)
  ctx.lineTo(splitX - 2, handleY)
  ctx.lineTo(splitX - 6, handleY + 5)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(splitX + 6, handleY - 5)
  ctx.lineTo(splitX + 2, handleY)
  ctx.lineTo(splitX + 6, handleY + 5)
  ctx.closePath()
  ctx.fill()

  drawLabel(ctx, 'BEFORE', splitX / 2, 16)
  drawLabel(ctx, 'AFTER', splitX + (w - splitX) / 2, 16)
  drawWatermark(ctx, w, h)
}

export function BeforeAfterCard({ originalSrc, canvasRef, onClose }: BeforeAfterCardProps) {
  const [layout, setLayout] = useState<Layout>('side-by-side')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null)
  const hasNativeShare = supportsNativeShare()

  const generateCard = useCallback(async (targetLayout: Layout): Promise<HTMLCanvasElement | null> => {
    const canvas = hiddenCanvasRef.current
    if (!canvas || !canvasRef.current) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const editedDataUrl = canvasRef.current.toDataURL('image/png')
    const [origImg, editedImg] = await Promise.all([
      loadImage(originalSrc),
      loadImage(editedDataUrl),
    ])

    switch (targetLayout) {
      case 'side-by-side':
        generateSideBySide(ctx, origImg, editedImg)
        break
      case 'top-bottom':
        generateTopBottom(ctx, origImg, editedImg)
        break
      case 'split-diagonal':
        generateDiagonal(ctx, origImg, editedImg)
        break
      case 'swipe-line':
        generateSwipeLine(ctx, origImg, editedImg)
        break
    }

    return canvas
  }, [canvasRef, originalSrc])

  useEffect(() => {
    let cancelled = false
    setPreviewUrl(null)

    generateCard(layout).then((canvas) => {
      if (cancelled || !canvas) return
      setPreviewUrl(canvas.toDataURL('image/png'))
    })

    return () => { cancelled = true }
  }, [layout, generateCard])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleDownload = useCallback(async () => {
    try {
      setError(null)
      const canvas = await generateCard(layout)
      if (!canvas) return
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `photosai-before-after-${layout}.png`
      a.click()
      setStatus('Downloaded!')
      setTimeout(() => setStatus(null), 2000)
    } catch {
      setError('Download failed')
    }
  }, [layout, generateCard])

  const handleCopy = useCallback(async () => {
    try {
      setError(null)
      const canvas = await generateCard(layout)
      if (!canvas) return
      const blob = await canvasToBlob(canvas)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setStatus('Copied!')
      setTimeout(() => setStatus(null), 2000)
    } catch {
      setError('Could not copy image')
    }
  }, [layout, generateCard])

  const handleShare = useCallback(async () => {
    try {
      setError(null)
      const canvas = await generateCard(layout)
      if (!canvas) return
      await shareNative(canvas)
      onClose()
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name !== 'AbortError') {
        setError('Sharing failed')
      }
    }
  }, [layout, generateCard, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-lg font-semibold text-zinc-100">Before / After Card</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Layout selector */}
        <div className="px-5 pb-3 flex gap-2 shrink-0 flex-wrap">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayout(l.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                layout === l.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {l.icon}
              <span className="hidden sm:inline">{l.label}</span>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm shrink-0">
            {error}
          </div>
        )}

        {/* Preview */}
        <div className="px-5 pb-4 flex-1 min-h-0 flex items-center justify-center overflow-auto">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`Before/After ${layout}`}
              className="max-w-full max-h-[50vh] rounded-lg border border-zinc-700/50 object-contain"
              draggable={false}
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
              Generating preview…
            </div>
          )}
        </div>

        {/* Status toast */}
        {status && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center shrink-0">
            {status}
          </div>
        )}

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3 shrink-0">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy
          </button>

          {hasNativeShare && (
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share
            </button>
          )}
        </div>
      </div>

      {/* Hidden canvas for generation */}
      <canvas ref={hiddenCanvasRef} className="hidden" />
    </div>
  )
}
