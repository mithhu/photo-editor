import { useState, useCallback } from 'react'
import { FILTER_PRESETS } from '../constants'
import { applyPixelFilters } from '../utils/pixelFilters'

export function BatchProcessor({ editState, onBack }) {
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState([])
  const [downloading, setDownloading] = useState(false)

  const handleFileSelect = useCallback((e) => {
    const selected = Array.from(e.target.files)
    const imageFiles = selected.filter(f => f.type.startsWith('image/'))

    const loadPromises = imageFiles.map(f => new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ name: f.name, src: reader.result })
      reader.readAsDataURL(f)
    }))

    Promise.all(loadPromises).then(loaded => {
      setFiles(prev => [...prev, ...loaded])
    })
  }, [])

  const removeFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const processAll = useCallback(async () => {
    if (files.length === 0) return
    setProcessing(true)
    setResults([])
    setProgress({ current: 0, total: files.length })

    const processed = []

    for (let i = 0; i < files.length; i++) {
      setProgress({ current: i + 1, total: files.length })
      try {
        const result = await processImage(files[i].src, editState)
        processed.push({ name: files[i].name, dataUrl: result })
      } catch (err) {
        processed.push({ name: files[i].name, error: err.message })
      }
    }

    setResults(processed)
    setProcessing(false)
  }, [files, editState])

  const downloadAll = useCallback(() => {
    setDownloading(true)
    results.forEach((result, i) => {
      if (result.error) return
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = result.dataUrl
        a.download = `edited-${result.name}`
        a.click()
        if (i === results.length - 1) setDownloading(false)
      }, i * 200)
    })
  }, [results])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-950">
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            ← Back
          </button>
          <h1 className="text-xl font-bold text-amber-500">Edit Multiple Photos</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            {files.length} image{files.length !== 1 ? 's' : ''}
          </span>
          {results.length > 0 && (
            <button
              onClick={downloadAll}
              disabled={downloading}
              className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-400 text-zinc-900 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {downloading ? 'Downloading...' : 'Download All'}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-zinc-500 mb-4">Select images to apply current edits to all of them</p>
            <label className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-900 font-medium rounded-xl cursor-pointer transition-colors">
              Select Images
              <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
            </label>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <label className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg cursor-pointer transition-colors border border-zinc-700">
                + Add More
                <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
              </label>
              <button
                onClick={processAll}
                disabled={processing}
                className="px-4 py-2 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors disabled:opacity-50"
              >
                {processing
                  ? `Processing ${progress.current}/${progress.total}...`
                  : 'Apply Edits to All'}
              </button>
              <button
                onClick={() => { setFiles([]); setResults([]) }}
                className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-colors"
              >
                Clear All
              </button>
            </div>

            {processing && (
              <div className="mb-4">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {progress.current} of {progress.total} processed
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {files.map((file, i) => {
                const result = results[i]
                return (
                  <div key={`${file.name}-${i}`} className="relative group">
                    <img
                      src={result?.dataUrl || file.src}
                      alt={file.name}
                      className="w-full aspect-square object-cover rounded-lg border border-zinc-700"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 rounded-b-lg">
                      <p className="text-xs text-zinc-300 truncate">{file.name}</p>
                    </div>
                    {result?.error && (
                      <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center rounded-lg">
                        <p className="text-xs text-red-200">Failed</p>
                      </div>
                    )}
                    {result?.dataUrl && (
                      <div className="absolute top-1 right-1">
                        <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">✓</span>
                      </div>
                    )}
                    {!processing && !result && (
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function buildFilterOps(editState) {
  const { brightness = 1, contrast = 1, saturation = 1, exposure = 1, shadows = 1, highlights = 1 } = editState
  const ops = []

  const br = brightness * exposure * shadows
  if (br !== 1) ops.push({ type: 'brightness', value: br })
  const ct = contrast * (2 - highlights)
  if (ct !== 1) ops.push({ type: 'contrast', value: ct })
  if (saturation !== 1) ops.push({ type: 'saturate', value: saturation })

  const preset = FILTER_PRESETS.find(p => p.id === (editState.preset || 'none'))
  if (preset?.ops?.length) ops.push(...preset.ops)

  return ops
}

async function processImage(imageSrc, editState) {
  const img = new Image()
  img.src = imageSrc
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')

  ctx.drawImage(img, 0, 0)

  const filterOps = buildFilterOps(editState)
  const { warmth, tint, vibrance, clarity, dehaze } = editState
  const needsPixelPass =
    filterOps.length > 0 ||
    (warmth && warmth !== 0) ||
    (tint && tint !== 0) ||
    (vibrance && vibrance !== 0) ||
    (clarity && clarity !== 0) ||
    (dehaze && dehaze !== 0)

  if (needsPixelPass) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = imageData.data

    if (filterOps.length > 0) {
      applyPixelFilters(imageData, filterOps)
    }

    for (let i = 0; i < d.length; i += 4) {
      if (warmth) {
        d[i] = Math.min(255, Math.max(0, d[i] + warmth * 30))
        d[i + 2] = Math.min(255, Math.max(0, d[i + 2] - warmth * 30))
      }
      if (tint) {
        d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + tint * 30))
      }
      if (vibrance) {
        const max = Math.max(d[i], d[i + 1], d[i + 2]) / 255
        const min = Math.min(d[i], d[i + 1], d[i + 2]) / 255
        const sat = max > 0 ? (max - min) / max : 0
        const boost = (1 - sat) * vibrance * 0.5
        const avg = (d[i] + d[i + 1] + d[i + 2]) / 3
        d[i] = Math.min(255, Math.max(0, d[i] + (d[i] - avg) * boost))
        d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + (d[i + 1] - avg) * boost))
        d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + (d[i + 2] - avg) * boost))
      }
      if (clarity) {
        const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255
        const midWeight = 1 - Math.abs(lum - 0.5) * 2
        const cBoost = 1 + clarity * midWeight * 0.5
        d[i] = Math.min(255, Math.max(0, ((d[i] / 255 - 0.5) * cBoost + 0.5) * 255))
        d[i + 1] = Math.min(255, Math.max(0, ((d[i + 1] / 255 - 0.5) * cBoost + 0.5) * 255))
        d[i + 2] = Math.min(255, Math.max(0, ((d[i + 2] / 255 - 0.5) * cBoost + 0.5) * 255))
      }
      if (dehaze) {
        const dBoost = 1 + dehaze * 0.3
        d[i] = Math.min(255, Math.max(0, ((d[i] / 255 - 0.5) * dBoost + 0.5) * 255))
        d[i + 1] = Math.min(255, Math.max(0, ((d[i + 1] / 255 - 0.5) * dBoost + 0.5) * 255))
        d[i + 2] = Math.min(255, Math.max(0, ((d[i + 2] / 255 - 0.5) * dBoost + 0.5) * 255))
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }

  if (editState.vignette && editState.vignette > 0) {
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const radius = Math.max(cx, cy)
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, `rgba(0,0,0,${editState.vignette})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  return canvas.toDataURL('image/jpeg', 0.9)
}
