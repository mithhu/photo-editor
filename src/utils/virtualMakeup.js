/**
 * Virtual makeup using face mesh landmarks.
 * Applies color overlays to specific face regions (lips, cheeks, eyes).
 */

import { detectFaceLandmarks, FACE_REGIONS } from './faceMesh'

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 180, g: 60, b: 80 }
}

/**
 * Draw a filled polygon from face mesh keypoints onto a temporary canvas.
 */
function drawRegion(ctx, keypoints, indices) {
  const pts = indices.map(i => keypoints[i]).filter(Boolean)
  if (pts.length < 3) return

  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y)
  }
  ctx.closePath()
  ctx.fill()
}

/**
 * Apply lipstick color to lips.
 * @param {HTMLCanvasElement} canvas
 * @param {Array} keypoints
 * @param {string} color - Hex color
 * @param {number} opacity - 0-100
 */
function applyLipstick(canvas, keypoints, color, opacity) {
  if (opacity <= 0) return

  const ctx = canvas.getContext('2d')
  const { r, g, b } = hexToRgb(color)
  const alpha = (opacity / 100) * 0.55

  const overlay = new OffscreenCanvas(canvas.width, canvas.height)
  const octx = overlay.getContext('2d')

  octx.fillStyle = `rgba(${r},${g},${b},1)`
  drawRegion(octx, keypoints, FACE_REGIONS.lips)

  // Feather the edges
  const feathered = new OffscreenCanvas(canvas.width, canvas.height)
  const fctx = feathered.getContext('2d')
  fctx.filter = 'blur(3px)'
  fctx.drawImage(overlay, 0, 0)

  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(feathered, 0, 0)
  ctx.globalCompositeOperation = 'source-over'

  // Add color overlay for richer tone
  ctx.globalCompositeOperation = 'color'
  ctx.globalAlpha = alpha * 0.5
  ctx.drawImage(feathered, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/**
 * Apply blush to cheeks.
 */
function applyBlush(canvas, keypoints, color, opacity) {
  if (opacity <= 0) return

  const ctx = canvas.getContext('2d')
  const { r, g, b } = hexToRgb(color)
  const alpha = (opacity / 100) * 0.35

  const overlay = new OffscreenCanvas(canvas.width, canvas.height)
  const octx = overlay.getContext('2d')

  octx.fillStyle = `rgba(${r},${g},${b},1)`
  drawRegion(octx, keypoints, FACE_REGIONS.leftCheek)
  drawRegion(octx, keypoints, FACE_REGIONS.rightCheek)

  // Heavy feather for natural blend
  const feathered = new OffscreenCanvas(canvas.width, canvas.height)
  const fctx = feathered.getContext('2d')
  fctx.filter = 'blur(15px)'
  fctx.drawImage(overlay, 0, 0)

  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(feathered, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/**
 * Apply eyeliner along eye contours.
 */
function applyEyeliner(canvas, keypoints, color, opacity) {
  if (opacity <= 0) return

  const ctx = canvas.getContext('2d')
  const { r, g, b } = hexToRgb(color)
  const alpha = (opacity / 100) * 0.7

  const overlay = new OffscreenCanvas(canvas.width, canvas.height)
  const octx = overlay.getContext('2d')

  octx.strokeStyle = `rgba(${r},${g},${b},1)`
  octx.lineWidth = Math.max(1, canvas.width * 0.002)
  octx.lineCap = 'round'
  octx.lineJoin = 'round'

  for (const eyeRegion of [FACE_REGIONS.leftEye, FACE_REGIONS.rightEye]) {
    // Top eyelid contour (upper half of eye points)
    const pts = eyeRegion.slice(0, Math.ceil(eyeRegion.length / 2))
      .map(i => keypoints[i]).filter(Boolean)
    if (pts.length < 2) continue

    octx.beginPath()
    octx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      octx.lineTo(pts[i].x, pts[i].y)
    }
    octx.stroke()
  }

  // Feather slightly
  const feathered = new OffscreenCanvas(canvas.width, canvas.height)
  const fctx = feathered.getContext('2d')
  fctx.filter = 'blur(1px)'
  fctx.drawImage(overlay, 0, 0)

  ctx.globalAlpha = alpha
  ctx.drawImage(feathered, 0, 0)
  ctx.globalAlpha = 1
}

/**
 * Apply eyeshadow above the upper eyelid.
 */
function applyEyeshadow(canvas, keypoints, color, opacity) {
  if (opacity <= 0) return

  const ctx = canvas.getContext('2d')
  const { r, g, b } = hexToRgb(color)
  const alpha = (opacity / 100) * 0.4

  const overlay = new OffscreenCanvas(canvas.width, canvas.height)
  const octx = overlay.getContext('2d')

  // Eye shadow region: above the eye between eyebrow and upper eyelid
  for (const [eyeRegion, browRegion] of [
    [FACE_REGIONS.leftEye, FACE_REGIONS.leftEyebrow],
    [FACE_REGIONS.rightEye, FACE_REGIONS.rightEyebrow],
  ]) {
    const eyePts = eyeRegion.slice(0, Math.ceil(eyeRegion.length / 2))
      .map(i => keypoints[i]).filter(Boolean)
    const browPts = browRegion.map(i => keypoints[i]).filter(Boolean)
    if (eyePts.length < 2 || browPts.length < 2) continue

    octx.fillStyle = `rgba(${r},${g},${b},1)`
    octx.beginPath()
    // Trace upper eyelid forward
    octx.moveTo(eyePts[0].x, eyePts[0].y)
    for (const p of eyePts) octx.lineTo(p.x, p.y)
    // Trace eyebrow backward
    for (let i = browPts.length - 1; i >= 0; i--) {
      octx.lineTo(browPts[i].x, browPts[i].y)
    }
    octx.closePath()
    octx.fill()
  }

  // Heavy feather for diffuse look
  const feathered = new OffscreenCanvas(canvas.width, canvas.height)
  const fctx = feathered.getContext('2d')
  fctx.filter = 'blur(8px)'
  fctx.drawImage(overlay, 0, 0)

  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(feathered, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/**
 * Apply all makeup effects to a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} settings
 * @returns {Promise<boolean>}
 */
export async function applyVirtualMakeup(canvas, settings) {
  const {
    lipstick = { color: '#cc3355', opacity: 0 },
    blush = { color: '#e88899', opacity: 0 },
    eyeliner = { color: '#222222', opacity: 0 },
    eyeshadow = { color: '#886699', opacity: 0 },
  } = settings

  const hasEffect = lipstick.opacity > 0 || blush.opacity > 0 ||
    eyeliner.opacity > 0 || eyeshadow.opacity > 0

  if (!hasEffect) return false

  const faces = await detectFaceLandmarks(canvas)
  if (!faces?.length) return false

  for (const face of faces) {
    const kp = face.keypoints
    if (lipstick.opacity > 0) applyLipstick(canvas, kp, lipstick.color, lipstick.opacity)
    if (blush.opacity > 0) applyBlush(canvas, kp, blush.color, blush.opacity)
    if (eyeliner.opacity > 0) applyEyeliner(canvas, kp, eyeliner.color, eyeliner.opacity)
    if (eyeshadow.opacity > 0) applyEyeshadow(canvas, kp, eyeshadow.color, eyeshadow.opacity)
  }

  return true
}

export const MAKEUP_PRESETS = {
  natural: {
    name: 'Natural',
    lipstick: { color: '#d4837c', opacity: 30 },
    blush: { color: '#e8a0a0', opacity: 20 },
    eyeliner: { color: '#555555', opacity: 15 },
    eyeshadow: { color: '#c4a882', opacity: 10 },
  },
  glam: {
    name: 'Glam',
    lipstick: { color: '#cc2244', opacity: 60 },
    blush: { color: '#e87788', opacity: 40 },
    eyeliner: { color: '#111111', opacity: 50 },
    eyeshadow: { color: '#886699', opacity: 35 },
  },
  soft: {
    name: 'Soft',
    lipstick: { color: '#e09090', opacity: 25 },
    blush: { color: '#f0b0b0', opacity: 25 },
    eyeliner: { color: '#888888', opacity: 10 },
    eyeshadow: { color: '#d4b8cc', opacity: 15 },
  },
  bold: {
    name: 'Bold',
    lipstick: { color: '#aa1133', opacity: 70 },
    blush: { color: '#dd6677', opacity: 45 },
    eyeliner: { color: '#000000', opacity: 60 },
    eyeshadow: { color: '#663399', opacity: 45 },
  },
  korean: {
    name: 'K-Beauty',
    lipstick: { color: '#e06070', opacity: 40 },
    blush: { color: '#f0a8b0', opacity: 30 },
    eyeliner: { color: '#555555', opacity: 20 },
    eyeshadow: { color: '#e0c0b0', opacity: 15 },
  },
}
