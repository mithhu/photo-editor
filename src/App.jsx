import { useState, useRef, useCallback, useEffect } from 'react'

// Filter presets: { name, filter }
const FILTER_PRESETS = [
  { id: 'none', name: 'None', filter: '' },
  { id: 'vintage', name: 'Vintage', filter: 'sepia(0.5) contrast(1.1) saturate(0.9)' },
  { id: 'cinematic', name: 'Cinematic', filter: 'contrast(1.2) saturate(0.8) brightness(0.95)' },
  { id: 'dramatic', name: 'Dramatic', filter: 'contrast(1.3) saturate(1.2)' },
  { id: 'warm', name: 'Warm', filter: 'sepia(0.2) saturate(1.2) brightness(1.05)' },
  { id: 'cool', name: 'Cool', filter: 'saturate(0.9) hue-rotate(-10deg)' },
  { id: 'bw', name: 'B&W', filter: 'grayscale(1) contrast(1.1)' },
  { id: 'fade', name: 'Fade', filter: 'contrast(0.9) saturate(0.85)' },
  { id: 'vivid', name: 'Vivid', filter: 'saturate(1.4) contrast(1.1)' },
]

function ImageUpload({ onImageLoad }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (file) => {
    if (!file?.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => onImageLoad(e.target.result)
    reader.readAsDataURL(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const onDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  return (
    <div
      className="border-2 border-dashed border-zinc-600 rounded-xl p-12 text-center cursor-pointer transition-colors hover:border-amber-500/50 hover:bg-zinc-800/30"
      style={{ borderColor: isDragging ? 'rgba(245,158,11,0.5)' : undefined, backgroundColor: isDragging ? 'rgba(39,39,42,0.5)' : undefined }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <div className="text-zinc-400 text-4xl mb-3">📷</div>
      <p className="text-zinc-300 text-lg">Drop an image here or click to upload</p>
      <p className="text-zinc-500 text-sm mt-1">PNG, JPG, WebP</p>
    </div>
  )
}

function Slider({ label, value, onChange, min = 0, max = 2, step = 0.01 }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300 tabular-nums">{(value * 100).toFixed(0)}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
      />
    </div>
  )
}

function App() {
  const [imageSrc, setImageSrc] = useState(null)
  const [brightness, setBrightness] = useState(1)
  const [contrast, setContrast] = useState(1)
  const [saturation, setSaturation] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [cropRatio, setCropRatio] = useState('original') // original | 1:1 | 4:5 | 16:9
  const [preset, setPreset] = useState('none')
  const canvasRef = useRef(null)
  const imageRef = useRef(null)

  const presetFilter = FILTER_PRESETS.find((p) => p.id === preset)?.filter || ''

  const adjustmentFilter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) ${presetFilter}`

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || !img.complete) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = img.naturalWidth
    const h = img.naturalHeight

    // Crop region (sx, sy, sw, sh) - center crop based on ratio
    let sx = 0, sy = 0, sw = w, sh = h
    if (cropRatio === '1:1') {
      const size = Math.min(w, h)
      sx = (w - size) / 2
      sy = (h - size) / 2
      sw = sh = size
    } else if (cropRatio === '4:5') {
      const targetRatio = 4 / 5
      const currentRatio = w / h
      if (currentRatio > targetRatio) {
        sw = h * targetRatio
        sx = (w - sw) / 2
      } else {
        sh = w / targetRatio
        sy = (h - sh) / 2
      }
    } else if (cropRatio === '16:9') {
      const targetRatio = 16 / 9
      const currentRatio = w / h
      if (currentRatio > targetRatio) {
        sh = w / targetRatio
        sy = (h - sh) / 2
      } else {
        sw = h * targetRatio
        sx = (w - sw) / 2
      }
    }

    const rot = (rotation * Math.PI) / 180
    const cos = Math.abs(Math.cos(rot))
    const sin = Math.abs(Math.sin(rot))
    const cw = sw * cos + sh * sin
    const ch = sw * sin + sh * cos
    const scale = Math.min(800 / cw, 600 / ch, 1)
    canvas.width = cw * scale * dpr
    canvas.height = ch * scale * dpr
    ctx.scale(dpr, dpr)
    canvas.style.width = cw * scale + 'px'
    canvas.style.height = ch * scale + 'px'

    ctx.save()
    ctx.translate((cw * scale) / 2, (ch * scale) / 2)
    ctx.rotate(rot)
    ctx.translate(-sw / 2, -sh / 2)
    ctx.filter = adjustmentFilter
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
    ctx.restore()
  }, [rotation, cropRatio, adjustmentFilter])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas, imageSrc])

  const handleImageLoad = (src) => {
    setImageSrc(src)
    setBrightness(1)
    setContrast(1)
    setSaturation(1)
    setRotation(0)
    setCropRatio('original')
    setPreset('none')
  }

  const handleRotate = (deg) => {
    setRotation((r) => (r + deg + 360) % 360)
  }

  const handleReset = () => {
    setBrightness(1)
    setContrast(1)
    setSaturation(1)
    setRotation(0)
    setCropRatio('original')
    setPreset('none')
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `edited-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleNewImage = () => {
    setImageSrc(null)
    setBrightness(1)
    setContrast(1)
    setSaturation(1)
    setRotation(0)
    setCropRatio('original')
    setPreset('none')
  }

  if (!imageSrc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold text-amber-500 mb-2">Photo Editor</h1>
        <p className="text-zinc-500 mb-8">Edit your photos with filters and adjustments</p>
        <div className="w-full max-w-md">
          <ImageUpload onImageLoad={handleImageLoad} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
        <h1 className="text-xl font-bold text-amber-500">Photo Editor</h1>
        <div className="flex gap-2">
          <button
            onClick={handleNewImage}
            className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
          >
            New Image
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-400 text-zinc-900 font-medium rounded-lg transition-colors"
          >
            Download
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-auto">
        <div className="flex-1 flex items-center justify-center min-h-[400px] bg-zinc-900/50 rounded-xl p-4">
          <div className="relative">
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Edit"
              className="hidden"
              onLoad={drawCanvas}
            />
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[70vh] rounded-lg shadow-2xl"
              style={{ background: '#1a1a1a' }}
            />
          </div>
        </div>

        <aside className="w-full lg:w-80 flex flex-col gap-6 overflow-y-auto">
          <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Adjustments</h3>
            <div className="space-y-4">
              <Slider label="Brightness" value={brightness} onChange={setBrightness} />
              <Slider label="Contrast" value={contrast} onChange={setContrast} />
              <Slider label="Saturation" value={saturation} onChange={setSaturation} />
            </div>
            <button
              onClick={handleReset}
              className="mt-4 w-full py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
            >
              Reset Adjustments
            </button>
          </div>

          <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Crop</h3>
            <div className="flex flex-wrap gap-2">
              {['original', '1:1', '4:5', '16:9'].map((r) => (
                <button
                  key={r}
                  onClick={() => setCropRatio(r)}
                  className={`py-2 px-3 text-xs rounded-lg transition-colors ${
                    cropRatio === r ? 'bg-amber-500 text-zinc-900 font-medium' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                  }`}
                >
                  {r === 'original' ? 'Original' : r}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Rotate</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleRotate(-90)}
                className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
              >
                ↺ -90°
              </button>
              <button
                onClick={() => handleRotate(90)}
                className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
              >
                ↻ 90°
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Filters</h3>
            <div className="grid grid-cols-3 gap-2">
              {FILTER_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`py-2 px-3 text-xs rounded-lg transition-colors ${
                    preset === p.id
                      ? 'bg-amber-500 text-zinc-900 font-medium'
                      : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App
