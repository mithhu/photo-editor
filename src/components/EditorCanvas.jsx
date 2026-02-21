import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { FILTER_PRESETS } from '../constants'
import { getCropRegion } from '../utils/cropUtils'
import { CropOverlay } from './CropOverlay'
import { buildCurveLUT } from '../utils/curvesUtils'
import { useThrottledDraw } from '../hooks/useThrottledDraw'
import { applyFilmEmulation, addFilmGrain } from '../utils/filmEmulation'
import { applyPixelFilters } from '../utils/pixelFilters'
import { applyTiltShift } from '../utils/tiltShift'
import { applyGrain } from '../utils/grain'
import { applyLightLeak } from '../utils/lightLeaks'

function drawFrame(ctx, displayW, displayH, frame) {
  if (!frame || frame.type === 'none') return
  const w = frame.width || 10
  const color = frame.color || '#ffffff'

  ctx.save()
  switch (frame.type) {
    case 'simple': {
      ctx.strokeStyle = color
      ctx.lineWidth = w
      ctx.strokeRect(w / 2, w / 2, displayW - w, displayH - w)
      break
    }
    case 'rounded': {
      const r = Math.min(w * 2, displayW / 4, displayH / 4)
      ctx.globalCompositeOperation = 'destination-in'
      ctx.beginPath()
      ctx.roundRect(0, 0, displayW, displayH, r)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
      ctx.lineWidth = w
      ctx.beginPath()
      ctx.roundRect(w / 2, w / 2, displayW - w, displayH - w, Math.max(0, r - w / 2))
      ctx.stroke()
      break
    }
    case 'shadow': {
      const grad = ctx.createRadialGradient(
        displayW / 2, displayH / 2, Math.min(displayW, displayH) * 0.35,
        displayW / 2, displayH / 2, Math.max(displayW, displayH) * 0.55
      )
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, `rgba(0,0,0,${Math.min(1, w / 25)})`)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, displayW, displayH)
      break
    }
    case 'polaroid': {
      const side = Math.max(4, w * 0.6)
      const top = Math.max(4, w * 0.6)
      const bottom = Math.max(16, w * 2.5)
      ctx.fillStyle = color
      ctx.fillRect(0, 0, displayW, top)
      ctx.fillRect(0, displayH - bottom, displayW, bottom)
      ctx.fillRect(0, 0, side, displayH)
      ctx.fillRect(displayW - side, 0, side, displayH)
      break
    }
    case 'film': {
      const borderH = Math.max(14, w * 1.2)
      ctx.fillStyle = '#111111'
      ctx.fillRect(0, 0, displayW, borderH)
      ctx.fillRect(0, displayH - borderH, displayW, borderH)
      const holeR = Math.max(3, borderH * 0.22)
      const holeSpacing = Math.max(holeR * 4, 20)
      ctx.fillStyle = '#f5f5f5'
      for (let x = holeSpacing / 2; x < displayW; x += holeSpacing) {
        ctx.beginPath()
        ctx.arc(x, borderH / 2, holeR, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x, displayH - borderH / 2, holeR, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'vintage': {
      const outerW = Math.max(3, w * 0.7)
      const innerW = Math.max(1, w * 0.25)
      const gap = Math.max(2, w * 0.3)
      ctx.strokeStyle = color
      ctx.lineWidth = outerW
      ctx.strokeRect(outerW / 2, outerW / 2, displayW - outerW, displayH - outerW)
      ctx.lineWidth = innerW
      const inset = outerW + gap
      ctx.strokeRect(inset + innerW / 2, inset + innerW / 2, displayW - 2 * inset - innerW, displayH - 2 * inset - innerW)
      const cLen = Math.max(6, w * 0.8)
      const cInset = outerW / 2
      ctx.lineWidth = Math.max(1, outerW * 0.6)
      const corners = [
        [cInset, cInset, 1, 1],
        [displayW - cInset, cInset, -1, 1],
        [cInset, displayH - cInset, 1, -1],
        [displayW - cInset, displayH - cInset, -1, -1],
      ]
      corners.forEach(([cx, cy, dx, dy]) => {
        ctx.beginPath()
        ctx.moveTo(cx, cy + dy * cLen)
        ctx.lineTo(cx + dx * cLen * 0.3, cy + dy * cLen * 0.3)
        ctx.lineTo(cx + dx * cLen, cy)
        ctx.stroke()
      })
      break
    }
    case 'gradient': {
      const gradT = ctx.createLinearGradient(0, 0, 0, w)
      gradT.addColorStop(0, color)
      gradT.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gradT
      ctx.fillRect(0, 0, displayW, w)

      const gradB = ctx.createLinearGradient(0, displayH, 0, displayH - w)
      gradB.addColorStop(0, color)
      gradB.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gradB
      ctx.fillRect(0, displayH - w, displayW, w)

      const gradL = ctx.createLinearGradient(0, 0, w, 0)
      gradL.addColorStop(0, color)
      gradL.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gradL
      ctx.fillRect(0, 0, w, displayH)

      const gradR = ctx.createLinearGradient(displayW, 0, displayW - w, 0)
      gradR.addColorStop(0, color)
      gradR.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gradR
      ctx.fillRect(displayW - w, 0, w, displayH)
      break
    }
  }
  ctx.restore()
}

export function EditorCanvas({ imageSrc, editState, canvasRef, isComparing, onZoomPanChange, onApplyChange, onImageReplace }) {
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [loadedSrc, setLoadedSrc] = useState(null)
  const currentStrokeRef = useRef(null)
  const touchRef = useRef({ lastDistance: 0, startPanX: 0, startPanY: 0 })
  const [containerSize, setContainerSize] = useState(null)
  const [healCursor, setHealCursor] = useState(null)
  const healingRef = useRef({ active: false, offset: null, snapshotData: null })
  const [pickerBadge, setPickerBadge] = useState(null)

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
    healSource,
    hsl,
    curves,
    colorGrade,
    splitTone,
    masks,
    filmEmulation,
    filmIntensity,
    filmGrain,
    tiltShift,
    frame,
    perspective,
    grain,
    selectiveColor,
    lightLeak,
  } = editState

  const p = perspective ?? { horizontal: 0, vertical: 0, rotation: 0 }

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

  const highlightContrast = 2 - highlights
  const shadowBrightness = shadows

  const baseFilterOps = useMemo(() => {
    if (isComparing) return []
    const presetOps = FILTER_PRESETS.find((p) => p.id === preset)?.ops || []
    const ops = []
    const br = brightness * exposure * shadowBrightness
    if (br !== 1) ops.push({ type: 'brightness', value: br })
    if (contrast * highlightContrast !== 1) ops.push({ type: 'contrast', value: contrast * highlightContrast })
    if (saturation !== 1) ops.push({ type: 'saturate', value: saturation })
    return [...ops, ...presetOps]
  }, [isComparing, preset, brightness, exposure, shadowBrightness, contrast, highlightContrast, saturation])

  const hasBaseFilters = baseFilterOps.length > 0
  const hasHSL = hsl && Object.values(hsl).some(c => c.h !== 0 || c.s !== 0 || c.l !== 0)
  const hasCurves = curves && Object.entries(curves).some(([, pts]) =>
    pts.length > 2 || (pts.length === 2 && (pts[0][0] !== 0 || pts[0][1] !== 0 || pts[1][0] !== 1 || pts[1][1] !== 1))
  )
  const hasColorGrade = colorGrade && Object.values(colorGrade).some(
    (c) => (c?.r !== 0 || c?.g !== 0 || c?.b !== 0)
  )
  const hasSplitTone = splitTone && (splitTone.highlightSat > 0 || splitTone.shadowSat > 0)
  const hasFilmEmulation = !isComparing && !!filmEmulation
  const hasTiltShift = !isComparing && tiltShift && (tiltShift.blur ?? 0) > 0
  const hasSelectiveColor = !isComparing && selectiveColor?.enabled
  const hasGrain = !isComparing && grain && (grain.amount ?? 0) > 0
  const hasLightLeak = !isComparing && lightLeak && lightLeak.type !== 'none' && (lightLeak.intensity ?? 0) > 0
  const needsPixelPass = !isComparing && (hasBaseFilters || warmth !== 0 || tint !== 0 || vibrance !== 0 || clarity !== 0 || dehaze !== 0 || hasHSL || hasCurves || hasColorGrade || hasSplitTone || hasFilmEmulation || hasSelectiveColor)

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

    const hasPerspective = (p.horizontal !== 0 || p.vertical !== 0 || p.rotation !== 0)
    const perspectiveScale = hasPerspective ? 0.88 : 1
    const scale = Math.min(containerSize.w / cw, containerSize.h / ch, 1) * perspectiveScale
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
    if (p.rotation !== 0) ctx.rotate((p.rotation * Math.PI) / 180)
    if (p.horizontal !== 0) ctx.transform(1, 0, Math.tan((p.horizontal * Math.PI) / 180), 1, 0, 0)
    if (p.vertical !== 0) ctx.transform(1, Math.tan((p.vertical * Math.PI) / 180), 0, 1, 0, 0)
    ctx.scale(scale, scale)
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
    ctx.translate(-sw / 2, -sh / 2)
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
    ctx.restore()

    if (needsPixelPass) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = imgData.data

      if (hasBaseFilters) {
        applyPixelFilters(imgData, baseFilterOps)
      }

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
        if (hasSelectiveColor) {
          const sr = d[i] / 255, sg = d[i + 1] / 255, sb = d[i + 2] / 255
          const smax = Math.max(sr, sg, sb), smin = Math.min(sr, sg, sb)
          if (smax !== smin) {
            const sdelta = smax - smin
            let sh
            if (smax === sr) sh = ((sg - sb) / sdelta + (sg < sb ? 6 : 0)) * 60
            else if (smax === sg) sh = ((sb - sr) / sdelta + 2) * 60
            else sh = ((sr - sg) / sdelta + 4) * 60

            const targetHue = selectiveColor.hue
            const range = selectiveColor.range
            let hueDiff = Math.abs(sh - targetHue)
            if (hueDiff > 180) hueDiff = 360 - hueDiff

            if (hueDiff > range) {
              const gray = Math.round((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]))
              d[i] = gray
              d[i + 1] = gray
              d[i + 2] = gray
            }
          } else {
            const gray = Math.round((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]))
            d[i] = gray
            d[i + 1] = gray
            d[i + 2] = gray
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

    if (hasGrain) {
      applyGrain(ctx, canvas.width, canvas.height, grain.amount, grain.size)
    }

    if (hasLightLeak) {
      applyLightLeak(ctx, canvas.width, canvas.height, lightLeak.type, lightLeak.intensity)
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

    if (hasTiltShift) {
      applyTiltShift(ctx, canvas.width, canvas.height, tiltShift)
    }

    if (!isComparing && frame && frame.type !== 'none' && (frame.width > 0 || frame.type === 'shadow')) {
      drawFrame(ctx, displayW, displayH, frame)
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
        if (shape.type === 'sticker' && shape.emoji) {
          const fontSize = Math.max(12, size * 0.85)
          ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(shape.emoji, 0, 0)
        } else {
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
    if (drawingMode === 'heal' && healSource) {
      const srcX = healSource.x * displayW
      const srcY = healSource.y * displayH
      const radius = (brushSize ?? 5) * 0.5

      ctx.save()
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)'
      ctx.lineWidth = 1.5

      const crossLen = Math.max(8, radius)
      ctx.beginPath()
      ctx.moveTo(srcX - crossLen, srcY)
      ctx.lineTo(srcX + crossLen, srcY)
      ctx.moveTo(srcX, srcY - crossLen)
      ctx.lineTo(srcX, srcY + crossLen)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(srcX, srcY, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    if (drawingMode === 'heal' && healCursor) {
      const curX = healCursor.x * displayW
      const curY = healCursor.y * displayH
      const radius = (brushSize ?? 5) * 0.5

      ctx.save()
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(curX, curY, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      if (healSource && healingRef.current.active) {
        const off = healingRef.current.offset
        if (off) {
          const liveSrcX = (healCursor.x + off.x) * displayW
          const liveSrcY = (healCursor.y + off.y) * displayH

          ctx.save()
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)'
          ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.arc(liveSrcX, liveSrcY, radius, 0, Math.PI * 2)
          ctx.stroke()

          ctx.beginPath()
          ctx.moveTo(liveSrcX, liveSrcY)
          ctx.lineTo(curX, curY)
          ctx.stroke()
          ctx.restore()
        }
      }
    }
    }
  }, [rotation, flipH, flipV, cropRatio, customCrop, baseFilterOps, hasBaseFilters, needsPixelPass, warmth, tint, vibrance, clarity, dehaze, vignette, masks, canvasRef, textOverlays, shapeOverlays, layerVisibility, containerSize, brushStrokes, isComparing, hasHSL, hsl, hasCurves, curves, colorGrade, splitTone, hasColorGrade, hasSplitTone, hasFilmEmulation, filmEmulation, filmIntensity, filmGrain, drawingMode, healSource, healCursor, brushSize, hasTiltShift, tiltShift, frame, p.horizontal, p.vertical, p.rotation, hasGrain, grain, hasLightLeak, lightLeak, hasSelectiveColor, selectiveColor])

  const throttledDraw = useThrottledDraw(drawCanvas, 32)

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current
    if (img) setImageDims({ w: img.naturalWidth, h: img.naturalHeight })
    setLoadedSrc(imageSrc)
    throttledDraw()
  }, [throttledDraw, imageSrc])

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

  const applyHealBrush = useCallback((destX, destY, srcOffX, srcOffY, size) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const cw = canvas.width
    const ch = canvas.height
    const rect = canvas.getBoundingClientRect()

    const dxPx = Math.round(destX * rect.width * dpr)
    const dyPx = Math.round(destY * rect.height * dpr)
    const sxPx = Math.round((destX + srcOffX) * rect.width * dpr)
    const syPx = Math.round((destY + srcOffY) * rect.height * dpr)
    const radius = Math.round(size * 0.5 * dpr)

    const snap = healingRef.current.snapshotData
    if (!snap) return
    const sw = snap.width
    const sh = snap.height
    const sd = snap.data

    const region = radius + 2
    const x0 = Math.max(0, dxPx - region)
    const y0 = Math.max(0, dyPx - region)
    const x1 = Math.min(cw, dxPx + region)
    const y1 = Math.min(ch, dyPx + region)
    if (x1 <= x0 || y1 <= y0) return

    const imgData = ctx.getImageData(x0, y0, x1 - x0, y1 - y0)
    const d = imgData.data
    const w = imgData.width

    const r2 = radius * radius

    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const ddx = px - dxPx
        const ddy = py - dyPx
        const dist2 = ddx * ddx + ddy * ddy
        if (dist2 > r2) continue

        const spx = sxPx + ddx
        const spy = syPx + ddy
        if (spx < 0 || spx >= sw || spy < 0 || spy >= sh) continue

        const falloff = 1 - Math.sqrt(dist2) / radius
        const alpha = falloff * falloff * 0.7

        const si = (spy * sw + spx) * 4
        const di = ((py - y0) * w + (px - x0)) * 4

        d[di] = Math.round(d[di] * (1 - alpha) + sd[si] * alpha)
        d[di + 1] = Math.round(d[di + 1] * (1 - alpha) + sd[si + 1] * alpha)
        d[di + 2] = Math.round(d[di + 2] * (1 - alpha) + sd[si + 2] * alpha)
      }
    }

    ctx.putImageData(imgData, x0, y0)
  }, [canvasRef])

  const handlePickColor = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const cx = Math.round((e.clientX - rect.left) * dpr * (canvas.width / (rect.width * dpr)))
    const cy = Math.round((e.clientY - rect.top) * dpr * (canvas.height / (rect.height * dpr)))
    const ctx = canvas.getContext('2d')
    const pixel = ctx.getImageData(cx, cy, 1, 1).data
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(c => c.toString(16).padStart(2, '0')).join('')
    navigator.clipboard?.writeText(hex).catch(() => {})
    onApplyChange?.((s) => ({ ...s, pickedColor: hex }))
    setPickerBadge({ x: e.clientX - rect.left, y: e.clientY - rect.top, color: hex })
    setTimeout(() => setPickerBadge(null), 2000)
  }, [canvasRef, onApplyChange])

  const handleMouseDown = useCallback(
    (e) => {
      if (drawingMode === 'picker') {
        handlePickColor(e)
        return
      }
      if (drawingMode === 'heal') {
        const pt = getCanvasPoint(e)
        if (!pt) return

        if (!healSource) {
          onApplyChange?.((s) => ({ ...s, healSource: pt }))
          return
        }

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        healingRef.current.snapshotData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        healingRef.current.offset = { x: healSource.x - pt.x, y: healSource.y - pt.y }
        healingRef.current.active = true
        setIsDrawing(true)

        applyHealBrush(pt.x, pt.y, healingRef.current.offset.x, healingRef.current.offset.y, brushSize)
        return
      }
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
      }
    },
    [drawingMode, brushColor, brushSize, brushOpacity, getCanvasPoint, healSource, onApplyChange, canvasRef, applyHealBrush, handlePickColor],
  )

  const handleMouseMove = useCallback(
    (e) => {
      if (drawingMode === 'heal') {
        const pt = getCanvasPoint(e)
        if (pt) setHealCursor(pt)

        if (isDrawing && healingRef.current.active) {
          if (!pt) return
          applyHealBrush(pt.x, pt.y, healingRef.current.offset.x, healingRef.current.offset.y, brushSize)
          throttledDraw()
          return
        }
      }
      if (isDrawing && currentStrokeRef.current) {
        const pt = getCanvasPoint(e)
        if (!pt) return
        currentStrokeRef.current = {
          ...currentStrokeRef.current,
          points: [...currentStrokeRef.current.points, pt],
        }
        throttledDraw()
      }
    },
    [isDrawing, getCanvasPoint, throttledDraw, drawingMode, brushSize, applyHealBrush],
  )

  const handleMouseUp = useCallback(() => {
    if (isDrawing && healingRef.current.active) {
      healingRef.current.active = false
      healingRef.current.snapshotData = null
      setIsDrawing(false)

      const canvas = canvasRef.current
      if (canvas && onImageReplace) {
        onImageReplace(canvas.toDataURL('image/png'))
      }
      return
    }
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
  }, [isDrawing, onApplyChange, canvasRef, onImageReplace])

  // --- Touch event handlers (single-finger: drawing only, two-finger: pinch zoom) ---

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1 && drawingMode) {
      e.preventDefault()
      const touch = e.touches[0]
      const pt = getCanvasPointFromTouch(touch)
      if (!pt) return

      if (drawingMode === 'picker') {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        const cx = Math.round((touch.clientX - rect.left) * dpr * (canvas.width / (rect.width * dpr)))
        const cy = Math.round((touch.clientY - rect.top) * dpr * (canvas.height / (rect.height * dpr)))
        const ctx = canvas.getContext('2d')
        const pixel = ctx.getImageData(cx, cy, 1, 1).data
        const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(c => c.toString(16).padStart(2, '0')).join('')
        navigator.clipboard?.writeText(hex).catch(() => {})
        onApplyChange?.((s) => ({ ...s, pickedColor: hex }))
        setPickerBadge({ x: touch.clientX - rect.left, y: touch.clientY - rect.top, color: hex })
        setTimeout(() => setPickerBadge(null), 2000)
        return
      }

      if (drawingMode === 'heal') {
        setHealCursor(pt)
        if (!healSource) {
          onApplyChange?.((s) => ({ ...s, healSource: pt }))
          return
        }
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        healingRef.current.snapshotData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        healingRef.current.offset = { x: healSource.x - pt.x, y: healSource.y - pt.y }
        healingRef.current.active = true
        setIsDrawing(true)
        applyHealBrush(pt.x, pt.y, healingRef.current.offset.x, healingRef.current.offset.y, brushSize)
        return
      }

      setIsDrawing(true)
      currentStrokeRef.current = {
        points: [pt],
        color: drawingMode === 'eraser' ? '#000000' : brushColor,
        size: brushSize,
        opacity: brushOpacity,
        tool: drawingMode,
      }
    } else if (e.touches.length === 2) {
      e.preventDefault()
      setIsDrawing(false)
      currentStrokeRef.current = null
      healingRef.current.active = false
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchRef.current.lastDistance = Math.sqrt(dx * dx + dy * dy)
      touchRef.current.startPanX = panX
      touchRef.current.startPanY = panY
    }
  }, [drawingMode, brushColor, brushSize, brushOpacity, panX, panY, getCanvasPointFromTouch, healSource, onApplyChange, canvasRef, applyHealBrush])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1 && isDrawing && healingRef.current.active) {
      e.preventDefault()
      const touch = e.touches[0]
      const pt = getCanvasPointFromTouch(touch)
      if (!pt) return
      setHealCursor(pt)
      applyHealBrush(pt.x, pt.y, healingRef.current.offset.x, healingRef.current.offset.y, brushSize)
      throttledDraw()
    } else if (e.touches.length === 1 && isDrawing && currentStrokeRef.current) {
      e.preventDefault()
      const touch = e.touches[0]
      const pt = getCanvasPointFromTouch(touch)
      if (!pt) return
      currentStrokeRef.current = {
        ...currentStrokeRef.current,
        points: [...currentStrokeRef.current.points, pt],
      }
      throttledDraw()
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
  }, [isDrawing, zoom, panX, panY, onZoomPanChange, getCanvasPointFromTouch, throttledDraw, brushSize, applyHealBrush])

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      if (isDrawing && healingRef.current.active) {
        healingRef.current.active = false
        healingRef.current.snapshotData = null
        setIsDrawing(false)
        const canvas = canvasRef.current
        if (canvas && onImageReplace) {
          onImageReplace(canvas.toDataURL('image/png'))
        }
        return
      }
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
      touchRef.current.lastDistance = 0
    } else if (e.touches.length === 1) {
      touchRef.current.lastDistance = 0
    }
  }, [isDrawing, onApplyChange, canvasRef, onImageReplace])

  const handleContainerMouseMove = useCallback((e) => {
    if (drawingMode === 'heal' && !isDrawing) {
      const pt = getCanvasPoint(e)
      if (pt) setHealCursor(pt)
      throttledDraw()
    }
  }, [drawingMode, isDrawing, getCanvasPoint, throttledDraw])

  const handleMouseLeave = useCallback(() => {
    if (drawingMode === 'heal') {
      setHealCursor(null)
      throttledDraw()
    }
  }, [drawingMode, throttledDraw])

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
      className="min-w-0 flex-1 min-h-0 relative bg-zinc-900/50 lg:rounded-xl p-2 pb-16 lg:p-4 lg:pb-4 overflow-hidden flex items-center justify-center touch-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: drawingMode === 'picker' ? 'crosshair' : drawingMode === 'heal' ? (healSource ? 'cell' : 'crosshair') : drawingMode ? 'crosshair' : 'default' }}
    >
      {loadedSrc !== imageSrc && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-zinc-800 animate-pulse" />
            <div className="animate-spin w-6 h-6 border-2 border-zinc-600 border-t-amber-500 rounded-full mx-auto mb-2" />
            <p className="text-xs text-zinc-500">Preparing canvas...</p>
          </div>
        </div>
      )}
      <div
        className="flex-shrink-0 relative"
        style={{
          transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
          opacity: loadedSrc === imageSrc ? 1 : 0,
          transition: 'opacity 0.2s ease-in',
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
        {pickerBadge && (
          <div
            className="absolute z-20 pointer-events-none flex items-center gap-1.5 rounded-full px-2.5 py-1 shadow-lg border border-zinc-600 text-xs font-mono animate-fade-in"
            style={{
              left: pickerBadge.x + 12,
              top: pickerBadge.y - 36,
              background: '#1a1a1a',
              color: '#e4e4e7',
            }}
          >
            <span
              className="inline-block w-4 h-4 rounded-full border border-zinc-500"
              style={{ background: pickerBadge.color }}
            />
            {pickerBadge.color}
          </div>
        )}
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
