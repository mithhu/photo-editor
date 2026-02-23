/**
 * Face aging and de-aging using MediaPipe face mesh landmarks (468 points)
 * combined with canvas pixel manipulation.
 *
 * Aging effects: face shape warping, wrinkle lines, skin texture noise,
 * desaturation, and hair greying.
 *
 * De-aging effects: skin smoothing, eye enlargement, tighter jawline,
 * and color boost.
 */

import type { FaceKeypoint, AgeTransformSettings } from '../types'
import { FACE_REGIONS } from './faceMesh'

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

function sampleBilinear(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  fx: number,
  fy: number
): [number, number, number, number] {
  const x0 = clamp(Math.floor(fx), 0, w - 1)
  const y0 = clamp(Math.floor(fy), 0, h - 1)
  const x1 = Math.min(x0 + 1, w - 1)
  const y1 = Math.min(y0 + 1, h - 1)
  const dx = fx - x0
  const dy = fy - y0

  const i00 = (y0 * w + x0) * 4
  const i10 = (y0 * w + x1) * 4
  const i01 = (y1 * w + x0) * 4
  const i11 = (y1 * w + x1) * 4

  const w00 = (1 - dx) * (1 - dy)
  const w10 = dx * (1 - dy)
  const w01 = (1 - dx) * dy
  const w11 = dx * dy

  return [
    data[i00] * w00 + data[i10] * w10 + data[i01] * w01 + data[i11] * w11,
    data[i00 + 1] * w00 + data[i10 + 1] * w10 + data[i01 + 1] * w01 + data[i11 + 1] * w11,
    data[i00 + 2] * w00 + data[i10 + 2] * w10 + data[i01 + 2] * w01 + data[i11 + 2] * w11,
    data[i00 + 3] * w00 + data[i10 + 3] * w10 + data[i01 + 3] * w01 + data[i11 + 3] * w11,
  ]
}

function dist(a: FaceKeypoint, b: FaceKeypoint): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function computeFaceEllipse(keypoints: FaceKeypoint[]): { cx: number; cy: number; rx: number; ry: number } | null {
  const oval = FACE_REGIONS.faceOval.map(i => keypoints[i]).filter(Boolean)
  if (oval.length < 10) return null

  let cx = 0, cy = 0
  oval.forEach(p => { cx += p.x; cy += p.y })
  cx /= oval.length
  cy /= oval.length

  let maxRx = 0, maxRy = 0
  oval.forEach(p => {
    maxRx = Math.max(maxRx, Math.abs(p.x - cx))
    maxRy = Math.max(maxRy, Math.abs(p.y - cy))
  })

  return { cx, cy, rx: maxRx, ry: maxRy }
}

/* ── Skin mask helpers ─────────────────────────────────────────────── */

function buildSkinMask(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  keypoints: FaceKeypoint[],
): Uint8Array {
  const mask = new Uint8Array(w * h)

  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const oCtx = off.getContext('2d')!
  oCtx.clearRect(0, 0, w, h)

  // Fill face oval
  const ovalPts = FACE_REGIONS.faceOval.map(i => keypoints[i]).filter(Boolean)
  if (ovalPts.length < 4) return mask
  oCtx.beginPath()
  oCtx.moveTo(ovalPts[0].x, ovalPts[0].y)
  for (let i = 1; i < ovalPts.length; i++) oCtx.lineTo(ovalPts[i].x, ovalPts[i].y)
  oCtx.closePath()
  oCtx.fillStyle = '#fff'
  oCtx.fill()

  // Cut out eyes and inner lips so we don't texture them
  oCtx.globalCompositeOperation = 'destination-out'
  for (const region of [FACE_REGIONS.leftEye, FACE_REGIONS.rightEye, FACE_REGIONS.innerLips]) {
    const pts = region.map(i => keypoints[i]).filter(Boolean)
    if (pts.length < 3) continue
    oCtx.beginPath()
    oCtx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) oCtx.lineTo(pts[i].x, pts[i].y)
    oCtx.closePath()
    oCtx.fill()
  }

  const oData = oCtx.getImageData(0, 0, w, h).data
  for (let i = 0; i < w * h; i++) {
    mask[i] = oData[i * 4 + 3] > 128 ? 1 : 0
  }
  return mask
}

/* ── Aging: displacement field ─────────────────────────────────────── */

function buildAgingDisplacement(
  dispXY: Float32Array,
  w: number,
  h: number,
  keypoints: FaceKeypoint[],
  strength: number,
  bx0: number,
  by0: number,
  bw: number
): void {
  const ellipse = computeFaceEllipse(keypoints)
  if (!ellipse) return
  const { cx, cy, rx, ry } = ellipse

  // A) Widen jawline (sagging)
  const jawPts = FACE_REGIONS.jawline.map(i => keypoints[i]).filter(Boolean)
  if (jawPts.length > 4) {
    const pushOut = strength * 0.04
    const sagDown = strength * 0.03
    const padX = rx * 1.3
    const padY = ry * 0.6
    const regionCy = cy + ry * 0.3

    const minX = Math.max(0, Math.floor(cx - padX))
    const maxX = Math.min(w - 1, Math.ceil(cx + padX))
    const minY = Math.max(0, Math.floor(regionCy - padY))
    const maxY = Math.min(h - 1, Math.ceil(regionCy + padY * 1.5))

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const nx = (x - cx) / padX
        const ny = (y - regionCy) / padY
        const ellDist = nx * nx + ny * ny
        if (ellDist >= 1) continue

        const edgeFade = 1 - ellDist
        const wt = edgeFade * edgeFade * (3 - 2 * edgeFade)

        // Push outward from center (widen)
        const dx = (x - cx) * pushOut * wt
        // Pull downward (sag)
        const dy = -Math.max(0, y - cy) * sagDown * wt

        const idx = ((y - by0) * bw + (x - bx0)) * 2
        if (idx >= 0 && idx + 1 < dispXY.length) {
          dispXY[idx] += dx
          dispXY[idx + 1] += dy
        }
      }
    }
  }

  // B) Thin lips slightly
  const lipPts = FACE_REGIONS.lips.map(i => keypoints[i]).filter(Boolean)
  if (lipPts.length > 4) {
    let lipCx = 0, lipCy = 0
    lipPts.forEach(p => { lipCx += p.x; lipCy += p.y })
    lipCx /= lipPts.length
    lipCy /= lipPts.length

    let lipRx = 0, lipRy = 0
    lipPts.forEach(p => {
      lipRx = Math.max(lipRx, Math.abs(p.x - lipCx))
      lipRy = Math.max(lipRy, Math.abs(p.y - lipCy))
    })

    const thinStrength = strength * 0.03
    const padLX = lipRx * 1.4
    const padLY = lipRy * 2.0

    const minX = Math.max(0, Math.floor(lipCx - padLX))
    const maxX = Math.min(w - 1, Math.ceil(lipCx + padLX))
    const minY = Math.max(0, Math.floor(lipCy - padLY))
    const maxY = Math.min(h - 1, Math.ceil(lipCy + padLY))

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const nx = (x - lipCx) / padLX
        const ny = (y - lipCy) / padLY
        const ellDist = nx * nx + ny * ny
        if (ellDist >= 1) continue

        const edgeFade = 1 - ellDist
        const wt = edgeFade * edgeFade * (3 - 2 * edgeFade)

        // Pull upper lip down and lower lip up (toward center)
        const dy = (y - lipCy) * thinStrength * wt

        const idx = ((y - by0) * bw + (x - bx0)) * 2
        if (idx >= 0 && idx + 1 < dispXY.length) {
          dispXY[idx + 1] += dy
        }
      }
    }
  }
}

/* ── Aging: wrinkle lines ──────────────────────────────────────────── */

function drawWrinkleLines(
  ctx: CanvasRenderingContext2D,
  keypoints: FaceKeypoint[],
  strength: number
): void {
  const alpha = 0.08 * strength
  if (alpha < 0.002) return

  ctx.save()
  ctx.strokeStyle = `rgba(0,0,0,${clamp(alpha, 0, 0.25)})`
  ctx.lineWidth = 1
  ctx.lineCap = 'round'

  // Forehead wrinkles: horizontal wavy lines between top of head (10) and eyebrows
  const topPt = keypoints[10]
  const leftBrow = keypoints[67]
  const rightBrow = keypoints[297]
  if (topPt && leftBrow && rightBrow) {
    const leftAnchor = keypoints[109] || leftBrow
    const rightAnchor = keypoints[338] || rightBrow

    const browMidY = (leftBrow.y + rightBrow.y) / 2
    const foreheadH = browMidY - topPt.y
    if (foreheadH > 5) {
      const lineCount = Math.min(4, Math.max(2, Math.round(3 * strength)))
      for (let i = 0; i < lineCount; i++) {
        const t = (i + 1) / (lineCount + 1)
        const baseY = topPt.y + foreheadH * t

        const leftX = leftAnchor.x + (leftBrow.x - leftAnchor.x) * 0.3
        const rightX = rightAnchor.x + (rightBrow.x - rightAnchor.x) * 0.3
        const midX = (leftX + rightX) / 2

        const wave = foreheadH * 0.03 * Math.sin(i * 1.7)

        ctx.beginPath()
        ctx.moveTo(leftX, baseY + wave)
        ctx.quadraticCurveTo(midX, baseY - wave * 1.5, rightX, baseY + wave * 0.8)
        ctx.stroke()
      }
    }
  }

  // Crow's feet: radiating lines from outer eye corners
  const leftOuterEye = keypoints[33]
  const rightOuterEye = keypoints[263]
  for (const corner of [leftOuterEye, rightOuterEye]) {
    if (!corner) continue
    const dir = corner === leftOuterEye ? -1 : 1
    const lineCount = Math.min(4, Math.max(2, Math.round(3 * strength)))
    const len = dist(keypoints[33] || corner, keypoints[133] || corner) * 0.4

    for (let i = 0; i < lineCount; i++) {
      const angle = (dir > 0 ? 0 : Math.PI) + (i - (lineCount - 1) / 2) * 0.25
      ctx.beginPath()
      ctx.moveTo(corner.x, corner.y)
      ctx.lineTo(
        corner.x + Math.cos(angle) * len * dir,
        corner.y + Math.sin(angle) * len * 0.8
      )
      ctx.stroke()
    }
  }

  // Nasolabial folds: nose sides down to mouth corners
  const noseLeft = keypoints[129]
  const noseRight = keypoints[358]
  const mouthLeft = keypoints[61]
  const mouthRight = keypoints[291]
  if (noseLeft && mouthLeft) {
    const cpx = noseLeft.x - (mouthLeft.x - noseLeft.x) * 0.3
    const cpy = (noseLeft.y + mouthLeft.y) / 2
    ctx.beginPath()
    ctx.moveTo(noseLeft.x, noseLeft.y)
    ctx.quadraticCurveTo(cpx, cpy, mouthLeft.x, mouthLeft.y)
    ctx.stroke()
  }
  if (noseRight && mouthRight) {
    const cpx = noseRight.x + (noseRight.x - mouthRight.x) * 0.3
    const cpy = (noseRight.y + mouthRight.y) / 2
    ctx.beginPath()
    ctx.moveTo(noseRight.x, noseRight.y)
    ctx.quadraticCurveTo(cpx, cpy, mouthRight.x, mouthRight.y)
    ctx.stroke()
  }

  // Under-eye lines
  for (const eyeRegion of [FACE_REGIONS.leftEye, FACE_REGIONS.rightEye]) {
    const pts = eyeRegion.map(i => keypoints[i]).filter(Boolean)
    if (pts.length < 6) continue

    let bottomPts = pts.slice(0, Math.ceil(pts.length / 2))
    bottomPts.sort((a, b) => a.x - b.x)

    // Offset slightly below
    const offset = 3 * strength
    ctx.beginPath()
    ctx.moveTo(bottomPts[0].x, bottomPts[0].y + offset)
    for (let i = 1; i < bottomPts.length; i++) {
      const prev = bottomPts[i - 1]
      const cur = bottomPts[i]
      ctx.quadraticCurveTo(
        (prev.x + cur.x) / 2,
        (prev.y + cur.y) / 2 + offset + 1,
        cur.x,
        cur.y + offset
      )
    }
    ctx.stroke()
  }

  ctx.restore()
}

/* ── Aging: skin texture (noise + desaturate) ──────────────────────── */

function applySkinTexture(
  imageData: ImageData,
  skinMask: Uint8Array,
  strength: number
): void {
  const { data, width, height } = imageData
  const noiseAmp = 8 * strength
  const desatAmount = clamp(strength * 0.15, 0, 0.4)

  for (let i = 0; i < width * height; i++) {
    if (!skinMask[i]) continue

    const idx = i * 4
    let r = data[idx]
    let g = data[idx + 1]
    let b = data[idx + 2]

    // Brightness noise
    const noise = (Math.random() - 0.5) * 2 * noiseAmp
    r = clamp(r + noise, 0, 255)
    g = clamp(g + noise, 0, 255)
    b = clamp(b + noise, 0, 255)

    // Desaturate
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    r = r + (gray - r) * desatAmount
    g = g + (gray - g) * desatAmount
    b = b + (gray - b) * desatAmount

    data[idx] = clamp(Math.round(r), 0, 255)
    data[idx + 1] = clamp(Math.round(g), 0, 255)
    data[idx + 2] = clamp(Math.round(b), 0, 255)
  }
}

/* ── Aging: hair greying ───────────────────────────────────────────── */

function applyHairGrey(
  imageData: ImageData,
  keypoints: FaceKeypoint[],
  strength: number
): void {
  const { data, width, height } = imageData

  // Build a mask for the hair region above the forehead
  const topIndices = [10, 338, 297, 332, 284]
  const topPts = topIndices.map(i => keypoints[i]).filter(Boolean)
  if (topPts.length < 3) return

  let minTopY = Infinity, maxTopX = -Infinity, minTopX = Infinity
  topPts.forEach(p => {
    minTopY = Math.min(minTopY, p.y)
    maxTopX = Math.max(maxTopX, p.x)
    minTopX = Math.min(minTopX, p.x)
  })

  // Hair region: rectangle above forehead line, between leftmost and rightmost top points
  const hairTop = Math.max(0, Math.floor(minTopY - (minTopY * 0.4)))
  const hairBottom = Math.floor(minTopY)
  const hairLeft = Math.max(0, Math.floor(minTopX - 15))
  const hairRight = Math.min(width - 1, Math.ceil(maxTopX + 15))

  const greyBlend = clamp(strength * 0.4, 0, 0.7)

  for (let y = hairTop; y <= hairBottom; y++) {
    for (let x = hairLeft; x <= hairRight; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const a = data[idx + 3]
      if (a < 10) continue

      // Skip very bright pixels (likely background)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      if (lum > 230) continue

      // Vertical fade: stronger near forehead, weaker at top edge
      const vertT = (y - hairTop) / Math.max(1, hairBottom - hairTop)
      const fade = vertT * greyBlend

      const grey = lum * 1.1
      data[idx] = clamp(Math.round(r + (grey - r) * fade), 0, 255)
      data[idx + 1] = clamp(Math.round(g + (grey - g) * fade), 0, 255)
      data[idx + 2] = clamp(Math.round(b + (grey - b) * fade), 0, 255)
    }
  }
}

/* ── De-aging: skin smoothing (box blur masked to skin) ────────────── */

function applySkinSmooth(
  imageData: ImageData,
  skinMask: Uint8Array,
  strength: number
): void {
  const { data, width, height } = imageData
  const radius = clamp(Math.round(2 + strength), 2, 4)
  const brighten = clamp(strength * 8, 0, 15)

  // Copy source for reading
  const src = new Uint8ClampedArray(data)

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const pi = y * width + x
      if (!skinMask[pi]) continue

      let sumR = 0, sumG = 0, sumB = 0, count = 0

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const si = ((y + dy) * width + (x + dx)) * 4
          sumR += src[si]
          sumG += src[si + 1]
          sumB += src[si + 2]
          count++
        }
      }

      const di = pi * 4
      data[di] = clamp(Math.round(sumR / count + brighten), 0, 255)
      data[di + 1] = clamp(Math.round(sumG / count + brighten), 0, 255)
      data[di + 2] = clamp(Math.round(sumB / count + brighten), 0, 255)
    }
  }
}

/* ── De-aging: eye enlargement via displacement ────────────────────── */

function buildEyeEnlargement(
  dispXY: Float32Array,
  w: number,
  h: number,
  keypoints: FaceKeypoint[],
  strength: number,
  bx0: number,
  by0: number,
  bw: number
): void {
  const scale = strength * 0.1

  for (const eyeRegion of [FACE_REGIONS.leftEye, FACE_REGIONS.rightEye]) {
    const pts = eyeRegion.map(i => keypoints[i]).filter(Boolean)
    if (pts.length < 4) continue

    let ecx = 0, ecy = 0
    pts.forEach(p => { ecx += p.x; ecy += p.y })
    ecx /= pts.length
    ecy /= pts.length

    let maxDist = 0
    pts.forEach(p => {
      const d = Math.sqrt((p.x - ecx) ** 2 + (p.y - ecy) ** 2)
      if (d > maxDist) maxDist = d
    })

    const radius = maxDist * 2.5
    const minX = Math.max(0, Math.floor(ecx - radius))
    const maxX = Math.min(w - 1, Math.ceil(ecx + radius))
    const minY = Math.max(0, Math.floor(ecy - radius))
    const maxY = Math.min(h - 1, Math.ceil(ecy + radius))

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d = Math.sqrt((x - ecx) ** 2 + (y - ecy) ** 2)
        if (d >= radius) continue
        const t = d / radius
        const s = 1 - t
        const wt = s * s * (3 - 2 * s) * scale
        if (wt <= 0.001) continue

        const idx = ((y - by0) * bw + (x - bx0)) * 2
        if (idx >= 0 && idx + 1 < dispXY.length) {
          dispXY[idx] += (x - ecx) * wt
          dispXY[idx + 1] += (y - ecy) * wt
        }
      }
    }
  }
}

/* ── De-aging: tighter jawline displacement ────────────────────────── */

function buildTighterJawline(
  dispXY: Float32Array,
  w: number,
  h: number,
  keypoints: FaceKeypoint[],
  strength: number,
  bx0: number,
  by0: number,
  bw: number
): void {
  const ellipse = computeFaceEllipse(keypoints)
  if (!ellipse) return

  const { cx, cy, rx, ry } = ellipse
  const pushIn = strength * 0.04

  const padX = rx * 1.2
  const padY = ry * 0.5
  const regionCy = cy + ry * 0.4

  const minX = Math.max(0, Math.floor(cx - padX))
  const maxX = Math.min(w - 1, Math.ceil(cx + padX))
  const minY = Math.max(0, Math.floor(regionCy - padY))
  const maxY = Math.min(h - 1, Math.ceil(regionCy + padY * 1.5))

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const nx = (x - cx) / padX
      const ny = (y - regionCy) / padY
      const ellDist = nx * nx + ny * ny
      if (ellDist >= 1) continue

      const edgeFade = 1 - ellDist
      const wt = edgeFade * edgeFade * (3 - 2 * edgeFade)

      // Push inward toward center
      const dx = -(x - cx) * pushIn * wt

      const idx = ((y - by0) * bw + (x - bx0)) * 2
      if (idx >= 0 && idx + 1 < dispXY.length) {
        dispXY[idx] += dx
      }
    }
  }
}

/* ── De-aging: color boost ─────────────────────────────────────────── */

function applyColorBoost(
  imageData: ImageData,
  skinMask: Uint8Array,
  strength: number
): void {
  const { data, width, height } = imageData
  const satBoost = clamp(strength * 0.08, 0, 0.2)
  const warmth = clamp(strength * 3, 0, 8)

  for (let i = 0; i < width * height; i++) {
    if (!skinMask[i]) continue

    const idx = i * 4
    let r = data[idx]
    let g = data[idx + 1]
    let b = data[idx + 2]

    // Increase saturation
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    r = clamp(r + (r - gray) * satBoost + warmth, 0, 255)
    g = clamp(g + (g - gray) * satBoost + warmth * 0.4, 0, 255)
    b = clamp(b + (b - gray) * satBoost, 0, 255)

    data[idx] = Math.round(r)
    data[idx + 1] = Math.round(g)
    data[idx + 2] = Math.round(b)
  }
}

/* ── Main entry point ──────────────────────────────────────────────── */

export function applyAgeTransform(
  canvas: HTMLCanvasElement,
  keypoints: FaceKeypoint[],
  settings: AgeTransformSettings
): HTMLCanvasElement | null {
  if (settings.offset === 0) return null

  const { width, height } = canvas
  if (width < 2 || height < 2 || keypoints.length < 400) return null

  const ageStrength = (settings.offset / 40) * (settings.intensity / 100)
  const absStrength = Math.abs(ageStrength)
  if (absStrength < 0.001) return null

  const srcCtx = canvas.getContext('2d')
  if (!srcCtx) return null

  const work = document.createElement('canvas')
  work.width = width
  work.height = height
  const wCtx = work.getContext('2d')!
  wCtx.drawImage(canvas, 0, 0)

  const ellipse = computeFaceEllipse(keypoints)
  if (!ellipse) return null

  // Compute bounding box with padding
  const pad = 1.6
  const bx0 = Math.max(0, Math.floor(ellipse.cx - ellipse.rx * pad))
  const bx1 = Math.min(width - 1, Math.ceil(ellipse.cx + ellipse.rx * pad))
  const by0 = Math.max(0, Math.floor(ellipse.cy - ellipse.ry * pad))
  const by1 = Math.min(height - 1, Math.ceil(ellipse.cy + ellipse.ry * pad))
  const bw = bx1 - bx0 + 1
  const bh = by1 - by0 + 1

  if (bw < 4 || bh < 4) return null

  const dispXY = new Float32Array(bw * bh * 2)
  const isAging = settings.offset > 0

  if (isAging) {
    // Aging pipeline
    buildAgingDisplacement(dispXY, width, height, keypoints, absStrength, bx0, by0, bw)
  } else {
    // De-aging pipeline
    buildEyeEnlargement(dispXY, width, height, keypoints, absStrength, bx0, by0, bw)
    buildTighterJawline(dispXY, width, height, keypoints, absStrength, bx0, by0, bw)
  }

  // Apply displacement field via bilinear sampling
  const srcImageData = wCtx.getImageData(0, 0, width, height)
  const sd = srcImageData.data
  const dstImageData = new ImageData(new Uint8ClampedArray(sd), width, height)
  const dd = dstImageData.data

  let hasDisplacement = false
  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      const li = ((y - by0) * bw + (x - bx0)) * 2
      const dx = dispXY[li]
      const dy = dispXY[li + 1]
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) continue

      hasDisplacement = true
      const srcX = clamp(x - dx, 0, width - 1)
      const srcY = clamp(y - dy, 0, height - 1)

      const [r, g, b, a] = sampleBilinear(sd, width, height, srcX, srcY)
      const di = (y * width + x) * 4
      dd[di] = r
      dd[di + 1] = g
      dd[di + 2] = b
      dd[di + 3] = a
    }
  }

  if (hasDisplacement) {
    wCtx.putImageData(dstImageData, 0, 0)
  }

  // Build skin mask for pixel-level effects
  const skinMask = buildSkinMask(wCtx, width, height, keypoints)

  if (isAging) {
    // Wrinkle lines (drawn on canvas context)
    drawWrinkleLines(wCtx, keypoints, absStrength)

    // Skin texture noise + desaturation
    const texData = wCtx.getImageData(0, 0, width, height)
    applySkinTexture(texData, skinMask, absStrength)

    // Hair greying (offset >= 20 means ageStrength >= 0.5 at 100% intensity)
    if (settings.offset >= 20) {
      const greyStrength = clamp((settings.offset - 20) / 20, 0, 1) * (settings.intensity / 100)
      applyHairGrey(texData, keypoints, greyStrength)
    }

    wCtx.putImageData(texData, 0, 0)
  } else {
    // De-aging: smooth skin, boost color
    const smoothData = wCtx.getImageData(0, 0, width, height)
    applySkinSmooth(smoothData, skinMask, absStrength)
    applyColorBoost(smoothData, skinMask, absStrength)
    wCtx.putImageData(smoothData, 0, 0)
  }

  return work
}
