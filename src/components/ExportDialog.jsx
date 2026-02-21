import { useState, useEffect, useCallback, useRef } from 'react'

const FORMATS = [
  { id: 'png', label: 'PNG', mimeType: 'image/png', ext: 'png', hasQuality: false },
  { id: 'jpeg', label: 'JPEG', mimeType: 'image/jpeg', ext: 'jpg', hasQuality: true },
  { id: 'webp', label: 'WEBP', mimeType: 'image/webp', ext: 'webp', hasQuality: true },
]

const DEFAULT_QUALITY = 92

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function computeSize(canvas, fmt, quality) {
  if (!canvas || !fmt) return null
  try {
    const dataUrl = fmt.hasQuality
      ? canvas.toDataURL(fmt.mimeType, quality / 100)
      : canvas.toDataURL(fmt.mimeType)
    const base64Length = dataUrl.length - dataUrl.indexOf(',') - 1
    return Math.round((base64Length * 3) / 4)
  } catch {
    return null
  }
}

export function ExportDialog({ canvasRef, onClose }) {
  const [format, setFormat] = useState('png')
  const [quality, setQuality] = useState(DEFAULT_QUALITY)
  const [estimatedSize, setEstimatedSize] = useState(null)
  const [resize, setResize] = useState(false)
  const [resizeW, setResizeW] = useState(0)
  const [resizeH, setResizeH] = useState(0)
  const [lockRatio, setLockRatio] = useState(true)
  const aspectRatioRef = useRef(1)
  const initRef = useRef(false)

  const currentFormat = FORMATS.find((f) => f.id === format)

  const handleEscape = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [handleEscape])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    const canvas = canvasRef.current
    const fmt = FORMATS.find((f) => f.id === 'png')
    setEstimatedSize(computeSize(canvas, fmt, DEFAULT_QUALITY))
    if (canvas) {
      setResizeW(canvas.width)
      setResizeH(canvas.height)
      aspectRatioRef.current = canvas.width / canvas.height
    }
  }, [canvasRef])

  const handleFormatChange = (id) => {
    setFormat(id)
    const fmt = FORMATS.find((f) => f.id === id)
    setEstimatedSize(computeSize(canvasRef.current, fmt, quality))
  }

  const handleQualityChange = (val) => {
    setQuality(val)
    setEstimatedSize(computeSize(canvasRef.current, currentFormat, val))
  }

  const handleWidthChange = (w) => {
    const clamped = Math.max(1, Math.round(w))
    setResizeW(clamped)
    if (lockRatio) setResizeH(Math.max(1, Math.round(clamped / aspectRatioRef.current)))
  }

  const handleHeightChange = (h) => {
    const clamped = Math.max(1, Math.round(h))
    setResizeH(clamped)
    if (lockRatio) setResizeW(Math.max(1, Math.round(clamped * aspectRatioRef.current)))
  }

  const getExportCanvas = () => {
    const source = canvasRef.current
    if (!source) return null
    if (!resize) return source
    const tmp = document.createElement('canvas')
    tmp.width = resizeW
    tmp.height = resizeH
    const ctx = tmp.getContext('2d')
    ctx.drawImage(source, 0, 0, resizeW, resizeH)
    return tmp
  }

  const handleDownload = () => {
    if (!canvasRef?.current || !currentFormat) return
    const exportCanvas = getExportCanvas()
    if (!exportCanvas) return
    const { mimeType, ext } = currentFormat
    const dataUrl = currentFormat.hasQuality
      ? exportCanvas.toDataURL(mimeType, quality / 100)
      : exportCanvas.toDataURL(mimeType)
    const link = document.createElement('a')
    link.download = `edited-${Date.now()}.${ext}`
    link.href = dataUrl
    link.click()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-zinc-100">Export</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div>
            <span className="text-sm text-zinc-400 block mb-2">Format</span>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFormatChange(f.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    format === f.id
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={resize}
                onChange={(e) => setResize(e.target.checked)}
                className="accent-amber-500 w-4 h-4 rounded"
              />
              <span className="text-sm text-zinc-300">Resize</span>
            </label>
            {resize && (
              <div className="mt-3 flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 block mb-1">Width</label>
                  <input
                    type="number"
                    min={1}
                    value={resizeW}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 px-2 py-1.5 rounded-lg text-sm text-zinc-200 tabular-nums"
                  />
                </div>
                <button
                  onClick={() => setLockRatio((v) => !v)}
                  className={`mb-0.5 p-1.5 rounded-lg text-sm transition-colors ${
                    lockRatio ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-500'
                  }`}
                  title={lockRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                >
                  {lockRatio ? '🔗' : '🔓'}
                </button>
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 block mb-1">Height</label>
                  <input
                    type="number"
                    min={1}
                    value={resizeH}
                    onChange={(e) => handleHeightChange(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 px-2 py-1.5 rounded-lg text-sm text-zinc-200 tabular-nums"
                  />
                </div>
              </div>
            )}
          </div>

          {currentFormat?.hasQuality && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">Quality</span>
                <span className="text-zinc-300 tabular-nums">{quality}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={quality}
                onChange={(e) => handleQualityChange(Number(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          )}

          {estimatedSize !== null && (
            <div className="text-sm text-zinc-400">
              Estimated size: <span className="text-zinc-200 font-medium">{formatFileSize(estimatedSize)}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleDownload}
              className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium transition-colors"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
