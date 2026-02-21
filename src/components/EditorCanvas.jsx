import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { FILTER_PRESETS } from '../constants'
import { getCropRegion } from '../utils/cropUtils'
import { CropOverlay } from './CropOverlay'
import { buildCurveLUT } from '../utils/curvesUtils'
import { useThrottledDraw } from '../hooks/useThrottledDraw'
import { applyFilmEmulation, addFilmGrain } from '../utils/filmEmulation'

export function EditorCanvas({ imageSrc, editState, canvasRef, isComparing, onZoomPanChange, onApplyChange }) {
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const currentStrokeRef = useRef(null)
  const touchRef = useRef({ lastDistance: 0, startPanX: 0, startPanY: 0 })
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
    warmth, tint, vibrance, clarity, dehaze, vignette,
    rotation, flipH, flipV, cropRatio, customCrop, preset, zoom, panX, panY, textOverlays,
    shapeOverlays, layerVisibility,
    brushStrokes, drawingMode, brushColor, brushSize, brushOpacity,
    hsl,
    curves,
    colorGrade,
    splitTone,
    masks,
    filmEmulation,
    filmIntensity,
    filmGrain,
  } = editState

  const cropActive = cropRatio !== 'original'
  const [imageDims, setImageDims] = useState(null)

  const cropOverlayRegion = useMemo(() => {
    if (!cropActive) return null
    if (customCrop && customCrop.w > 0 && customCrop.h > 0) {
      return { x: customCrop.x, y: customCrop.y, w: customCrop.w, h: customCrop.h }
    }
    if (!imageDims) return null
    const { sx, sy, sw, sh } = getCropRegion(imageDims.w, imageDims.h, cropRatio)
    return { x: sx / imageDims.w, y: sy / imageDims.h, w: sw / imageDims.w, h: sh / imageDims.h }
  }, [cropActive, cropRatio, customCrop, imageDims])

  const handleCropChange = useCallback((region) => {
    if (!onApplyChange) return
    onApplyChange((s) => ({
      ...s,
      customCrop: region,
      cropRatio: s.cropRatio === 'original' ? 'custom' : s.cropRatio,
    }))
  }, [onApplyChange])

  const presetFilter = FILTER_PRESETS.find((p) => p.id === preset)?.filter || ''
  const highlightContrast = 2 - highlights
  const shadowBrightness = shadows
  const fullAdjustmentFilter = `brightness(${brightness * exposure * shadowBrightness}) contrast(${contrast * highlightContrast}) saturate(${saturation}) ${presetFilter}`
  const adjustmentFilter = isComparing ? 'none' : fullAdjustmentFilter
  const hasHSL = hsl && Object.values(hsl).some(c => c.h !== 0 || c.s !== 0 || c.l !== 0)
  const hasCurves = curves && Object.entries(curves).some(([, pts]) =>
    pts.length > 2 || (pts.length === 2 && (pts[0][0] !== 0 || pts[0][1] !== 0 || pts[1][0] !== 1 || pts[1][1] !== 1))
  )
  const hasColorGrade = colorGrade && Object.values(colorGrade).some(
    (c) => (c?.r !== 0 || c?.g !== 0 || c?.b !== 0)
  )
  const hasSplitTone = splitTone && (splitTone.highlightSat > 0 || splitTone.shadowSat > 0)
  const hasFilmEmulation = !isComparing && !!filmEmulation
  const needsPixelPass = !isComparing && (warmth !== 0 || tint !== 0 || vibrance !== 0 || clarity !== 0 || dehaze !== 0 || hasHSL || hasCurves || hasColorGrade || hasSplitTone || hasFilmEmulation)

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

      let rgbLUT, rLUT, gLUT, bLUT
      if (hasCurves) {
        rgbLUT = buildCurveLUT(curves.rgb)
        rLUT = buildCurveLUT(curves.red)
        gLUT = buildCurveLUT(curves.green)
        bLUT = buildCurveLUT(curves.blue)
      }

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
        if (clarity !== 0) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
          const midWeight = 1 - Math.abs(lum - 128) / 128
          const boost = clarity * midWeight * 40
          d[i] = Math.min(255, Math.max(0, d[i] + boost * (d[i] > lum ? 1 : -1) * 0.5))
          d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + boost * (d[i + 1] > lum ? 1 : -1) * 0.5))
          d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + boost * (d[i + 2] > lum ? 1 : -1) * 0.5))
        }
        if (dehaze !== 0) {
          const factor = 1 + dehaze * 0.4
          d[i] = Math.min(255, Math.max(0, ((d[i] / 255 - 0.5) * factor + 0.5) * 255))
          d[i + 1] = Math.min(255, Math.max(0, ((d[i + 1] / 255 - 0.5) * factor + 0.5) * 255))
          d[i + 2] = Math.min(255, Math.max(0, ((d[i + 2] / 255 - 0.5) * factor + 0.5) * 255))
        }
        if (hasHSL) {
          let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255
          const max = Math.max(r, g, b), min = Math.min(r, g, b)
          let h, s, l = (max + min) / 2

          if (max === min) {
            h = s = 0
          } else {
            const delta = max - min
            s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
            if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6
            else if (max === g) h = ((b - r) / delta + 2) / 6
            else h = ((r - g) / delta + 4) / 6
          }

          const hDeg = h * 360
          let colorKey = null
          if (hDeg < 15 || hDeg >= 345) colorKey = 'red'
          else if (hDeg < 45) colorKey = 'orange'
          else if (hDeg < 75) colorKey = 'yellow'
          else if (hDeg < 150) colorKey = 'green'
          else if (hDeg < 195) colorKey = 'cyan'
          else if (hDeg < 255) colorKey = 'blue'
          else if (hDeg < 300) colorKey = 'purple'
          else colorKey = 'magenta'

          const adj = hsl[colorKey]
          if (adj && (adj.h !== 0 || adj.s !== 0 || adj.l !== 0)) {
            h = (h + adj.h * 0.1 + 1) % 1
            s = Math.min(1, Math.max(0, s + adj.s * 0.5))
            l = Math.min(1, Math.max(0, l + adj.l * 0.3))

            let r2, g2, b2
            if (s === 0) {
              r2 = g2 = b2 = l
            } else {
              const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1
                if (t > 1) t -= 1
                if (t < 1 / 6) return p + (q - p) * 6 * t
                if (t < 1 / 2) return q
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
                return p
              }
              const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s
              const p2 = 2 * l - q2
              r2 = hue2rgb(p2, q2, h + 1 / 3)
              g2 = hue2rgb(p2, q2, h)
              b2 = hue2rgb(p2, q2, h - 1 / 3)
            }
            d[i] = Math.round(r2 * 255)
            d[i + 1] = Math.round(g2 * 255)
            d[i + 2] = Math.round(b2 * 255)
          }
        }
        if (hasCurves) {
          d[i] = rLUT[rgbLUT[Math.min(255, Math.max(0, Math.round(d[i])))]]
          d[i + 1] = gLUT[rgbLUT[Math.min(255, Math.max(0, Math.round(d[i + 1])))]]
          d[i + 2] = bLUT[rgbLUT[Math.min(255, Math.max(0, Math.round(d[i + 2])))]]
        }
        if (hasColorGrade) {
          const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255
          const shadowWeight = Math.max(0, 1 - lum * 3)
          const highlightWeight = Math.max(0, (lum - 0.66) * 3)
          const midtoneWeight = 1 - shadowWeight - highlightWeight

          const sr = (colorGrade.shadows?.r || 0) * shadowWeight * 30
          const sg = (colorGrade.shadows?.g || 0) * shadowWeight * 30
          const sb = (colorGrade.shadows?.b || 0) * shadowWeight * 30
          const mr = (colorGrade.midtones?.r || 0) * midtoneWeight * 30
          const mg = (colorGrade.midtones?.g || 0) * midtoneWeight * 30
          const mb = (colorGrade.midtones?.b || 0) * midtoneWeight * 30
          const hr = (colorGrade.highlights?.r || 0) * highlightWeight * 30
          const hg = (colorGrade.highlights?.g || 0) * highlightWeight * 30
          const hb = (colorGrade.highlights?.b || 0) * highlightWeight * 30

          d[i] = Math.min(255, Math.max(0, d[i] + sr + mr + hr))
          d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + sg + mg + hg))
          d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + sb + mb + hb))
        }
        if (hasSplitTone) {
          const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255
          const bal = (splitTone.balance || 0) * 0.5 + 0.5

          let hue, sat, weight
          if (lum < bal) {
            hue = splitTone.shadowHue || 0
            sat = splitTone.shadowSat || 0
            weight = (bal - lum) / Math.max(bal, 0.01)
          } else {
            hue = splitTone.highlightHue || 0
            sat = splitTone.highlightSat || 0
            weight = (lum - bal) / Math.max(1 - bal, 0.01)
          }

          if (sat > 0) {
            const angle = hue * Math.PI * 2
            const tr = Math.cos(angle) * sat * weight * 40
            const tg = Math.cos(angle - 2.094) * sat * weight * 40
            const tb = Math.cos(angle + 2.094) * sat * weight * 40
            d[i] = Math.min(255, Math.max(0, d[i] + tr))
            d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + tg))
            d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + tb))
          }
        }
      }

      if (hasFilmEmulation) {
        applyFilmEmulation(imgData, filmEmulation, filmIntensity ?? 1)
      }

      ctx.putImageData(imgData, 0, 0)
    }

    if (!isComparing && filmGrain > 0) {
      addFilmGrain(ctx, canvas.width, canvas.height, filmGrain)
    }

    if (!isComparing && vignette > 0) {
      const cx = displayW / 2
      const cy = displayH / 2
      const radius = Math.sqrt(cx * cx + cy * cy)
      const gradient = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius)
      gradient.addColorStop(0, 'rgba(0,0,0,0)')
      gradient.addColorStop(1, `rgba(0,0,0,${vignette * 0.8})`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, displayW, displayH)
    }

    const hasMasks = !isComparing && masks?.length > 0
    if (hasMasks) {
      const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const md = maskData.data

      for (let i = 0; i < md.length; i += 4) {
        const pixelIndex = i / 4
        const px = (pixelIndex % canvas.width) / canvas.width
        const py = Math.floor(pixelIndex / canvas.width) / canvas.height

        masks.forEach((mask) => {
          let weight = 0

          if (mask.type === 'radial') {
            const dx = (px - (mask.centerX ?? 0.5)) / ((mask.radiusX ?? 0.3) || 0.3)
            const dy = (py - (mask.centerY ?? 0.5)) / ((mask.radiusY ?? 0.3) || 0.3)
            const dist = Math.sqrt(dx * dx + dy * dy)
            const feather = mask.feather ?? 0.5
            weight = 1 - Math.min(1, Math.max(0, (dist - (1 - feather)) / feather))
          } else if (mask.type === 'linear') {
            const dx = (mask.endX ?? 1) - (mask.startX ?? 0)
            const dy = (mask.endY ?? 0.5) - (mask.startY ?? 0.5)
            const len = Math.sqrt(dx * dx + dy * dy) || 0.001
            const t = ((px - (mask.startX ?? 0)) * dx + (py - (mask.startY ?? 0.5)) * dy) / (len * len)
            weight = Math.min(1, Math.max(0, t))
          }

          if (mask.invert) weight = 1 - weight
          if (weight <= 0) return

          const br = (mask.brightness ?? 0) * weight * 60
          const ct = 1 + (mask.contrast ?? 0) * weight * 0.5
          const st = 1 + (mask.saturation ?? 0) * weight * 0.5

          md[i] = Math.min(255, Math.max(0, md[i] + br))
          md[i + 1] = Math.min(255, Math.max(0, md[i + 1] + br))
          md[i + 2] = Math.min(255, Math.max(0, md[i + 2] + br))

          if (ct !== 1) {
            md[i] = Math.min(255, Math.max(0, ((md[i] / 255 - 0.5) * ct + 0.5) * 255))
            md[i + 1] = Math.min(255, Math.max(0, ((md[i + 1] / 255 - 0.5) * ct + 0.5) * 255))
            md[i + 2] = Math.min(255, Math.max(0, ((md[i + 2] / 255 - 0.5) * ct + 0.5) * 255))
          }

          if (st !== 1) {
            const gray = 0.299 * md[i] + 0.587 * md[i + 1] + 0.114 * md[i + 2]
            md[i] = Math.min(255, Math.max(0, gray + (md[i] - gray) * st))
            md[i + 1] = Math.min(255, Math.max(0, gray + (md[i + 1] - gray) * st))
            md[i + 2] = Math.min(255, Math.max(0, gray + (md[i + 2] - gray) * st))
          }
        })
      }
      ctx.putImageData(maskData, 0, 0)
    }

    if (!isComparing) {
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
        if (layerVisibility?.[shape.id] === false) return
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
        if (layerVisibility?.[t.id] === false) return
        ctx.save()
        const tx = (t.x ?? 0.5) * displayW
        const ty = (t.y ?? 0.5) * displayH
        ctx.translate(tx, ty)
        if (t.rotation) ctx.rotate((t.rotation * Math.PI) / 180)
        ctx.globalAlpha = t.opacity ?? 1
        const weight = t.fontWeight === 'bold' ? 'bold' : 'normal'
        const style = t.fontStyle === 'italic' ? 'italic' : 'normal'
        const family = t.fontFamily || 'sans-serif'
        ctx.font = `${style} ${weight} ${t.fontSize ?? 32}px ${family}`
        ctx.fillStyle = t.color ?? '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        if (t.textShadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.5)'
          ctx.shadowBlur = 4
          ctx.shadowOffsetX = 2
          ctx.shadowOffsetY = 2
        }
        ctx.fillText(t.text || 'Text', 0, 0)
        ctx.restore()
      })
    }
    }
  }, [rotation, flipH, flipV, cropRatio, customCrop, adjustmentFilter, needsPixelPass, warmth, tint, vibrance, clarity, dehaze, vignette, masks, canvasRef, textOverlays, shapeOverlays, layerVisibility, containerSize, brushStrokes, isComparing, hasHSL, hsl, hasCurves, curves, colorGrade, splitTone, hasColorGrade, hasSplitTone, hasFilmEmulation, filmEmulation, filmIntensity, filmGrain])

  const throttledDraw = useThrottledDraw(drawCanvas, 32)

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current
    if (img) setImageDims({ w: img.naturalWidth, h: img.naturalHeight })
    throttledDraw()
  }, [throttledDraw])

  useEffect(() => {
    throttledDraw()
  }, [throttledDraw, imageSrc])

  const getCanvasPoint = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }, [canvasRef])

  const getCanvasPointFromTouch = useCallback((touch) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: (touch.clientX - rect.left) / rect.width,
      y: (touch.clientY - rect.top) / rect.height,
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
        throttledDraw()
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
    [isDragging, isDrawing, zoom, onZoomPanChange, getCanvasPoint, throttledDraw],
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

  // --- Touch event handlers ---

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      if (drawingMode) {
        e.preventDefault()
        const pt = getCanvasPointFromTouch(touch)
        if (!pt) return
        setIsDrawing(true)
        currentStrokeRef.current = {
          points: [pt],
          color: drawingMode === 'eraser' ? '#000000' : brushColor,
          size: brushSize,
          opacity: brushOpacity,
          tool: drawingMode,
        }
      } else {
        e.preventDefault()
        setIsDragging(true)
        dragStartRef.current = { x: touch.clientX, y: touch.clientY, panX, panY }
      }
    } else if (e.touches.length === 2) {
      e.preventDefault()
      setIsDragging(false)
      setIsDrawing(false)
      currentStrokeRef.current = null
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchRef.current.lastDistance = Math.sqrt(dx * dx + dy * dy)
      touchRef.current.startPanX = panX
      touchRef.current.startPanY = panY
    }
  }, [drawingMode, brushColor, brushSize, brushOpacity, panX, panY, getCanvasPointFromTouch])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      if (isDrawing && currentStrokeRef.current) {
        e.preventDefault()
        const pt = getCanvasPointFromTouch(touch)
        if (!pt) return
        currentStrokeRef.current = {
          ...currentStrokeRef.current,
          points: [...currentStrokeRef.current.points, pt],
        }
        throttledDraw()
      } else if (isDragging && onZoomPanChange) {
        e.preventDefault()
        const dx = touch.clientX - dragStartRef.current.x
        const dy = touch.clientY - dragStartRef.current.y
        onZoomPanChange({
          zoom,
          panX: dragStartRef.current.panX + dx,
          panY: dragStartRef.current.panY + dy,
        })
      }
    } else if (e.touches.length === 2 && onZoomPanChange) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const prev = touchRef.current.lastDistance
      if (prev > 0) {
        const scale = distance / prev
        const newZoom = Math.max(0.5, Math.min(4, zoom * scale))
        onZoomPanChange({ zoom: newZoom, panX, panY })
      }
      touchRef.current.lastDistance = distance
    }
  }, [isDrawing, isDragging, zoom, panX, panY, onZoomPanChange, getCanvasPointFromTouch, throttledDraw])

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
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
      touchRef.current.lastDistance = 0
    } else if (e.touches.length === 1) {
      // Went from two fingers to one — reset for single-finger pan
      touchRef.current.lastDistance = 0
      const touch = e.touches[0]
      if (!drawingMode) {
        setIsDragging(true)
        dragStartRef.current = { x: touch.clientX, y: touch.clientY, panX, panY }
      }
    }
  }, [isDrawing, onApplyChange, drawingMode, panX, panY])

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
      className="min-w-0 min-h-[60vw] lg:min-h-0 lg:flex-1 relative bg-zinc-900/50 rounded-xl p-4 overflow-hidden flex items-center justify-center touch-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: drawingMode ? 'crosshair' : isDragging ? 'grabbing' : 'grab' }}
    >
      <div
        className="flex-shrink-0 relative"
        style={{
          transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
        }}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Edit"
          className="hidden"
          onLoad={handleImageLoad}
        />
        <canvas
          ref={canvasRef}
          className="rounded-lg shadow-2xl"
          style={{ background: '#1a1a1a' }}
        />
        <CropOverlay
          cropRegion={cropOverlayRegion}
          onCropChange={handleCropChange}
          isActive={cropActive}
          cropRatio={cropRatio}
        />
      </div>
    </div>
  )
}
