/**
 * Facial emotion transformations using MediaPipe face mesh landmarks (468 points).
 *
 * Uses the same displacement field approach as faceReshape.ts: builds a single
 * smooth warp map over the face bounding box, then applies it with bilinear
 * interpolation. Cry emotion additionally draws procedural teardrop overlays.
 */

import type { FaceKeypoint, EmotionType } from '../types'
import { FACE_REGIONS } from './faceMesh'

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

function sampleBilinear(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  fx: number,
  fy: number
): [number, number, number, number] {
  const x0 = clamp(Math.floor(fx), 0, width - 1)
  const y0 = clamp(Math.floor(fy), 0, height - 1)
  const x1 = Math.min(x0 + 1, width - 1)
  const y1 = Math.min(y0 + 1, height - 1)
  const dx = fx - x0
  const dy = fy - y0

  const i00 = (y0 * width + x0) * 4
  const i10 = (y0 * width + x1) * 4
  const i01 = (y1 * width + x0) * 4
  const i11 = (y1 * width + x1) * 4

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

function smoothFalloff(t: number): number {
  return t * t * (3 - 2 * t)
}

interface FaceEllipse {
  cx: number
  cy: number
  rx: number
  ry: number
}

function computeFaceEllipse(keypoints: FaceKeypoint[]): FaceEllipse | null {
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

/**
 * Add a displacement toward a target direction around a landmark point.
 * Uses an elliptical falloff so the warp blends smoothly into surroundings.
 */
function addLandmarkDisplacement(
  dispXY: Float32Array,
  bx0: number,
  by0: number,
  bw: number,
  bh: number,
  canvasW: number,
  canvasH: number,
  anchorX: number,
  anchorY: number,
  displaceX: number,
  displaceY: number,
  radius: number,
  strength: number
): void {
  const minX = Math.max(0, Math.floor(anchorX - radius))
  const maxX = Math.min(canvasW - 1, Math.ceil(anchorX + radius))
  const minY = Math.max(0, Math.floor(anchorY - radius))
  const maxY = Math.min(canvasH - 1, Math.ceil(anchorY + radius))

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dist = Math.sqrt((x - anchorX) ** 2 + (y - anchorY) ** 2)
      if (dist >= radius) continue

      const t = 1 - dist / radius
      const w = smoothFalloff(t) * strength

      const lx = x - bx0
      const ly = y - by0
      if (lx < 0 || lx >= bw || ly < 0 || ly >= bh) continue

      const idx = (ly * bw + lx) * 2
      dispXY[idx] += displaceX * w
      dispXY[idx + 1] += displaceY * w
    }
  }
}

/**
 * Magnify/demagnify a region around a center point (like gatherBiggerEyes).
 * Positive scale = magnify (push pixels outward), negative = shrink.
 */
function addRegionMagnify(
  dispXY: Float32Array,
  bx0: number,
  by0: number,
  bw: number,
  bh: number,
  canvasW: number,
  canvasH: number,
  ecx: number,
  ecy: number,
  radius: number,
  scale: number
): void {
  const minX = Math.max(0, Math.floor(ecx - radius))
  const maxX = Math.min(canvasW - 1, Math.ceil(ecx + radius))
  const minY = Math.max(0, Math.floor(ecy - radius))
  const maxY = Math.min(canvasH - 1, Math.ceil(ecy + radius))

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dist = Math.sqrt((x - ecx) ** 2 + (y - ecy) ** 2)
      if (dist >= radius) continue
      const t = dist / radius
      const s = 1 - t
      const w = smoothFalloff(s) * scale

      const lx = x - bx0
      const ly = y - by0
      if (lx < 0 || lx >= bw || ly < 0 || ly >= bh) continue

      const idx = (ly * bw + lx) * 2
      dispXY[idx] += (x - ecx) * w
      dispXY[idx + 1] += (y - ecy) * w
    }
  }
}

function getEyeCenter(keypoints: FaceKeypoint[], eyeRegion: number[]): { x: number; y: number; radius: number } | null {
  const pts = eyeRegion.map(i => keypoints[i]).filter(Boolean)
  if (pts.length < 4) return null

  let ecx = 0, ecy = 0
  pts.forEach(p => { ecx += p.x; ecy += p.y })
  ecx /= pts.length
  ecy /= pts.length

  let maxDist = 0
  pts.forEach(p => {
    const d = Math.sqrt((p.x - ecx) ** 2 + (p.y - ecy) ** 2)
    if (d > maxDist) maxDist = d
  })

  return { x: ecx, y: ecy, radius: maxDist }
}

function getLipCenter(keypoints: FaceKeypoint[]): { x: number; y: number; width: number; height: number } | null {
  const pts = FACE_REGIONS.lips.map(i => keypoints[i]).filter(Boolean)
  if (pts.length < 6) return null

  let cx = 0, cy = 0
  pts.forEach(p => { cx += p.x; cy += p.y })
  cx /= pts.length
  cy /= pts.length

  let maxW = 0, maxH = 0
  pts.forEach(p => {
    maxW = Math.max(maxW, Math.abs(p.x - cx))
    maxH = Math.max(maxH, Math.abs(p.y - cy))
  })

  return { x: cx, y: cy, width: maxW, height: maxH }
}

// --- Emotion displacement gatherers ---

function gatherLaugh(
  dispXY: Float32Array,
  bx0: number, by0: number, bw: number, bh: number,
  w: number, h: number,
  keypoints: FaceKeypoint[],
  strength: number
): void {
  const ellipse = computeFaceEllipse(keypoints)
  if (!ellipse) return

  const faceScale = ellipse.rx * 0.01

  const mouthL = keypoints[61]
  const mouthR = keypoints[291]
  if (mouthL && mouthR) {
    const radius = ellipse.rx * 0.35
    const upAmount = -faceScale * strength * 14
    const outAmount = faceScale * strength * 5

    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      mouthL.x, mouthL.y, -outAmount, upAmount, radius, 1)
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      mouthR.x, mouthR.y, outAmount, upAmount, radius, 1)
  }

  // Raise cheeks
  const cheekL = keypoints[116]
  const cheekR = keypoints[345]
  if (cheekL && cheekR) {
    const radius = ellipse.rx * 0.3
    const upAmount = -faceScale * strength * 8
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      cheekL.x, cheekL.y, 0, upAmount, radius, 1)
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      cheekR.x, cheekR.y, 0, upAmount, radius, 1)
  }

  // Squint eyes (pull lower eyelid slightly up)
  for (const eyeRegion of [FACE_REGIONS.leftEye, FACE_REGIONS.rightEye]) {
    const eye = getEyeCenter(keypoints, eyeRegion)
    if (!eye) continue

    const lowerLidY = eye.y + eye.radius * 0.6
    const radius = eye.radius * 2
    const squintAmount = -faceScale * strength * 4
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      eye.x, lowerLidY, 0, squintAmount, radius, 1)
  }
}

function gatherCry(
  dispXY: Float32Array,
  bx0: number, by0: number, bw: number, bh: number,
  w: number, h: number,
  keypoints: FaceKeypoint[],
  strength: number
): void {
  const ellipse = computeFaceEllipse(keypoints)
  if (!ellipse) return

  const faceScale = ellipse.rx * 0.01

  // Pull mouth corners down
  const mouthL = keypoints[61]
  const mouthR = keypoints[291]
  if (mouthL && mouthR) {
    const radius = ellipse.rx * 0.3
    const downAmount = faceScale * strength * 16
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      mouthL.x, mouthL.y, 0, downAmount, radius, 1)
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      mouthR.x, mouthR.y, 0, downAmount, radius, 1)
  }

  // Pull inner eyebrow ends upward ("worried" brows)
  const browInnerL = keypoints[55]
  const browInnerR = keypoints[285]
  if (browInnerL && browInnerR) {
    const radius = ellipse.rx * 0.25
    const upAmount = -faceScale * strength * 12
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      browInnerL.x, browInnerL.y, 0, upAmount, radius, 1)
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      browInnerR.x, browInnerR.y, 0, upAmount, radius, 1)
  }
}

function gatherAngry(
  dispXY: Float32Array,
  bx0: number, by0: number, bw: number, bh: number,
  w: number, h: number,
  keypoints: FaceKeypoint[],
  strength: number
): void {
  const ellipse = computeFaceEllipse(keypoints)
  if (!ellipse) return

  const faceScale = ellipse.rx * 0.01
  const noseBridge = keypoints[6]

  // Furrow eyebrows: pull inner ends downward and inward toward nose
  const browInnerL = keypoints[55]
  const browInnerR = keypoints[285]
  if (browInnerL && browInnerR && noseBridge) {
    const radius = ellipse.rx * 0.25
    const downAmount = faceScale * strength * 10
    const inwardL = (noseBridge.x - browInnerL.x) * strength * 0.08
    const inwardR = (noseBridge.x - browInnerR.x) * strength * 0.08

    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      browInnerL.x, browInnerL.y, inwardL, downAmount, radius, 1)
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      browInnerR.x, browInnerR.y, inwardR, downAmount, radius, 1)
  }

  // Pull outer eyebrow ends slightly down
  const browOuterL = keypoints[46]
  const browOuterR = keypoints[276]
  if (browOuterL && browOuterR) {
    const radius = ellipse.rx * 0.2
    const downAmount = faceScale * strength * 5
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      browOuterL.x, browOuterL.y, 0, downAmount, radius, 1)
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      browOuterR.x, browOuterR.y, 0, downAmount, radius, 1)
  }

  // Tighten lips slightly inward
  const lip = getLipCenter(keypoints)
  const mouthL = keypoints[61]
  const mouthR = keypoints[291]
  if (lip && mouthL && mouthR) {
    const radius = ellipse.rx * 0.2
    const inwardAmount = faceScale * strength * 5
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      mouthL.x, mouthL.y, inwardAmount, 0, radius, 1)
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      mouthR.x, mouthR.y, -inwardAmount, 0, radius, 1)
  }

  // Slight jaw clench — raise chin
  const chin = keypoints[152]
  if (chin) {
    const radius = ellipse.rx * 0.3
    const upAmount = -faceScale * strength * 4
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      chin.x, chin.y, 0, upAmount, radius, 1)
  }
}

function gatherSurprised(
  dispXY: Float32Array,
  bx0: number, by0: number, bw: number, bh: number,
  w: number, h: number,
  keypoints: FaceKeypoint[],
  strength: number
): void {
  const ellipse = computeFaceEllipse(keypoints)
  if (!ellipse) return

  const faceScale = ellipse.rx * 0.01

  // Widen eyes (magnify eye region) — stronger scale for visible effect
  for (const eyeRegion of [FACE_REGIONS.leftEye, FACE_REGIONS.rightEye]) {
    const eye = getEyeCenter(keypoints, eyeRegion)
    if (!eye) continue
    const radius = eye.radius * 3.0
    addRegionMagnify(dispXY, bx0, by0, bw, bh, w, h,
      eye.x, eye.y, radius, strength * 0.2)
  }

  // Open mouth: pull upper lip up, lower lip down
  const upperLip = keypoints[13]
  const lowerLip = keypoints[14]
  if (upperLip && lowerLip) {
    const radius = ellipse.rx * 0.35
    const openAmount = faceScale * strength * 18
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      upperLip.x, upperLip.y, 0, -openAmount, radius, 1)
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      lowerLip.x, lowerLip.y, 0, openAmount * 1.2, radius, 1)
  }

  // Raise eyebrows — use brow center rather than each point to avoid artifacts
  for (const browRegion of [FACE_REGIONS.leftEyebrow, FACE_REGIONS.rightEyebrow]) {
    const pts = browRegion.map(i => keypoints[i]).filter(Boolean)
    if (pts.length < 3) continue
    let bcx = 0, bcy = 0
    pts.forEach(p => { bcx += p.x; bcy += p.y })
    bcx /= pts.length
    bcy /= pts.length
    const radius = ellipse.rx * 0.35
    const upAmount = -faceScale * strength * 16
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      bcx, bcy, 0, upAmount, radius, 1)
  }
}

function gatherSad(
  dispXY: Float32Array,
  bx0: number, by0: number, bw: number, bh: number,
  w: number, h: number,
  keypoints: FaceKeypoint[],
  strength: number
): void {
  const ellipse = computeFaceEllipse(keypoints)
  if (!ellipse) return

  const faceScale = ellipse.rx * 0.01

  // Pull mouth corners down (less than cry)
  const mouthL = keypoints[61]
  const mouthR = keypoints[291]
  if (mouthL && mouthR) {
    const radius = ellipse.rx * 0.25
    const downAmount = faceScale * strength * 10
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      mouthL.x, mouthL.y, 0, downAmount, radius, 1)
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      mouthR.x, mouthR.y, 0, downAmount, radius, 1)
  }

  // Droop outer eyebrow ends downward
  const browOuterL = keypoints[46]
  const browOuterR = keypoints[276]
  if (browOuterL && browOuterR) {
    const radius = ellipse.rx * 0.2
    const downAmount = faceScale * strength * 8
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      browOuterL.x, browOuterL.y, 0, downAmount, radius, 1)
    addLandmarkDisplacement(dispXY, bx0, by0, bw, bh, w, h,
      browOuterR.x, browOuterR.y, 0, downAmount, radius, 1)
  }

  // Slightly narrow eyes
  for (const eyeRegion of [FACE_REGIONS.leftEye, FACE_REGIONS.rightEye]) {
    const eye = getEyeCenter(keypoints, eyeRegion)
    if (!eye) continue
    const radius = eye.radius * 2
    addRegionMagnify(dispXY, bx0, by0, bw, bh, w, h,
      eye.x, eye.y, radius, -strength * 0.04)
  }
}

// --- Teardrop overlay for cry emotion ---

function drawTeardrop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  opacity: number
): void {
  ctx.save()

  const gradient = ctx.createRadialGradient(x, y + size * 0.3, 0, x, y + size * 0.3, size)
  gradient.addColorStop(0, `rgba(100, 180, 255, ${opacity})`)
  gradient.addColorStop(0.7, `rgba(100, 180, 255, ${opacity * 0.4})`)
  gradient.addColorStop(1, 'rgba(100, 180, 255, 0)')

  ctx.fillStyle = gradient
  ctx.beginPath()

  // Teardrop shape: pointed top, round bottom
  ctx.moveTo(x, y)
  ctx.bezierCurveTo(
    x - size * 0.6, y + size * 0.8,
    x - size * 0.5, y + size * 1.4,
    x, y + size * 1.5
  )
  ctx.bezierCurveTo(
    x + size * 0.5, y + size * 1.4,
    x + size * 0.6, y + size * 0.8,
    x, y
  )
  ctx.closePath()
  ctx.fill()

  // Small highlight for gloss
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`
  ctx.beginPath()
  ctx.ellipse(x - size * 0.12, y + size * 0.5, size * 0.12, size * 0.2, -0.3, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawCryOverlay(
  ctx: CanvasRenderingContext2D,
  keypoints: FaceKeypoint[],
  strength: number
): void {
  const leftIrisCenter = keypoints[468]
  const rightIrisCenter = keypoints[473]
  if (!leftIrisCenter || !rightIrisCenter) return

  const ellipse = computeFaceEllipse(keypoints)
  if (!ellipse) return

  const tearSize = ellipse.rx * 0.08 * (0.5 + strength * 0.5)
  const opacity = clamp(strength * 0.6, 0, 0.6)

  // Left eye tear — positioned below the iris
  const leftTearX = leftIrisCenter.x
  const leftTearY = leftIrisCenter.y + ellipse.ry * 0.12
  drawTeardrop(ctx, leftTearX, leftTearY, tearSize, opacity)

  // Right eye tear
  const rightTearX = rightIrisCenter.x
  const rightTearY = rightIrisCenter.y + ellipse.ry * 0.12
  drawTeardrop(ctx, rightTearX, rightTearY, tearSize, opacity)
}

/**
 * Apply an emotion transformation to a canvas using face mesh keypoints.
 *
 * Returns a new canvas with the transformation applied, or null if
 * keypoints are insufficient for the transformation.
 */
export function applyEmotionTransform(
  canvas: HTMLCanvasElement,
  keypoints: FaceKeypoint[],
  emotion: EmotionType,
  intensity: number
): HTMLCanvasElement | null {
  if (emotion === 'none' || intensity <= 0 || keypoints.length < 468) return null

  const { width, height } = canvas
  if (width === 0 || height === 0) return null

  const strength = clamp(intensity, 0, 100) / 100

  const workCanvas = document.createElement('canvas')
  workCanvas.width = width
  workCanvas.height = height
  const workCtx = workCanvas.getContext('2d')
  if (!workCtx) return null

  workCtx.drawImage(canvas, 0, 0)

  const ellipse = computeFaceEllipse(keypoints)
  if (!ellipse) return null

  // Bounding box with padding
  const pad = 1.5
  const bx0 = Math.max(0, Math.floor(ellipse.cx - ellipse.rx * pad))
  const bx1 = Math.min(width - 1, Math.ceil(ellipse.cx + ellipse.rx * pad))
  const by0 = Math.max(0, Math.floor(ellipse.cy - ellipse.ry * pad))
  const by1 = Math.min(height - 1, Math.ceil(ellipse.cy + ellipse.ry * pad))
  const bw = bx1 - bx0 + 1
  const bh = by1 - by0 + 1

  if (bw <= 0 || bh <= 0) return null

  const dispXY = new Float32Array(bw * bh * 2)

  switch (emotion) {
    case 'laugh':
      gatherLaugh(dispXY, bx0, by0, bw, bh, width, height, keypoints, strength)
      break
    case 'cry':
      gatherCry(dispXY, bx0, by0, bw, bh, width, height, keypoints, strength)
      break
    case 'angry':
      gatherAngry(dispXY, bx0, by0, bw, bh, width, height, keypoints, strength)
      break
    case 'surprised':
      gatherSurprised(dispXY, bx0, by0, bw, bh, width, height, keypoints, strength)
      break
    case 'sad':
      gatherSad(dispXY, bx0, by0, bw, bh, width, height, keypoints, strength)
      break
    default:
      return null
  }

  // Apply displacement field with bilinear sampling
  const srcImageData = workCtx.getImageData(0, 0, width, height)
  const sd = srcImageData.data
  const dstImageData = workCtx.createImageData(width, height)
  const dd = dstImageData.data

  // Copy entire source first (pixels outside the bounding box stay untouched)
  dd.set(sd)

  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      const li = ((y - by0) * bw + (x - bx0)) * 2
      const dx = dispXY[li]
      const dy = dispXY[li + 1]
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) continue

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

  workCtx.putImageData(dstImageData, 0, 0)

  // Draw overlays for cry emotion
  if (emotion === 'cry') {
    drawCryOverlay(workCtx, keypoints, strength)
  }

  return workCanvas
}
