/**
 * Client-side beauty filters using face mesh landmarks.
 * All processing happens on canvas — no server required.
 *
 * Uses face oval as the primary skin mask with eye/mouth exclusion
 * for natural, artifact-free results.
 *
 * Performance: skin mask is computed once and shared across all filters.
 * Skin blur uses a fast O(n*r) separable two-pass approach.
 */

import { FACE_REGIONS } from './faceMesh'

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v)
}

function drawLandmarkPath(ctx, keypoints, indices) {
  const pts = indices.map(i => keypoints[i]).filter(Boolean)
  if (pts.length < 3) return false
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y)
  }
  ctx.closePath()
  return true
}

function createMultiRegionMask(keypoints, regionArrays, width, height, feather = 8) {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  ctx.fillStyle = 'white'
  for (const indices of regionArrays) {
    if (drawLandmarkPath(ctx, keypoints, indices)) ctx.fill()
  }

  if (feather > 0) {
    const blurred = new OffscreenCanvas(width, height)
    const bctx = blurred.getContext('2d', { willReadFrequently: true })
    bctx.filter = `blur(${feather}px)`
    bctx.drawImage(canvas, 0, 0)
    const imgData = bctx.getImageData(0, 0, width, height)
    const mask = new Float32Array(width * height)
    for (let i = 0; i < mask.length; i++) mask[i] = imgData.data[i * 4] / 255
    return mask
  }

  const imgData = ctx.getImageData(0, 0, width, height)
  const mask = new Float32Array(width * height)
  for (let i = 0; i < mask.length; i++) mask[i] = imgData.data[i * 4] / 255
  return mask
}

function createSkinMask(keypoints, width, height) {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  ctx.fillStyle = 'white'
  if (!drawLandmarkPath(ctx, keypoints, FACE_REGIONS.faceOval)) return null
  ctx.fill()

  const hardBoundary = ctx.getImageData(0, 0, width, height)
  const hardMask = new Uint8Array(width * height)
  for (let i = 0; i < hardMask.length; i++) {
    hardMask[i] = hardBoundary.data[i * 4] > 128 ? 1 : 0
  }

  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = 'white'
  const exclusions = [
    FACE_REGIONS.leftEye, FACE_REGIONS.rightEye,
    FACE_REGIONS.leftEyebrow, FACE_REGIONS.rightEyebrow,
    FACE_REGIONS.lips,
  ]
  for (const region of exclusions) {
    if (drawLandmarkPath(ctx, keypoints, region)) ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'

  const blurRadius = Math.max(6, Math.round(width * 0.015))
  const feathered = new OffscreenCanvas(width, height)
  const fctx = feathered.getContext('2d', { willReadFrequently: true })
  fctx.filter = `blur(${blurRadius}px)`
  fctx.drawImage(canvas, 0, 0)

  const imgData = fctx.getImageData(0, 0, width, height)
  const mask = new Float32Array(width * height)
  for (let i = 0; i < mask.length; i++) {
    const featheredVal = imgData.data[i * 4] / 255
    mask[i] = hardMask[i] ? featheredVal : 0
  }
  return mask
}

/**
 * Fast separable two-pass skin-aware blur: O(n * r) instead of O(n * r^2).
 * Pass 1: horizontal blur, Pass 2: vertical blur.
 * Only samples from skin-masked pixels.
 */
function skinAwareBlur(data, width, height, skinMask, radius, intensity) {
  const len = width * height
  const tmpR = new Float32Array(len)
  const tmpG = new Float32Array(len)
  const tmpB = new Float32Array(len)
  const tmpW = new Float32Array(len)

  // Extract original channels
  const origR = new Float32Array(len)
  const origG = new Float32Array(len)
  const origB = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    const pi = i * 4
    origR[i] = data[pi]
    origG[i] = data[pi + 1]
    origB[i] = data[pi + 2]
  }

  // Pass 1: Horizontal blur with running sum
  for (let y = 0; y < height; y++) {
    const rowOff = y * width
    let sumR = 0, sumG = 0, sumB = 0, sumW = 0

    // Initialize window [0, radius]
    for (let x = 0; x <= Math.min(radius, width - 1); x++) {
      const ni = rowOff + x
      const w = skinMask[ni]
      sumR += origR[ni] * w; sumG += origG[ni] * w; sumB += origB[ni] * w; sumW += w
    }

    for (let x = 0; x < width; x++) {
      const i = rowOff + x
      tmpR[i] = sumR; tmpG[i] = sumG; tmpB[i] = sumB; tmpW[i] = sumW

      // Slide window: add right edge, remove left edge
      const addX = x + radius + 1
      if (addX < width) {
        const ni = rowOff + addX
        const w = skinMask[ni]
        sumR += origR[ni] * w; sumG += origG[ni] * w; sumB += origB[ni] * w; sumW += w
      }
      const remX = x - radius
      if (remX >= 0) {
        const ni = rowOff + remX
        const w = skinMask[ni]
        sumR -= origR[ni] * w; sumG -= origG[ni] * w; sumB -= origB[ni] * w; sumW -= w
      }
    }
  }

  // Pass 2: Vertical blur on the horizontal result, and apply
  for (let x = 0; x < width; x++) {
    let sumR = 0, sumG = 0, sumB = 0, sumW = 0

    for (let y = 0; y <= Math.min(radius, height - 1); y++) {
      const i = y * width + x
      sumR += tmpR[i]; sumG += tmpG[i]; sumB += tmpB[i]; sumW += tmpW[i]
    }

    for (let y = 0; y < height; y++) {
      const i = y * width + x
      if (skinMask[i] >= 0.05 && sumW > 0.5) {
        const avgR = sumR / sumW
        const avgG = sumG / sumW
        const avgB = sumB / sumW
        const blend = skinMask[i] * intensity
        const pi = i * 4
        data[pi] = clamp(data[pi] * (1 - blend) + avgR * blend)
        data[pi + 1] = clamp(data[pi + 1] * (1 - blend) + avgG * blend)
        data[pi + 2] = clamp(data[pi + 2] * (1 - blend) + avgB * blend)
      }

      const addY = y + radius + 1
      if (addY < height) {
        const ni = addY * width + x
        sumR += tmpR[ni]; sumG += tmpG[ni]; sumB += tmpB[ni]; sumW += tmpW[ni]
      }
      const remY = y - radius
      if (remY >= 0) {
        const ni = remY * width + x
        sumR -= tmpR[ni]; sumG -= tmpG[ni]; sumB -= tmpB[ni]; sumW -= tmpW[ni]
      }
    }
  }
}

function applySkinSmoothing(imageData, keypoints, amount, skinMask) {
  if (amount <= 0 || !keypoints?.length) return

  const { width, height, data } = imageData
  const intensity = amount / 100
  if (!skinMask) return

  const radius = Math.max(2, Math.round(2 + intensity * 4))
  skinAwareBlur(data, width, height, skinMask, radius, intensity * 0.65)
}

function applySkinToneEvenness(imageData, keypoints, amount, skinMask) {
  if (amount <= 0 || !keypoints?.length) return

  const { data } = imageData
  const intensity = amount / 100
  if (!skinMask) return

  let totalR = 0, totalG = 0, totalB = 0, count = 0
  for (let i = 0; i < skinMask.length; i++) {
    if (skinMask[i] > 0.6) {
      const pi = i * 4
      totalR += data[pi]
      totalG += data[pi + 1]
      totalB += data[pi + 2]
      count++
    }
  }
  if (count === 0) return

  const avgR = totalR / count
  const avgG = totalG / count
  const avgB = totalB / count

  const blend = intensity * 0.12
  for (let i = 0; i < skinMask.length; i++) {
    if (skinMask[i] < 0.05) continue
    const pi = i * 4
    const r = data[pi], g = data[pi + 1], b = data[pi + 2]

    const deviation = Math.abs(r - avgR) + Math.abs(g - avgG) + Math.abs(b - avgB)
    if (deviation < 15) continue

    const m = skinMask[i] * blend * Math.min(1, deviation / 80)
    data[pi] = clamp(r + (avgR - r) * m)
    data[pi + 1] = clamp(g + (avgG - g) * m)
    data[pi + 2] = clamp(b + (avgB - b) * m)
  }
}

function applyBlemishRemoval(imageData, keypoints, amount, skinMask) {
  if (amount <= 0 || !keypoints?.length) return

  const { width, height, data } = imageData
  const intensity = amount / 100
  if (!skinMask) return

  const copy = new Uint8ClampedArray(data)
  const radius = 2

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = y * width + x
      if (skinMask[idx] < 0.2) continue

      const pi = idx * 4
      const cr = copy[pi], cg = copy[pi + 1], cb = copy[pi + 2]

      let sumR = 0, sumG = 0, sumB = 0, n = 0
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ni = ((y + dy) * width + (x + dx)) * 4
          sumR += copy[ni]; sumG += copy[ni + 1]; sumB += copy[ni + 2]
          n++
        }
      }
      const avgR = sumR / n, avgG = sumG / n, avgB = sumB / n

      const diff = Math.abs(cr - avgR) + Math.abs(cg - avgG) + Math.abs(cb - avgB)
      const threshold = 35 - intensity * 15

      if (diff > threshold) {
        const blend = Math.min(1, (diff - threshold) / 50) * intensity * skinMask[idx] * 0.6
        data[pi] = clamp(cr * (1 - blend) + avgR * blend)
        data[pi + 1] = clamp(cg * (1 - blend) + avgG * blend)
        data[pi + 2] = clamp(cb * (1 - blend) + avgB * blend)
      }
    }
  }
}

function applyBrightenEyes(imageData, keypoints, amount) {
  if (amount <= 0 || !keypoints?.length) return

  const { width, height, data } = imageData
  const intensity = amount / 100

  const eyeFeather = Math.max(1, Math.round(width * 0.004))
  const eyeMask = createMultiRegionMask(keypoints, [
    FACE_REGIONS.leftEye, FACE_REGIONS.rightEye,
  ], width, height, eyeFeather)

  if (eyeMask) {
    for (let i = 0; i < eyeMask.length; i++) {
      if (eyeMask[i] < 0.1) continue
      const pi = i * 4
      const r = data[pi], g = data[pi + 1], b = data[pi + 2]
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      if (lum < 80) continue

      const whiteness = Math.min(1, (lum - 80) / 100)
      const boost = eyeMask[i] * intensity * 0.4 * whiteness
      const gray = lum
      data[pi] = clamp(r + (gray - r) * boost * 0.3 + (255 - r) * boost * 0.3)
      data[pi + 1] = clamp(g + (gray - g) * boost * 0.2 + (255 - g) * boost * 0.3)
      data[pi + 2] = clamp(b + (gray - b) * boost * 0.2 + (255 - b) * boost * 0.3)
    }
  }

  const underEyeLeft = [111, 116, 117, 118, 119, 120, 121, 128, 245]
  const underEyeRight = [340, 345, 346, 347, 348, 349, 350, 357, 465]
  const underFeather = Math.max(2, Math.round(width * 0.008))
  const underMask = createMultiRegionMask(keypoints, [
    underEyeLeft, underEyeRight,
  ], width, height, underFeather)

  if (underMask) {
    const cheekMask = createMultiRegionMask(keypoints, [
      FACE_REGIONS.leftCheek, FACE_REGIONS.rightCheek,
    ], width, height, 2)

    let cheekR = 0, cheekG = 0, cheekB = 0, cheekN = 0
    if (cheekMask) {
      for (let i = 0; i < cheekMask.length; i++) {
        if (cheekMask[i] < 0.5) continue
        const pi = i * 4
        cheekR += data[pi]; cheekG += data[pi + 1]; cheekB += data[pi + 2]
        cheekN++
      }
    }
    const tR = cheekN > 0 ? cheekR / cheekN : 170
    const tG = cheekN > 0 ? cheekG / cheekN : 140
    const tB = cheekN > 0 ? cheekB / cheekN : 130

    for (let i = 0; i < underMask.length; i++) {
      if (underMask[i] < 0.1) continue
      const pi = i * 4
      const r = data[pi], g = data[pi + 1], b = data[pi + 2]
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      const targetLum = 0.299 * tR + 0.587 * tG + 0.114 * tB
      if (lum >= targetLum) continue

      const darkness = Math.min(1, (targetLum - lum) / 60)
      const lift = underMask[i] * intensity * 0.1 * darkness
      data[pi] = clamp(r + (tR - r) * lift)
      data[pi + 1] = clamp(g + (tG - g) * lift)
      data[pi + 2] = clamp(b + (tB - b) * lift)
    }
  }
}

function applyTeethWhitening(imageData, keypoints, amount) {
  if (amount <= 0 || !keypoints?.length) return

  const { width, height, data } = imageData
  const intensity = amount / 100

  const feather = Math.max(1, Math.round(width * 0.004))
  const mask = createMultiRegionMask(keypoints, [FACE_REGIONS.innerLips], width, height, feather)
  if (!mask) return

  for (let i = 0; i < mask.length; i++) {
    if (mask[i] < 0.02) continue
    const pi = i * 4
    const r = data[pi], g = data[pi + 1], b = data[pi + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    if (lum < 70) continue

    const lumFactor = Math.min(1, (lum - 70) / 100)
    const blend = mask[i] * intensity * 0.55 * lumFactor
    data[pi] = clamp(r + (lum - r) * blend * 0.4 + 10 * blend)
    data[pi + 1] = clamp(g + (lum - g) * blend * 0.4 + 10 * blend)
    data[pi + 2] = clamp(b + (lum - b) * blend * 0.3 + 12 * blend)
  }
}

export function applyBeautyToImageData(imageData, keypoints, settings) {
  const { smooth = 0, blemish = 0, evenness = 0, brightenEyes = 0, teethWhiten = 0 } = settings
  const needsSkinMask = smooth > 0 || blemish > 0 || evenness > 0
  const skinMask = needsSkinMask ? createSkinMask(keypoints, imageData.width, imageData.height) : null

  if (smooth > 0) applySkinSmoothing(imageData, keypoints, smooth, skinMask)
  if (blemish > 0) applyBlemishRemoval(imageData, keypoints, blemish, skinMask)
  if (evenness > 0) applySkinToneEvenness(imageData, keypoints, evenness, skinMask)
  if (brightenEyes > 0) applyBrightenEyes(imageData, keypoints, brightenEyes)
  if (teethWhiten > 0) applyTeethWhitening(imageData, keypoints, teethWhiten)
}
