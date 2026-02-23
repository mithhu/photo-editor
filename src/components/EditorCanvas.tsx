import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { FILTER_PRESETS } from '../constants'
import { getCropRegion } from '../utils/cropUtils'
import { CropOverlay } from './CropOverlay'
import { useThrottledDraw } from '../hooks/useThrottledDraw'
import { applyLightLeak } from '../utils/lightLeaks'
import { renderWithWebGL } from '../utils/webglRenderer'
import { magicWandSelect, drawSelectionOverlay } from '../utils/magicWand'
import { hasActiveBeauty, hasActiveReshape, hasActiveMakeup, hasActiveEmotion, hasActiveAge, invalidateFaceCache, runBeautyPipeline } from '../utils/beautyPipeline'
import type {
  EditState,
  TextOverlay,
  ShapeOverlay,
  Frame,
  BrushStroke,
} from '../types'

interface EditorCanvasProps {
  imageSrc: string
  editState: EditState
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  isComparing: boolean
  onZoomPanChange: ((val: { zoom: number; panX: number; panY: number }) => void) | null
  onApplyChange: ((updater: (s: EditState) => EditState) => void) | null
  onImageReplace: ((dataUrl: string) => void) | null
  onBeautyProcessingChange?: ((processing: boolean) => void) | null
}

interface InlineTextEditorProps {
  textOverlays: TextOverlay[] | undefined
  editingTextId: string | null
  onSave: (value: string) => void
  onCancel: () => void
}

interface CanvasPoint {
  x: number
  y: number
}

interface DragState {
  type: 'text' | 'shape'
  id: string | number
  offsetX: number
  offsetY: number
  resizing?: boolean
  initDist?: number
  initSize?: number
  sizeKey?: string
  stateKey?: string
}

interface HealingState {
  active: boolean
  offset: { x: number; y: number } | null
  snapshotData: ImageData | null
}

interface TouchState {
  lastDistance: number
  startPanX: number
  startPanY: number
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  displayW: number,
  displayH: number,
  frame: Frame,
): void {
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
      const corners: [number, number, number, number][] = [
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

function InlineTextEditor({ textOverlays, editingTextId, onSave, onCancel }: InlineTextEditorProps) {
  const t = textOverlays?.find((o) => o.id === editingTextId)
  if (!t) return null
  const fontSize = t.fontSize ?? 32
  return (
    <div
      className="absolute z-30"
      style={{
        left: `${(t.x ?? 0.5) * 100}%`,
        top: `${(t.y ?? 0.5) * 100}%`,
        transform: `translate(-50%, -50%)${t.rotation ? ` rotate(${t.rotation}deg)` : ''}`,
      }}
    >
      <input
        autoFocus
        type="text"
        defaultValue={t.text || 'Text'}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => onSave(e.target.value.trim())}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') onCancel()
        }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
        onTouchStart={(e: React.TouchEvent) => e.stopPropagation()}
        className="bg-black/60 backdrop-blur-sm border-2 border-indigo-500 rounded-lg px-3 py-1.5 text-center outline-none shadow-lg shadow-indigo-500/20"
        style={{
          color: t.color ?? '#ffffff',
          fontSize: `${Math.min(fontSize, 48)}px`,
          fontFamily: t.fontFamily || 'sans-serif',
          fontWeight: t.fontWeight === 'bold' ? 'bold' : 'normal',
          fontStyle: t.fontStyle === 'italic' ? 'italic' : 'normal',
          minWidth: '80px',
          caretColor: '#818cf8',
        }}
      />
    </div>
  )
}

export function EditorCanvas({ imageSrc, editState, canvasRef, isComparing, onZoomPanChange, onApplyChange, onImageReplace, onBeautyProcessingChange }: EditorCanvasProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const currentStrokeRef = useRef<BrushStroke | null>(null)
  const touchRef = useRef<TouchState>({ lastDistance: 0, startPanX: 0, startPanY: 0 })
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null)
  const [healCursor, setHealCursor] = useState<CanvasPoint | null>(null)
  const healingRef = useRef<HealingState>({ active: false, offset: null, snapshotData: null })
  const [pickerBadge, setPickerBadge] = useState<{ x: number; y: number; color: string } | null>(null)
  const draggingRef = useRef<DragState | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const dragMovedRef = useRef<boolean>(false)
  const lastTapRef = useRef<number>(0)
  const workerRef = useRef<Worker | null>(null)
  const workerBusyRef = useRef<boolean>(false)
  const workerPendingRef = useRef<boolean>(false)
  const workerDoneRef = useRef<boolean>(false)
  const redrawRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/pixelWorker.ts', import.meta.url),
      { type: 'module' }
    )
    return () => { workerRef.current?.terminate(); workerRef.current = null }
  }, [])

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
    lut,
    resize,
    gradientMap,
    chromaticAberration,
    sharpen,
    glitch,
    oilPaint,
    posterize,
    solarize,
    emboss,
    channelMixer,
    selectionMask,
    wandTolerance,
    beauty,
    faceReshape,
    makeup,
    emotion,
    ageTransform,
  } = editState

  const p = perspective ?? { horizontal: 0, vertical: 0, rotation: 0 }

  const cropActive = cropRatio !== 'original'
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null)

  const cropOverlayRegion = useMemo(() => {
    if (!cropActive) return null
    if (customCrop && customCrop.w > 0 && customCrop.h > 0) {
      return { x: customCrop.x, y: customCrop.y, w: customCrop.w, h: customCrop.h }
    }
    if (!imageDims) return null
    const { sx, sy, sw, sh } = getCropRegion(imageDims.w, imageDims.h, cropRatio)
    return { x: sx / imageDims.w, y: sy / imageDims.h, w: sw / imageDims.w, h: sh / imageDims.h }
  }, [cropActive, cropRatio, customCrop, imageDims])

  const handleCropChange = useCallback((region: { x: number; y: number; w: number; h: number }) => {
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
    const presetOps = FILTER_PRESETS.find((pp) => pp.id === preset)?.ops || []
    const ops: { type: string; value: number }[] = []
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
  const hasLUT = !isComparing && !!lut
  const hasGradientMap = !isComparing && gradientMap?.enabled
  const hasResize = !isComparing && resize && (resize.width > 0 || resize.height > 0)
  const hasChromaticAberration = !isComparing && (chromaticAberration ?? 0) > 0
  const hasSharpen = !isComparing && (sharpen ?? 0) > 0
  const hasGlitch = !isComparing && (glitch ?? 0) > 0
  const hasOilPaint = !isComparing && (oilPaint ?? 0) > 0
  const hasPosterize = !isComparing && (posterize ?? 0) >= 2
  const hasSolarize = !isComparing && (solarize ?? 0) > 0
  const hasEmboss = !isComparing && (emboss ?? 0) > 0
  const hasChannelMixer = !isComparing && channelMixer && (channelMixer.red.r !== 100 || channelMixer.red.g !== 0 || channelMixer.red.b !== 0 || channelMixer.green.r !== 0 || channelMixer.green.g !== 100 || channelMixer.green.b !== 0 || channelMixer.blue.r !== 0 || channelMixer.blue.g !== 0 || channelMixer.blue.b !== 100)
  const needsPixelPass = !isComparing && (hasBaseFilters || warmth !== 0 || tint !== 0 || vibrance !== 0 || clarity !== 0 || dehaze !== 0 || hasHSL || hasCurves || hasColorGrade || hasSplitTone || hasFilmEmulation || hasSelectiveColor || hasLUT || hasGradientMap || hasChromaticAberration || hasSharpen || hasGlitch || hasOilPaint || hasPosterize || hasSolarize || hasEmboss || hasChannelMixer || vignette > 0 || hasGrain || filmGrain > 0 || hasTiltShift)

  const drawPostPixel = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, displayW: number, displayH: number) => {
    if (hasLightLeak) {
      applyLightLeak(ctx, canvas.width, canvas.height, lightLeak.type, lightLeak.intensity)
    }
    const hasMasks = !isComparing && masks?.length > 0
    if (hasMasks) {
      const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const md = maskData.data
      for (let i = 0; i < md.length; i += 4) {
        const pixelIndex = i / 4
        const px = (pixelIndex % canvas.width) / canvas.width
        const py = Math.floor(pixelIndex / canvas.width) / canvas.height
        ;(masks as Record<string, unknown>[]).forEach((mask) => {
          let weight = 0
          if (mask.type === 'radial') {
            const dx = (px - ((mask.centerX as number) ?? 0.5)) / (((mask.radiusX as number) ?? 0.3) || 0.3)
            const dy = (py - ((mask.centerY as number) ?? 0.5)) / (((mask.radiusY as number) ?? 0.3) || 0.3)
            const dist = Math.sqrt(dx * dx + dy * dy)
            const feather = (mask.feather as number) ?? 0.5
            weight = 1 - Math.min(1, Math.max(0, (dist - (1 - feather)) / feather))
          } else if (mask.type === 'linear') {
            const dx = ((mask.endX as number) ?? 1) - ((mask.startX as number) ?? 0)
            const dy = ((mask.endY as number) ?? 0.5) - ((mask.startY as number) ?? 0.5)
            const len = Math.sqrt(dx * dx + dy * dy) || 0.001
            const t = ((px - ((mask.startX as number) ?? 0)) * dx + (py - ((mask.startY as number) ?? 0.5)) * dy) / (len * len)
            weight = Math.min(1, Math.max(0, t))
          }
          if (mask.invert) weight = 1 - weight
          if (weight <= 0) return
          const br = ((mask.brightness as number) ?? 0) * weight * 60
          const ct = 1 + ((mask.contrast as number) ?? 0) * weight * 0.5
          const st = 1 + ((mask.saturation as number) ?? 0) * weight * 0.5
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
    if (!isComparing && frame && frame.type !== 'none' && (frame.width > 0 || frame.type === 'shadow')) {
      drawFrame(ctx, displayW, displayH, frame)
    }
  }, [isComparing, hasLightLeak, lightLeak, masks, frame])

  const displaySizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || !img.complete || !containerSize) return

    const ctx = canvas.getContext('2d')!
    let displayW: number, displayH: number

    const skipPixelProcessing = workerDoneRef.current
    if (skipPixelProcessing) {
      workerDoneRef.current = false
      displayW = displaySizeRef.current.w
      displayH = displaySizeRef.current.h
    } else {
      const dpr = window.devicePixelRatio || 1
      const w = img.naturalWidth
      const h = img.naturalHeight

      let sx: number, sy: number, sw: number, sh: number
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
      const availW = containerSize.w - 8
      const availH = containerSize.h - 8
      const scale = Math.min(availW / cw, availH / ch, 1) * perspectiveScale
      displayW = cw * scale
      displayH = ch * scale
      displaySizeRef.current = { w: displayW, h: displayH }

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

      const beautyCanvas = beautyResultRef.current
      if (beautyCanvas) {
        const bScale = beautyCanvas.width / w
        const bsx = sx * bScale
        const bsy = sy * bScale
        const bsw = sw * bScale
        const bsh = sh * bScale
        ctx.drawImage(beautyCanvas, bsx, bsy, bsw, bsh, 0, 0, sw, sh)
      }

      ctx.restore()

    const needsWorker = hasOilPaint || hasGlitch || hasLUT

    if (needsPixelPass) {
      const presetOps = (!isComparing && preset !== 'none') ? (FILTER_PRESETS.find((pp) => pp.id === preset)?.ops || []) : []

      const glResult = renderWithWebGL(canvas, {
        brightness: brightness * exposure * shadows,
        contrast: contrast * (2 - highlights),
        saturation,
        warmth,
        tint,
        vibrance,
        clarity,
        dehaze,
        filterOps: presetOps,
        hsl: hasHSL ? hsl : undefined,
        curves: hasCurves ? curves : undefined,
        colorGrade: hasColorGrade ? colorGrade : undefined,
        splitTone: hasSplitTone ? splitTone : undefined,
        selectiveColor: hasSelectiveColor ? selectiveColor : undefined,
        filmEmulation: hasFilmEmulation ? filmEmulation : undefined,
        filmIntensity: filmIntensity ?? 1,
        posterize: hasPosterize ? posterize : 0,
        solarize: hasSolarize ? solarize : 0,
        channelMixer: hasChannelMixer ? channelMixer : undefined,
        gradientMap: hasGradientMap ? gradientMap : undefined,
        chromaticAberration: hasChromaticAberration ? chromaticAberration : 0,
        sharpen: hasSharpen ? sharpen : 0,
        emboss: hasEmboss ? emboss : 0,
        vignette: !isComparing ? vignette : 0,
        grain: hasGrain ? grain : undefined,
        filmGrain: (!isComparing && filmGrain > 0) ? filmGrain : 0,
        tiltShift: hasTiltShift ? tiltShift : undefined,
      })

      if (glResult) {
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(glResult, 0, 0)
        ctx.restore()
      }
    }

    if (needsWorker) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      if (workerRef.current && !workerBusyRef.current) {
        workerBusyRef.current = true
        const buffer = imgData.data.buffer.slice(0)
        const cw = canvas.width, ch = canvas.height

        const postState = { ctx, canvas, displayW, displayH, cw, ch }

        workerRef.current.onmessage = (evt: MessageEvent) => {
          workerBusyRef.current = false
          if (evt.data.type === 'pixelsProcessed') {
            const result = new Uint8ClampedArray(evt.data.data)
            const outData = new ImageData(result, evt.data.width, evt.data.height)
            const c = canvasRef.current
            if (c && c.width === evt.data.width && c.height === evt.data.height) {
              const cx = c.getContext('2d')!
              cx.putImageData(outData, 0, 0)
              drawPostPixel(cx, c, postState.displayW, postState.displayH)
            }
          }
          workerDoneRef.current = true
          if (workerPendingRef.current) {
            workerPendingRef.current = false
          }
          redrawRef.current?.()
        }

        workerRef.current.postMessage(
          {
            type: 'processPixels', data: buffer, width: cw, height: ch,
            params: {
              glitch: hasGlitch ? glitch : 0,
              oilPaint: hasOilPaint ? oilPaint : 0,
              lut: hasLUT ? lut : null,
            },
          },
          [buffer]
        )

        drawPostPixel(ctx, canvas, displayW, displayH)
      } else if (workerBusyRef.current) {
        workerPendingRef.current = true
        drawPostPixel(ctx, canvas, displayW, displayH)
      }
    } else if (!needsPixelPass) {
      drawPostPixel(ctx, canvas, displayW, displayH)
    } else {
      drawPostPixel(ctx, canvas, displayW, displayH)
    }
    } // end of else (!skipPixelProcessing)

    if (!isComparing) {
    const allStrokes = currentStrokeRef.current
      ? [...(brushStrokes || []), currentStrokeRef.current]
      : (brushStrokes || [])

    if (allStrokes.length) {
      allStrokes.forEach((stroke) => {
        if (!stroke.points || stroke.points.length < 2) return
        ctx.save()
        ctx.globalAlpha = stroke.opacity ?? 1

        if (stroke.tool === 'blur') {
          const radius = Math.max(2, Math.round((stroke.size ?? 5) * 0.5))
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const d = imgData.data
          const w = canvas.width, h = canvas.height

          const affected = new Uint8Array(w * h)
          for (let pi = 0; pi < stroke.points.length; pi++) {
            const px = Math.round(stroke.points[pi].x * displayW)
            const py = Math.round(stroke.points[pi].y * displayH)
            const r2 = radius * radius
            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > r2) continue
                const nx = px + dx, ny = py + dy
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                  affected[ny * w + nx] = 1
                }
              }
            }
          }

          const out = new Uint8ClampedArray(d)
          const br = Math.max(1, Math.round(radius * 0.4))
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              if (!affected[y * w + x]) continue
              let rr = 0, gg = 0, bb = 0, count = 0
              for (let dy = -br; dy <= br; dy++) {
                const ny = y + dy
                if (ny < 0 || ny >= h) continue
                for (let dx = -br; dx <= br; dx++) {
                  const nx = x + dx
                  if (nx < 0 || nx >= w) continue
                  const si = (ny * w + nx) * 4
                  rr += d[si]; gg += d[si + 1]; bb += d[si + 2]
                  count++
                }
              }
              const di = (y * w + x) * 4
              const alpha = stroke.opacity ?? 1
              out[di] = Math.round(d[di] * (1 - alpha) + (rr / count) * alpha)
              out[di + 1] = Math.round(d[di + 1] * (1 - alpha) + (gg / count) * alpha)
              out[di + 2] = Math.round(d[di + 2] * (1 - alpha) + (bb / count) * alpha)
            }
          }

          const outData = new ImageData(out, w, h)
          ctx.putImageData(outData, 0, 0)
          ctx.restore()
          return
        }

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
      shapeOverlays.forEach((shape: ShapeOverlay) => {
        if (layerVisibility?.[shape.id] === false) return
        const cx = (shape.x ?? 0.5) * displayW
        const cy = (shape.y ?? 0.5) * displayH
        const size = shape.size ?? 40
        const color = shape.color ?? '#ffffff'
        const rot = ((shape.rotation ?? 0) * Math.PI) / 180
        ctx.save()
        ctx.globalAlpha = shape.opacity ?? 1
        if (shape.blendMode && shape.blendMode !== 'normal') ctx.globalCompositeOperation = shape.blendMode as GlobalCompositeOperation
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
        if (t.blendMode && t.blendMode !== 'normal') ctx.globalCompositeOperation = t.blendMode as GlobalCompositeOperation
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

    if (selectionMask && drawingMode === 'wand') {
      drawSelectionOverlay(ctx, selectionMask, canvas.width, canvas.height)
    }

    if (hasResize) {
      const targetW = resize.width
      const targetH = resize.height
      if (targetW > 0 && targetH > 0) {
        const tmpCanvas = document.createElement('canvas')
        tmpCanvas.width = canvas.width
        tmpCanvas.height = canvas.height
        tmpCanvas.getContext('2d')!.drawImage(canvas, 0, 0)

        const resizeDpr = window.devicePixelRatio || 1
        canvas.width = targetW * resizeDpr
        canvas.height = targetH * resizeDpr
        canvas.style.width = targetW + 'px'
        canvas.style.height = targetH + 'px'
        const rCtx = canvas.getContext('2d')!
        rCtx.imageSmoothingEnabled = true
        rCtx.imageSmoothingQuality = 'high'
        rCtx.drawImage(tmpCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height, 0, 0, canvas.width, canvas.height)
      }
    }
  }, [rotation, flipH, flipV, cropRatio, customCrop, needsPixelPass, warmth, tint, vibrance, clarity, dehaze, canvasRef, textOverlays, shapeOverlays, layerVisibility, containerSize, brushStrokes, isComparing, hasHSL, hsl, hasCurves, curves, colorGrade, splitTone, hasColorGrade, hasSplitTone, hasFilmEmulation, filmEmulation, filmIntensity, drawingMode, healSource, healCursor, brushSize, p.horizontal, p.vertical, p.rotation, hasSelectiveColor, selectiveColor, hasLUT, lut, hasResize, resize, hasGradientMap, gradientMap, hasChromaticAberration, chromaticAberration, hasSharpen, sharpen, hasGlitch, glitch, hasOilPaint, oilPaint, hasPosterize, posterize, hasSolarize, solarize, hasEmboss, emboss, hasChannelMixer, channelMixer, drawPostPixel, brightness, contrast, saturation, exposure, highlights, shadows, vignette, selectionMask, preset, hasGrain, grain, filmGrain, hasTiltShift, tiltShift])

  const beautyResultRef = useRef<HTMLCanvasElement | null>(null)
  const beautyRunIdRef = useRef<number>(0)

  const throttledDraw = useThrottledDraw(drawCanvas, 32)

  useEffect(() => { redrawRef.current = throttledDraw }, [throttledDraw])

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current
    if (img) setImageDims({ w: img.naturalWidth, h: img.naturalHeight })
    setLoadedSrc(imageSrc)
    beautyResultRef.current = null
    beautyRunIdRef.current++
    invalidateFaceCache()
    throttledDraw()
  }, [throttledDraw, imageSrc])

  useEffect(() => {
    throttledDraw()
  }, [throttledDraw, imageSrc])

  const hasBeautyEffect = hasActiveBeauty(beauty) || hasActiveReshape(faceReshape) || hasActiveMakeup(makeup) || hasActiveEmotion(emotion) || hasActiveAge(ageTransform)
  const [beautyProcessing, setBeautyProcessing] = useState<boolean>(false)

  useEffect(() => {
    onBeautyProcessingChange?.(beautyProcessing)
  }, [beautyProcessing, onBeautyProcessingChange])

  useEffect(() => {
    if (!hasBeautyEffect) {
      const hadResult = beautyResultRef.current !== null
      beautyResultRef.current = null
      beautyRunIdRef.current++
      setBeautyProcessing(false)
      if (hadResult) redrawRef.current?.()
      return
    }

    const myRunId = ++beautyRunIdRef.current
    setBeautyProcessing(true)

    let cancelled = false
    ;(async () => {
      const img = imageRef.current
      if (!img || !img.complete || img.naturalWidth === 0) {
        if (!cancelled) setBeautyProcessing(false)
        return
      }

      try {
        await new Promise<void>(r => setTimeout(r, 0))
        if (cancelled) return

        const result = await runBeautyPipeline(img, beauty, faceReshape, makeup, emotion, ageTransform)

        if (cancelled || beautyRunIdRef.current !== myRunId) return

        if (result) {
          beautyResultRef.current = result.canvas
          redrawRef.current?.()
        }
      } catch {
        // Face detection may fail — no face in image, or model loading issue
      } finally {
        if (!cancelled && beautyRunIdRef.current === myRunId) {
          setBeautyProcessing(false)
        }
      }
    })()

    return () => { cancelled = true }
  }, [hasBeautyEffect, beauty, faceReshape, makeup, emotion, ageTransform])

  const getCanvasPoint = useCallback((e: MouseEvent | React.MouseEvent): CanvasPoint | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }, [canvasRef])

  const getCanvasPointFromTouch = useCallback((touch: React.Touch | Touch): CanvasPoint | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: (touch.clientX - rect.left) / rect.width,
      y: (touch.clientY - rect.top) / rect.height,
    }
  }, [canvasRef])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      if (!onZoomPanChange) return
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.5, Math.min(4, zoom + delta))
      onZoomPanChange({ zoom: newZoom, panX, panY })
    },
    [zoom, panX, panY, onZoomPanChange],
  )

  const applyHealBrush = useCallback((destX: number, destY: number, srcOffX: number, srcOffY: number, size: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
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

  const hitTestOverlay = useCallback((pt: CanvasPoint): DragState | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const displayW = canvas.width
    const displayH = canvas.height

    if (textOverlays?.length) {
      for (let i = textOverlays.length - 1; i >= 0; i--) {
        const t = textOverlays[i]
        if (layerVisibility?.[t.id] === false) continue
        const tx = t.x ?? 0.5
        const ty = t.y ?? 0.5
        const fontSize = t.fontSize ?? 32
        const hitW = Math.max(60, fontSize * (t.text?.length || 4) * 0.6) / displayW
        const hitH = Math.max(40, fontSize * 1.4) / displayH
        if (Math.abs(pt.x - tx) < hitW / 2 && Math.abs(pt.y - ty) < hitH / 2) {
          return { type: 'text', id: t.id, offsetX: pt.x - tx, offsetY: pt.y - ty }
        }
      }
    }

    if (shapeOverlays?.length) {
      for (let i = shapeOverlays.length - 1; i >= 0; i--) {
        const s = shapeOverlays[i]
        if (layerVisibility?.[s.id] === false) continue
        const sx = s.x ?? 0.5
        const sy = s.y ?? 0.5
        const size = (s.size ?? 40) / displayW
        const hitR = Math.max(size, 30 / displayW)
        if (Math.abs(pt.x - sx) < hitR && Math.abs(pt.y - sy) < hitR) {
          return { type: 'shape', id: s.id, offsetX: pt.x - sx, offsetY: pt.y - sy }
        }
      }
    }

    return null
  }, [canvasRef, textOverlays, shapeOverlays, layerVisibility])

  const handlePickColor = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const cx = Math.round((e.clientX - rect.left) * dpr * (canvas.width / (rect.width * dpr)))
    const cy = Math.round((e.clientY - rect.top) * dpr * (canvas.height / (rect.height * dpr)))
    const ctx = canvas.getContext('2d')!
    const pixel = ctx.getImageData(cx, cy, 1, 1).data
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(c => c.toString(16).padStart(2, '0')).join('')
    navigator.clipboard?.writeText(hex).catch(() => {})
    onApplyChange?.((s) => ({ ...s, pickedColor: hex }))
    setPickerBadge({ x: e.clientX - rect.left, y: e.clientY - rect.top, color: hex })
    setTimeout(() => setPickerBadge(null), 2000)
  }, [canvasRef, onApplyChange])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (editingTextId) setEditingTextId(null)

      if (drawingMode === 'picker') {
        handlePickColor(e)
        return
      }
      if (drawingMode === 'wand') {
        const pt = getCanvasPoint(e)
        if (!pt) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const sx = Math.round(pt.x * canvas.width)
        const sy = Math.round(pt.y * canvas.height)
        const mask = magicWandSelect(imgData, sx, sy, wandTolerance ?? 32, true)
        onApplyChange?.((s) => ({ ...s, selectionMask: mask }))
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
        const ctx = canvas.getContext('2d')!
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
        return
      }

      const pt = getCanvasPoint(e)
      if (!pt) return
      const hit = hitTestOverlay(pt)
      if (hit) {
        e.preventDefault()
        draggingRef.current = hit
        dragMovedRef.current = false
      }
    },
    [drawingMode, brushColor, brushSize, brushOpacity, getCanvasPoint, healSource, onApplyChange, canvasRef, applyHealBrush, handlePickColor, hitTestOverlay, editingTextId, wandTolerance],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (drawingMode === 'heal') {
        const pt = getCanvasPoint(e)
        if (pt) setHealCursor(pt)

        if (isDrawing && healingRef.current.active) {
          if (!pt) return
          applyHealBrush(pt.x, pt.y, healingRef.current.offset!.x, healingRef.current.offset!.y, brushSize)
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
        return
      }

      if (draggingRef.current && onApplyChange) {
        dragMovedRef.current = true
        const pt = getCanvasPoint(e)
        if (!pt) return
        const d = draggingRef.current
        const newX = Math.max(0, Math.min(1, pt.x - d.offsetX))
        const newY = Math.max(0, Math.min(1, pt.y - d.offsetY))
        if (d.type === 'text') {
          onApplyChange((s) => ({
            ...s,
            textOverlays: (s.textOverlays || []).map((item) =>
              item.id === d.id ? { ...item, x: newX, y: newY } : item
            ),
          }))
        } else {
          onApplyChange((s) => ({
            ...s,
            shapeOverlays: (s.shapeOverlays || []).map((item) =>
              item.id === d.id ? { ...item, x: newX, y: newY } : item
            ),
          }))
        }
      }
    },
    [isDrawing, getCanvasPoint, throttledDraw, drawingMode, brushSize, applyHealBrush, onApplyChange],
  )

  const handleMouseUp = useCallback(() => {
    if (draggingRef.current) {
      const d = draggingRef.current
      const wasTap = !dragMovedRef.current
      draggingRef.current = null
      if (wasTap && d.type === 'text') {
        setEditingTextId(String(d.id))
      }
      return
    }
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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
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
        const ctx = canvas.getContext('2d')!
        const pixel = ctx.getImageData(cx, cy, 1, 1).data
        const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(c => c.toString(16).padStart(2, '0')).join('')
        navigator.clipboard?.writeText(hex).catch(() => {})
        onApplyChange?.((s) => ({ ...s, pickedColor: hex }))
        setPickerBadge({ x: touch.clientX - rect.left, y: touch.clientY - rect.top, color: hex })
        setTimeout(() => setPickerBadge(null), 2000)
        return
      }

      if (drawingMode === 'wand') {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const sx = Math.round(pt.x * canvas.width)
        const sy = Math.round(pt.y * canvas.height)
        const mask = magicWandSelect(imgData, sx, sy, wandTolerance ?? 32, true)
        onApplyChange?.((s) => ({ ...s, selectionMask: mask }))
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
        const ctx = canvas.getContext('2d')!
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
    } else if (e.touches.length === 1 && !drawingMode) {
      const now = Date.now()
      if (now - lastTapRef.current < 300 && onZoomPanChange) {
        lastTapRef.current = 0
        e.preventDefault()
        onZoomPanChange({ zoom: 1, panX: 0, panY: 0 })
        return
      }
      lastTapRef.current = now

      const touch = e.touches[0]
      const pt = getCanvasPointFromTouch(touch)
      if (!pt) return
      const hit = hitTestOverlay(pt)
      if (hit) {
        e.preventDefault()
        draggingRef.current = hit
        dragMovedRef.current = false
      }
    } else if (e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (draggingRef.current) {
        const d = draggingRef.current
        const key = d.type === 'text' ? 'textOverlays' : 'shapeOverlays'
        const sizeKey = d.type === 'text' ? 'fontSize' : 'size'
        const items = d.type === 'text' ? textOverlays : shapeOverlays
        const item = items?.find((o) => o.id === d.id)
        d.resizing = true
        d.initDist = dist
        d.initSize = (item ? (item as unknown as Record<string, number>)[sizeKey] : undefined) ?? (d.type === 'text' ? 32 : 40)
        d.sizeKey = sizeKey
        d.stateKey = key
        return
      }

      setIsDrawing(false)
      currentStrokeRef.current = null
      healingRef.current.active = false
      touchRef.current.lastDistance = dist
      touchRef.current.startPanX = panX
      touchRef.current.startPanY = panY
    }
  }, [drawingMode, brushColor, brushSize, brushOpacity, panX, panY, getCanvasPointFromTouch, healSource, onApplyChange, canvasRef, applyHealBrush, hitTestOverlay, textOverlays, shapeOverlays, wandTolerance, onZoomPanChange])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDrawing && healingRef.current.active) {
      e.preventDefault()
      const touch = e.touches[0]
      const pt = getCanvasPointFromTouch(touch)
      if (!pt) return
      setHealCursor(pt)
      applyHealBrush(pt.x, pt.y, healingRef.current.offset!.x, healingRef.current.offset!.y, brushSize)
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
    } else if (e.touches.length === 1 && draggingRef.current && onApplyChange) {
      e.preventDefault()
      dragMovedRef.current = true
      const touch = e.touches[0]
      const pt = getCanvasPointFromTouch(touch)
      if (!pt) return
      const d = draggingRef.current
      const newX = Math.max(0, Math.min(1, pt.x - d.offsetX))
      const newY = Math.max(0, Math.min(1, pt.y - d.offsetY))
      if (d.type === 'text') {
        onApplyChange((s) => ({
          ...s,
          textOverlays: (s.textOverlays || []).map((item) =>
            item.id === d.id ? { ...item, x: newX, y: newY } : item
          ),
        }))
      } else {
        onApplyChange((s) => ({
          ...s,
          shapeOverlays: (s.shapeOverlays || []).map((item) =>
            item.id === d.id ? { ...item, x: newX, y: newY } : item
          ),
        }))
      }
    } else if (e.touches.length === 2 && draggingRef.current?.resizing && onApplyChange) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const d = draggingRef.current
      if (d.initDist && d.initDist > 0) {
        const scale = dist / d.initDist
        const minSize = d.type === 'text' ? 12 : 10
        const maxSize = d.type === 'text' ? 200 : 300
        const newSize = Math.round(Math.max(minSize, Math.min(maxSize, (d.initSize ?? 40) * scale)))
        if (d.type === 'text') {
          onApplyChange((s) => ({
            ...s,
            textOverlays: (s.textOverlays || []).map((item) =>
              item.id === d.id ? { ...item, fontSize: newSize } : item
            ),
          }))
        } else {
          onApplyChange((s) => ({
            ...s,
            shapeOverlays: (s.shapeOverlays || []).map((item) =>
              item.id === d.id ? { ...item, size: newSize } : item
            ),
          }))
        }
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
  }, [isDrawing, zoom, panX, panY, onZoomPanChange, getCanvasPointFromTouch, throttledDraw, brushSize, applyHealBrush, onApplyChange])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      if (draggingRef.current) {
        const d = draggingRef.current
        const wasTap = !dragMovedRef.current
        draggingRef.current = null
        if (wasTap && d.type === 'text') {
          setEditingTextId(String(d.id))
        }
        return
      }
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

  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
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
      className="min-w-0 flex-1 min-h-0 relative bg-zinc-900/50 lg:rounded-xl p-2 pb-[72px] lg:p-4 lg:pb-4 overflow-hidden flex items-center justify-center touch-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={(e: React.MouseEvent) => {
        if (!drawingMode && onZoomPanChange) {
          e.preventDefault()
          onZoomPanChange({ zoom: 1, panX: 0, panY: 0 })
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: drawingMode === 'picker' || drawingMode === 'wand' ? 'crosshair' : drawingMode === 'heal' ? (healSource ? 'cell' : 'crosshair') : drawingMode ? 'crosshair' : 'default' }}
    >
      {loadedSrc !== imageSrc && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-zinc-800 animate-pulse" />
            <div className="animate-spin w-6 h-6 border-2 border-zinc-600 border-t-indigo-500 rounded-full mx-auto mb-2" />
            <p className="text-xs text-zinc-500">Preparing canvas...</p>
          </div>
        </div>
      )}
      <div
        className="relative"
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
          className="rounded-lg shadow-2xl block"
          style={{ background: '#1a1a1a' }}
        />
        {beautyProcessing && (
          <div className="absolute inset-0 z-30 flex items-end justify-center pointer-events-none rounded-lg">
            <div className="flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-black/60 backdrop-blur-sm">
              <div className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-indigo-400 rounded-full animate-spin" />
              <span className="text-[10px] text-zinc-300 font-medium">Processing beauty...</span>
            </div>
          </div>
        )}
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
        {editingTextId && (
          <InlineTextEditor
            textOverlays={textOverlays}
            editingTextId={editingTextId}
            onSave={(val: string) => {
              if (val && onApplyChange) {
                onApplyChange((s) => ({
                  ...s,
                  textOverlays: (s.textOverlays || []).map((item) =>
                    item.id === editingTextId ? { ...item, text: val } : item
                  ),
                }))
              }
              setEditingTextId(null)
            }}
            onCancel={() => setEditingTextId(null)}
          />
        )}
        <CropOverlay
          cropRegion={cropOverlayRegion!}
          onCropChange={handleCropChange}
          isActive={cropActive}
          cropRatio={cropRatio}
        />
      </div>
    </div>
  )
}
