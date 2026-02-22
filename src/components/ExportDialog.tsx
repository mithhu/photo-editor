import React, { useState, useEffect, useCallback, useRef } from 'react'

interface ExportPreset {
  id: string
  label: string
  w: number | null
  h: number | null
}

interface FormatOption {
  id: string
  label: string
  mimeType: string
  ext: string
  hasQuality: boolean
}

const EXPORT_PRESETS: ExportPreset[] = [
  { id: 'original', label: 'Original', w: null, h: null },
  { id: 'ig-square', label: 'IG Square', w: 1080, h: 1080 },
  { id: 'ig-story', label: 'IG Story', w: 1080, h: 1920 },
  { id: 'ig-post', label: 'IG Post', w: 1080, h: 1350 },
  { id: 'fb-cover', label: 'FB Cover', w: 820, h: 312 },
  { id: 'yt-thumb', label: 'YT Thumb', w: 1280, h: 720 },
  { id: 'twitter', label: 'Twitter', w: 1200, h: 675 },
]

const FORMATS: FormatOption[] = [
  { id: 'png', label: 'PNG', mimeType: 'image/png', ext: 'png', hasQuality: false },
  { id: 'jpeg', label: 'JPEG', mimeType: 'image/jpeg', ext: 'jpg', hasQuality: true },
  { id: 'webp', label: 'WEBP', mimeType: 'image/webp', ext: 'webp', hasQuality: true },
]

const DEFAULT_QUALITY = 92

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function computeSize(canvas: HTMLCanvasElement | null, fmt: FormatOption | undefined, quality: number): number | null {
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

interface ExportDialogProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onClose: () => void
}

export function ExportDialog({ canvasRef, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<string>('png')
  const [quality, setQuality] = useState<number>(DEFAULT_QUALITY)
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<string | null>('original')
  const [resize, setResize] = useState<boolean>(false)
  const [resizeW, setResizeW] = useState<number>(0)
  const [resizeH, setResizeH] = useState<number>(0)
  const [lockRatio, setLockRatio] = useState<boolean>(true)
  const [watermark, setWatermark] = useState<boolean>(false)
  const [watermarkText, setWatermarkText] = useState<string>('PhotosAI')
  const [watermarkPosition, setWatermarkPosition] = useState<string>('bottom-right')
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.3)
  const aspectRatioRef = useRef<number>(1)
  const initRef = useRef<boolean>(false)

  const currentFormat = FORMATS.find((f) => f.id === format)

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
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

  const handleFormatChange = (id: string): void => {
    setFormat(id)
    const fmt = FORMATS.find((f) => f.id === id)
    setEstimatedSize(computeSize(canvasRef.current, fmt, quality))
  }

  const handleQualityChange = (val: number): void => {
    setQuality(val)
    setEstimatedSize(computeSize(canvasRef.current, currentFormat, val))
  }

  const handlePresetSelect = (preset: ExportPreset): void => {
    setSelectedPreset(preset.id)
    if (preset.id === 'original') {
      setResize(false)
    } else {
      setResize(true)
      setResizeW(preset.w!)
      setResizeH(preset.h!)
      setLockRatio(false)
    }
  }

  const handleWidthChange = (w: number): void => {
    const clamped = Math.max(1, Math.round(w))
    setResizeW(clamped)
    setSelectedPreset(null)
    if (lockRatio) setResizeH(Math.max(1, Math.round(clamped / aspectRatioRef.current)))
  }

  const handleHeightChange = (h: number): void => {
    const clamped = Math.max(1, Math.round(h))
    setResizeH(clamped)
    setSelectedPreset(null)
    if (lockRatio) setResizeW(Math.max(1, Math.round(clamped * aspectRatioRef.current)))
  }

  const getExportCanvas = (): HTMLCanvasElement | null => {
    const source = canvasRef.current
    if (!source) return null
    if (!resize) return source
    const tmp = document.createElement('canvas')
    tmp.width = resizeW
    tmp.height = resizeH
    const ctx = tmp.getContext('2d')!
    ctx.drawImage(source, 0, 0, resizeW, resizeH)
    return tmp
  }

  const applyWatermark = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    if (!watermark || !watermarkText) return sourceCanvas
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = sourceCanvas.width
    tempCanvas.height = sourceCanvas.height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.drawImage(sourceCanvas, 0, 0)

    const fontSize = Math.max(14, tempCanvas.width * 0.03)
    tempCtx.font = `${fontSize}px sans-serif`
    tempCtx.fillStyle = `rgba(255,255,255,${watermarkOpacity})`
    tempCtx.textBaseline = 'bottom'

    const padding = fontSize
    let x: number, y: number
    if (watermarkPosition === 'bottom-right') {
      tempCtx.textAlign = 'right'
      x = tempCanvas.width - padding
      y = tempCanvas.height - padding
    } else if (watermarkPosition === 'bottom-left') {
      tempCtx.textAlign = 'left'
      x = padding
      y = tempCanvas.height - padding
    } else {
      tempCtx.textAlign = 'center'
      tempCtx.textBaseline = 'middle'
      x = tempCanvas.width / 2
      y = tempCanvas.height / 2
    }
    tempCtx.fillText(watermarkText, x, y)

    return tempCanvas
  }

  const handleDownload = (): void => {
    if (!canvasRef?.current || !currentFormat) return
    let exportCanvas = getExportCanvas()
    if (!exportCanvas) return
    exportCanvas = applyWatermark(exportCanvas)
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
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
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
            <span className="text-sm text-zinc-400 block mb-2">Presets</span>
            <div className="flex flex-wrap gap-1.5">
              {EXPORT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedPreset === preset.id
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm text-zinc-400 block mb-2">Format</span>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFormatChange(f.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    format === f.id
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const checked = e.target.checked
                  setResize(checked)
                  if (!checked) setSelectedPreset('original')
                }}
                className="accent-indigo-500 w-4 h-4 rounded"
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleWidthChange(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 px-2 py-1.5 rounded-lg text-sm text-zinc-200 tabular-nums"
                  />
                </div>
                <button
                  onClick={() => setLockRatio((v) => !v)}
                  className={`mb-0.5 p-1.5 rounded-lg text-sm transition-colors ${
                    lockRatio ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleHeightChange(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 px-2 py-1.5 rounded-lg text-sm text-zinc-200 tabular-nums"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={watermark}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWatermark(e.target.checked)}
                className="accent-indigo-500 w-4 h-4 rounded"
              />
              <span className="text-sm text-zinc-300">Add watermark</span>
            </label>
            {watermark && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Text</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWatermarkText(e.target.value)}
                    placeholder="PhotosAI"
                    className="w-full bg-zinc-800 border border-zinc-700 px-2 py-1.5 rounded-lg text-sm text-zinc-200"
                  />
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block mb-2">Position</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'bottom-right', label: 'Bottom Right' },
                      { id: 'bottom-left', label: 'Bottom Left' },
                      { id: 'center', label: 'Center' },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        onClick={() => setWatermarkPosition(pos.id)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                          watermarkPosition === pos.id
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-400">Opacity</span>
                    <span className="text-zinc-300 tabular-nums">
                      {Math.round(watermarkOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.8}
                    step={0.05}
                    value={watermarkOpacity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWatermarkOpacity(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleQualityChange(Number(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
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
              className="flex-1 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-zinc-900 font-medium transition-colors"
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
