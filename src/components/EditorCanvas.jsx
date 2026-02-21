import { useRef, useCallback, useEffect } from 'react'
import { FILTER_PRESETS } from '../constants'

export function EditorCanvas({ imageSrc, editState, canvasRef }) {
  const imageRef = useRef(null)
  const { brightness, contrast, saturation, rotation, cropRatio, preset } = editState

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
  }, [rotation, cropRatio, adjustmentFilter, canvasRef])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas, imageSrc])

  return (
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
  )
}
