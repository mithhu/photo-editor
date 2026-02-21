import { useRef, useCallback, useEffect, useState } from 'react'
import { FILTER_PRESETS } from '../constants'
import { getCropRegion } from '../utils/cropUtils'

export function EditorCanvas({ imageSrc, editState, canvasRef, onZoomPanChange, onApplyChange }) {
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const currentStrokeRef = useRef(null)
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
    rotation, flipH, flipV, cropRatio, customCrop, preset, zoom, panX, panY, textOverlays,
    shapeOverlays,
    brushStrokes, drawingMode, brushColor, brushSize, brushOpacity,
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
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
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

    const allStrokes = currentStrokeRef.current
      ? [...(brushStrokes || []), currentStrokeRef.current]
      : (brushStrokes || [])

    if (allStrokes.length) {
      allStrokes.forEach((stroke) => {
        if (!stroke.points || stroke.points.length < 2) return
        ctx.save()
        ctx.globalAlpha = stroke.opacity ?? 1
        if (stroke.tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out'
        }
        ctx.strokeStyle = stroke.color ?? '#ffffff'
        ctx.lineWidth = stroke.size ?? 5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(stroke.points[0].x * displayW, stroke.points[0].y * displayH)
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x * displayW, stroke.points[i].y * displayH)
        }
        ctx.stroke()
        ctx.restore()
      })
    }

    if (shapeOverlays?.length) {
      shapeOverlays.forEach((shape) => {
        const cx = (shape.x ?? 0.5) * displayW
        const cy = (shape.y ?? 0.5) * displayH
        const size = shape.size ?? 40
        const color = shape.color ?? '#ffffff'
        const rot = ((shape.rotation ?? 0) * Math.PI) / 180
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(rot)
        ctx.fillStyle = color
        if (shape.type === 'square') {
          ctx.fillRect(-size / 2, -size / 2, size, size)
        } else {
          ctx.beginPath()
          switch (shape.type) {
          case 'triangle': {
            const h = (size * Math.sqrt(3)) / 2
            ctx.moveTo(0, -size / 2)
            ctx.lineTo(-size / 2, h / 2)
            ctx.lineTo(size / 2, h / 2)
            ctx.closePath()
            break
          }
          case 'star': {
            const outer = size / 2
            const inner = outer * 0.4
            for (let i = 0; i < 10; i++) {
              const r = i % 2 === 0 ? outer : inner
              const a = (i * Math.PI) / 5 - Math.PI / 2
              const x = r * Math.cos(a)
              const y = r * Math.sin(a)
              if (i === 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            }
            ctx.closePath()
            break
          }
          case 'heart': {
            const s = size / 4
            ctx.moveTo(0, -s)
            ctx.bezierCurveTo(s * 2, -s * 2, s * 3, s, 0, s * 2)
            ctx.bezierCurveTo(-s * 3, s, -s * 2, -s * 2, 0, -s)
            break
          }
          case 'arrow-right': {
            const w = size / 2
            ctx.moveTo(-w, -w)
            ctx.lineTo(w, 0)
            ctx.lineTo(-w, w)
            ctx.closePath()
            break
          }
          case 'arrow-up': {
            const w = size / 2
            ctx.moveTo(0, -w)
            ctx.lineTo(w, w)
            ctx.lineTo(-w, w)
            ctx.closePath()
            break
          }
          default:
            ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
          }
          ctx.fill()
        }
        ctx.restore()
      })
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
  }, [rotation, flipH, flipV, cropRatio, customCrop, adjustmentFilter, needsPixelPass, warmth, tint, vibrance, canvasRef, textOverlays, shapeOverlays, containerSize, brushStrokes])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas, imageSrc])

  const getCanvasPoint = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }, [canvasRef])

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
      if (drawingMode) {
        const pt = getCanvasPoint(e)
        if (!pt) return
        setIsDrawing(true)
        currentStrokeRef.current = {
          points: [pt],
          color: drawingMode === 'eraser' ? '#000000' : brushColor,
          size: brushSize,
          opacity: brushOpacity,
          tool: drawingMode,
        }
        return
      }
      if (!onZoomPanChange) return
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY, panX, panY }
    },
    [panX, panY, onZoomPanChange, drawingMode, brushColor, brushSize, brushOpacity, getCanvasPoint],
  )

  const handleMouseMove = useCallback(
    (e) => {
      if (isDrawing && currentStrokeRef.current) {
        const pt = getCanvasPoint(e)
        if (!pt) return
        currentStrokeRef.current = {
          ...currentStrokeRef.current,
          points: [...currentStrokeRef.current.points, pt],
        }
        drawCanvas()
        return
      }
      if (!isDragging || !onZoomPanChange) return
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      onZoomPanChange({
        zoom,
        panX: dragStartRef.current.panX + dx,
        panY: dragStartRef.current.panY + dy,
      })
    },
    [isDragging, isDrawing, zoom, onZoomPanChange, getCanvasPoint, drawCanvas],
  )

  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentStrokeRef.current && onApplyChange) {
      const finishedStroke = currentStrokeRef.current
      currentStrokeRef.current = null
      setIsDrawing(false)
      onApplyChange((s) => ({
        ...s,
        brushStrokes: [...(s.brushStrokes || []), finishedStroke],
      }))
      return
    }
    setIsDragging(false)
  }, [isDrawing, onApplyChange])

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
      style={{ cursor: drawingMode ? 'crosshair' : isDragging ? 'grabbing' : 'grab' }}
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
