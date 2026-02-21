/**
 * Client-side beauty filters using face mesh landmarks.
 * All processing happens on canvas — no server required.
 */

import { detectFaceLandmarks, FACE_REGIONS } from './faceMesh'

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v)
}

/**
 * Create a mask from face mesh landmark indices.
 * Returns a Uint8Array (0 or 255) matching the image dimensions.
 */
function createRegionMask(keypoints, regionIndices, width, height, feather = 8) {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = 'white'
  ctx.beginPath()
  const pts = regionIndices.map(i => keypoints[i]).filter(Boolean)
  if (pts.length < 3) return null

  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y)
  }
  ctx.closePath()
  ctx.fill()

  if (feather > 0) {
    ctx.filter = `blur(${feather}px)`
    ctx.drawImage(canvas, 0, 0)
  }

  const imgData = ctx.getImageData(0, 0, width, height)
  const mask = new Uint8Array(width * height)
  for (let i = 0; i < mask.length; i++) {
    mask[i] = imgData.data[i * 4]
  }
  return mask
}

/**
 * Create a full skin mask by combining cheeks, forehead, nose, and jaw area.
 */
function createSkinMask(keypoints, width, height) {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')

  const regions = [
    FACE_REGIONS.leftCheek,
    FACE_REGIONS.rightCheek,
    FACE_REGIONS.nose,
    FACE_REGIONS.forehead,
  ]

  ctx.fillStyle = 'white'
  for (const region of regions) {
    const pts = region.map(i => keypoints[i]).filter(Boolean)
    if (pts.length < 3) continue
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y)
    }
    ctx.closePath()
    ctx.fill()
  }

  // Also fill the face oval but with lower opacity for edges
  const oval = FACE_REGIONS.faceOval.map(i => keypoints[i]).filter(Boolean)
  if (oval.length >= 3) {
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.moveTo(oval[0].x, oval[0].y)
    for (let i = 1; i < oval.length; i++) {
      ctx.lineTo(oval[i].x, oval[i].y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // Feather the mask
  const feathered = new OffscreenCanvas(width, height)
  const fctx = feathered.getContext('2d')
  fctx.filter = 'blur(12px)'
  fctx.drawImage(canvas, 0, 0)

  const imgData = fctx.getImageData(0, 0, width, height)
  const mask = new Float32Array(width * height)
  for (let i = 0; i < mask.length; i++) {
    mask[i] = imgData.data[i * 4] / 255
  }
  return mask
}

/**
 * Apply skin smoothing using bilateral-like blur on masked skin regions.
 * @param {ImageData} imageData - The image data to process in-place
 * @param {Array} keypoints - Face mesh keypoints
 * @param {number} amount - Smoothing amount 0-100
 */
export function applySkinSmoothing(imageData, keypoints, amount) {
  if (amount <= 0 || !keypoints?.length) return

  const { width, height, data } = imageData
  const intensity = amount / 100
  const skinMask = createSkinMask(keypoints, width, height)
  if (!skinMask) return

  const radius = Math.max(2, Math.round(3 + intensity * 5))
  const copy = new Uint8ClampedArray(data)

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = y * width + x
      const maskVal = skinMask[idx]
      if (maskVal < 0.1) continue

      const pi = idx * 4
      const cr = copy[pi], cg = copy[pi + 1], cb = copy[pi + 2]

      let sumR = 0, sumG = 0, sumB = 0, sumW = 0

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ni = ((y + dy) * width + (x + dx)) * 4
          const nr = copy[ni], ng = copy[ni + 1], nb = copy[ni + 2]

          // Bilateral weighting: spatial + color distance
          const spatialW = Math.exp(-(dx * dx + dy * dy) / (2 * radius * radius))
          const colorDist = (cr - nr) ** 2 + (cg - ng) ** 2 + (cb - nb) ** 2
          const colorW = Math.exp(-colorDist / (2 * 2500))
          const w = spatialW * colorW

          sumR += nr * w
          sumG += ng * w
          sumB += nb * w
          sumW += w
        }
      }

      if (sumW > 0) {
        const blend = maskVal * intensity
        data[pi] = clamp(cr * (1 - blend) + (sumR / sumW) * blend)
        data[pi + 1] = clamp(cg * (1 - blend) + (sumG / sumW) * blend)
        data[pi + 2] = clamp(cb * (1 - blend) + (sumB / sumW) * blend)
      }
    }
  }
}

/**
 * Improve skin tone evenness by reducing local color variance in skin regions.
 * @param {ImageData} imageData
 * @param {Array} keypoints
 * @param {number} amount - 0-100
 */
export function applySkinToneEvenness(imageData, keypoints, amount) {
  if (amount <= 0 || !keypoints?.length) return

  const { width, height, data } = imageData
  const intensity = amount / 100
  const skinMask = createSkinMask(keypoints, width, height)
  if (!skinMask) return

  // Compute average skin color
  let totalR = 0, totalG = 0, totalB = 0, count = 0
  for (let i = 0; i < skinMask.length; i++) {
    if (skinMask[i] > 0.5) {
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

  // Blend toward average skin tone in masked regions
  const blend = intensity * 0.3
  for (let i = 0; i < skinMask.length; i++) {
    if (skinMask[i] < 0.1) continue
    const pi = i * 4
    const m = skinMask[i] * blend
    data[pi] = clamp(data[pi] + (avgR - data[pi]) * m)
    data[pi + 1] = clamp(data[pi + 1] + (avgG - data[pi + 1]) * m)
    data[pi + 2] = clamp(data[pi + 2] + (avgB - data[pi + 2]) * m)
  }
}

/**
 * Simple blemish reduction by detecting and smoothing high-contrast spots in skin.
 * @param {ImageData} imageData
 * @param {Array} keypoints
 * @param {number} amount - 0-100
 */
export function applyBlemishRemoval(imageData, keypoints, amount) {
  if (amount <= 0 || !keypoints?.length) return

  const { width, height, data } = imageData
  const intensity = amount / 100
  const skinMask = createSkinMask(keypoints, width, height)
  if (!skinMask) return

  const copy = new Uint8ClampedArray(data)
  const radius = 3

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = y * width + x
      if (skinMask[idx] < 0.3) continue

      const pi = idx * 4
      const cr = copy[pi], cg = copy[pi + 1], cb = copy[pi + 2]

      // Compute local average
      let sumR = 0, sumG = 0, sumB = 0, n = 0
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ni = ((y + dy) * width + (x + dx)) * 4
          sumR += copy[ni]; sumG += copy[ni + 1]; sumB += copy[ni + 2]
          n++
        }
      }
      const avgR = sumR / n, avgG = sumG / n, avgB = sumB / n

      // Detect blemish: pixel significantly different from local average
      const diff = Math.abs(cr - avgR) + Math.abs(cg - avgG) + Math.abs(cb - avgB)
      const threshold = 30 - intensity * 15

      if (diff > threshold) {
        const blend = Math.min(1, (diff - threshold) / 40) * intensity * skinMask[idx]
        data[pi] = clamp(cr * (1 - blend) + avgR * blend)
        data[pi + 1] = clamp(cg * (1 - blend) + avgG * blend)
        data[pi + 2] = clamp(cb * (1 - blend) + avgB * blend)
      }
    }
  }
}

/**
 * Brighten under-eye area to reduce dark circles.
 * @param {ImageData} imageData
 * @param {Array} keypoints
 * @param {number} amount - 0-100
 */
export function applyBrightenEyes(imageData, keypoints, amount) {
  if (amount <= 0 || !keypoints?.length) return

  const { width, height, data } = imageData
  const intensity = amount / 100

  // Under-eye region indices
  const underEyeLeft = [111, 117, 118, 119, 120, 121, 128, 245]
  const underEyeRight = [340, 346, 347, 348, 349, 350, 357, 465]

  const mask = createRegionMask(keypoints, [...underEyeLeft, ...underEyeRight], width, height, 10)
  if (!mask) return

  for (let i = 0; i < mask.length; i++) {
    if (mask[i] < 10) continue
    const pi = i * 4
    const blend = (mask[i] / 255) * intensity * 0.2
    data[pi] = clamp(data[pi] + data[pi] * blend)
    data[pi + 1] = clamp(data[pi + 1] + data[pi + 1] * blend)
    data[pi + 2] = clamp(data[pi + 2] + data[pi + 2] * blend)
  }
}

/**
 * Whiten teeth by desaturating and brightening the inner lip/teeth area.
 * @param {ImageData} imageData
 * @param {Array} keypoints
 * @param {number} amount - 0-100
 */
export function applyTeethWhitening(imageData, keypoints, amount) {
  if (amount <= 0 || !keypoints?.length) return

  const { width, height, data } = imageData
  const intensity = amount / 100

  const mask = createRegionMask(keypoints, FACE_REGIONS.innerLips, width, height, 4)
  if (!mask) return

  for (let i = 0; i < mask.length; i++) {
    if (mask[i] < 10) continue
    const pi = i * 4
    const r = data[pi], g = data[pi + 1], b = data[pi + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b

    // Only process lighter pixels (teeth, not lips)
    if (lum < 100) continue

    const blend = (mask[i] / 255) * intensity
    const desat = 0.5 * blend
    const gray = lum
    data[pi] = clamp(r + (gray - r) * desat + 10 * blend)
    data[pi + 1] = clamp(g + (gray - g) * desat + 10 * blend)
    data[pi + 2] = clamp(b + (gray - b) * desat + 10 * blend)
  }
}

/**
 * Apply all beauty filters at once with individual intensity controls.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} settings - { smooth, blemish, evenness, brightenEyes, teethWhiten }
 * @returns {Promise<boolean>} true if faces were detected and filters applied
 */
export async function applyBeautyFilters(canvas, settings) {
  const { smooth = 0, blemish = 0, evenness = 0, brightenEyes = 0, teethWhiten = 0 } = settings

  if (smooth === 0 && blemish === 0 && evenness === 0 && brightenEyes === 0 && teethWhiten === 0) {
    return false
  }

  const faces = await detectFaceLandmarks(canvas)
  if (!faces?.length) return false

  const ctx = canvas.getContext('2d')
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  for (const face of faces) {
    const kp = face.keypoints
    if (smooth > 0) applySkinSmoothing(imageData, kp, smooth)
    if (blemish > 0) applyBlemishRemoval(imageData, kp, blemish)
    if (evenness > 0) applySkinToneEvenness(imageData, kp, evenness)
    if (brightenEyes > 0) applyBrightenEyes(imageData, kp, brightenEyes)
    if (teethWhiten > 0) applyTeethWhitening(imageData, kp, teethWhiten)
  }

  ctx.putImageData(imageData, 0, 0)
  return true
}
