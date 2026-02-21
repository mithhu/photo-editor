import { useRef, useCallback, useEffect, useState } from 'react'
import { FILTER_PRESETS } from '../constants'
import { getCropRegion } from '../utils/cropUtils'

export function EditorCanvas({ imageSrc, editState, canvasRef, onZoomPanChange }) {
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const [containerSize, setContainerSize] = useState(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        setContainerSize({ w: width, h: height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const {
    brightness, contrast, saturation, exposure, highlights, shadows,
    warmth, tint, vibrance,
    rotation, cropRatio, customCrop, preset, zoom, panX, panY, textOverlays,
  } = editState

  const presetFilter = FILTER_PRESETS.find((p) => p.id === preset)?.filter || ''
  const highlightContrast = 2 - highlights
  const shadowBrightness = shadows
  const adjustmentFilter = `brightness(${brightness * exposure * shadowBrightness}) contrast(${contrast * highlightContrast}) saturate(${saturation}) ${presetFilter}`
  const needsPixelPass = warmth !== 0 || tint !== 0 || vibrance !== 0

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || !img.complete || !containerSize) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = img.naturalWidth
    const h = img.naturalHeight

    let sx, sy, sw, sh
    if (customCrop && customCrop.w > 0 && customCrop.h > 0) {
      sx = customCrop.x * w
      sy = customCrop.y * h
      sw = customCrop.w * w
      sh = customCrop.h * h
    } else {
      const region = getCropRegion(w, h, cropRatio)
      sx = region.sx; sy = region.sy; sw = region.sw; sh = region.sh
    }

    const rot = (rotation * Math.PI) / 180
    const cos = Math.abs(Math.cos(rot))
    const sin = Math.abs(Math.sin(rot))
    const cw = sw * cos + sh * sin
    const ch = sw * sin + sh * cos

    const scale = Math.min(containerSize.w / cw, containerSize.h / ch, 1)
    const displayW = cw * scale
    const displayH = ch * scale

    canvas.width = displayW * dpr
    canvas.height = displayH * dpr
    canvas.style.width = displayW + 'px'
    canvas.style.height = displayH + 'px'
    ctx.scale(dpr, dpr)

    ctx.save()
    ctx.translate(displayW / 2, displayH / 2)
    ctx.rotate(rot)
    ctx.scale(scale, scale)
    ctx.translate(-sw / 2, -sh / 2)
    ctx.filter = adjustmentFilter
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
    ctx.restore()

    if (needsPixelPass) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = imgData.data
      const warmShift = warmth * 30
      const tintShift = tint * 30
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, Math.max(0, d[i] + warmShift))
        d[i + 2] = Math.min(255, Math.max(0, d[i + 2] - warmShift))
        d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + tintShift))

        if (vibrance !== 0) {
          const r = d[i], g = d[i + 1], b = d[i + 2]
          const mx = Math.max(r, g, b)
          const avg = (r + g + b) / 3
          const amt = ((mx - avg) / 255) * (-vibrance * 2)
          d[i] += (mx - r) * amt
          d[i + 1] += (mx - g) * amt
          d[i + 2] += (mx - b) * amt
        }
      }
      ctx.putImageData(imgData, 0, 0)
    }

    if (textOverlays?.length) {
      textOverlays.forEach((t) => {
        ctx.save()
        ctx.font = `${t.fontSize ?? 32}px sans-serif`
        ctx.fillStyle = t.color ?? '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(t.text || 'Text', (t.x ?? 0.5) * displayW, (t.y ?? 0.5) * displayH)
        ctx.restore()
      })
    }
  }, [rotation, cropRatio, customCrop, adjustmentFilter, needsPixelPass, warmth, tint, vibrance, canvasRef, textOverlays, containerSize])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas, imageSrc])

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault()
      if (!onZoomPanChange) return
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.5, Math.min(4, zoom + delta))
      onZoomPanChange({ zoom: newZoom, panX, panY })
    },
    [zoom, panX, panY, onZoomPanChange],
  )

  const handleMouseDown = useCallback(
    (e) => {
      if (!onZoomPanChange) return
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY, panX, panY }
    },
    [panX, panY, onZoomPanChange],
  )

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !onZoomPanChange) return
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      onZoomPanChange({
        zoom,
        panX: dragStartRef.current.panX + dx,
        panY: dragStartRef.current.panY + dy,
      })
    },
    [isDragging, zoom, onZoomPanChange],
  )

  const handleMouseUp = useCallback(() => setIsDragging(false), [])
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  return (
    <div
      ref={containerRef}
      className="min-w-0 min-h-[60vw] lg:min-h-0 lg:flex-1 relative bg-zinc-900/50 rounded-xl p-4 overflow-hidden flex items-center justify-center"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <div
        className="flex-shrink-0"
        style={{
          transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
        }}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Edit"
          className="hidden"
          onLoad={drawCanvas}
        />
        <canvas
          ref={canvasRef}
          className="rounded-lg shadow-2xl"
          style={{ background: '#1a1a1a' }}
        />
      </div>
    </div>
  )
}
