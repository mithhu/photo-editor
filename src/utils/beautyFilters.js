/**
 * Client-side beauty filters using face mesh landmarks.
 * All processing happens on canvas — no server required.
 *
 * Uses face oval as the primary skin mask with eye/mouth exclusion
 * for natural, artifact-free results.
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

/**
 * Create a mask from multiple separate regions, each drawn as its own polygon.
 * This avoids the problem of connecting unrelated landmarks across the face.
 */
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

/**
 * Build a smooth skin mask using the face oval, excluding eyes, brows, and mouth.
 * Uses inward-only feathering so the mask never bleeds outside the face oval.
 */
function createSkinMask(keypoints, width, height) {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  // Draw the hard face oval boundary
  ctx.fillStyle = 'white'
  if (!drawLandmarkPath(ctx, keypoints, FACE_REGIONS.faceOval)) return null
  ctx.fill()

  // Read the hard boundary before exclusions (used to clamp the feathered mask)
  const hardBoundary = ctx.getImageData(0, 0, width, height)
  const hardMask = new Uint8Array(width * height)
  for (let i = 0; i < hardMask.length; i++) {
    hardMask[i] = hardBoundary.data[i * 4] > 128 ? 1 : 0
  }

  // Cut out eyes, eyebrows, and mouth
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = 'white'
  const exclusions = [
    FACE_REGIONS.leftEye,
    FACE_REGIONS.rightEye,
    FACE_REGIONS.leftEyebrow,
    FACE_REGIONS.rightEyebrow,
    FACE_REGIONS.lips,
  ]
  for (const region of exclusions) {
    if (drawLandmarkPath(ctx, keypoints, region)) ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'

  // Feather the mask for smooth transitions
  const blurRadius = Math.max(10, Math.round(width * 0.02))
  const feathered = new OffscreenCanvas(width, height)
  const fctx = feathered.getContext('2d', { willReadFrequently: true })
  fctx.filter = `blur(${blurRadius}px)`
  fctx.drawImage(canvas, 0, 0)

  const imgData = fctx.getImageData(0, 0, width, height)
  const mask = new Float32Array(width * height)
  for (let i = 0; i < mask.length; i++) {
    // Clamp: the feathered value can never exceed the hard boundary.
    // This means blur only softens edges inward, never leaks outward.
    const featheredVal = imgData.data[i * 4] / 255
    mask[i] = hardMask[i] ? featheredVal : 0
  }
  return mask
}

/**
 * Skin-aware box blur: only averages pixels that are within the skin mask,
 * preventing color bleed from hair/background into the skin.
 */
function skinAwareBlur(data, width, height, skinMask, radius, intensity) {
  const len = width * height
  const origR = new Float32Array(len)
  const origG = new Float32Array(len)
  const origB = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    const pi = i * 4
    origR[i] = data[pi]
    origG[i] = data[pi + 1]
    origB[i] = data[pi + 2]
  }

  // Simple weighted average within mask — only sample from skin pixels
  for (let i = 0; i < len; i++) {
    if (skinMask[i] < 0.05) continue

    const x = i % width
    const y = (i - x) / width

    let sumR = 0, sumG = 0, sumB = 0, weight = 0
    const minY = Math.max(0, y - radius)
    const maxY = Math.min(height - 1, y + radius)
    const minX = Math.max(0, x - radius)
    const maxX = Math.min(width - 1, x + radius)

    for (let ny = minY; ny <= maxY; ny++) {
      for (let nx = minX; nx <= maxX; nx++) {
        const ni = ny * width + nx
        const w = skinMask[ni]
        if (w < 0.05) continue
        sumR += origR[ni] * w
        sumG += origG[ni] * w
        sumB += origB[ni] * w
        weight += w
      }
    }

    if (weight < 0.5) continue

    const avgR = sumR / weight
    const avgG = sumG / weight
    const avgB = sumB / weight

    const blend = skinMask[i] * intensity
    const pi = i * 4
    data[pi] = clamp(data[pi] * (1 - blend) + avgR * blend)
    data[pi + 1] = clamp(data[pi + 1] * (1 - blend) + avgG * blend)
    data[pi + 2] = clamp(data[pi + 2] * (1 - blend) + avgB * blend)
  }
}

export function applySkinSmoothing(imageData, keypoints, amount) {
  if (amount <= 0 || !keypoints?.length) return

  const { width, height, data } = imageData
  const intensity = amount / 100
  const skinMask = createSkinMask(keypoints, width, height)
  if (!skinMask) return

  const radius = Math.max(2, Math.round(3 + intensity * 6))
  skinAwareBlur(data, width, height, skinMask, radius, intensity * 0.65)
}

export function applySkinToneEvenness(imageData, keypoints, amount) {
  if (amount <= 0 || !keypoints?.length) return

  const { width, height, data } = imageData
  const intensity = amount / 100
  const skinMask = createSkinMask(keypoints, width, height)
  if (!skinMask) return

  // Compute the average skin tone (only from well-masked skin pixels)
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

  // Only even out pixels that deviate significantly from the average,
  // preserving natural color while reducing uneven patches/spots.
  const blend = intensity * 0.12
  for (let i = 0; i < skinMask.length; i++) {
    if (skinMask[i] < 0.05) continue
    const pi = i * 4
    const r = data[pi], g = data[pi + 1], b = data[pi + 2]

    // Only affect pixels that differ noticeably from the mean skin tone
    const deviation = Math.abs(r - avgR) + Math.abs(g - avgG) + Math.abs(b - avgB)
    if (deviation < 15) continue

    const m = skinMask[i] * blend * Math.min(1, deviation / 80)
    data[pi] = clamp(r + (avgR - r) * m)
    data[pi + 1] = clamp(g + (avgG - g) * m)
    data[pi + 2] = clamp(b + (avgB - b) * m)
  }
}

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

export function applyBrightenEyes(imageData, keypoints, amount) {
  if (amount <= 0 || !keypoints?.length) return

  const { width, height, data } = imageData
  const intensity = amount / 100

  // --- Part 1: Whiten the sclera (eye whites) ---
  // Use a tight mask around each eye opening
  const eyeFeather = Math.max(2, Math.round(width * 0.004))
  const eyeMask = createMultiRegionMask(keypoints, [
    FACE_REGIONS.leftEye,
    FACE_REGIONS.rightEye,
  ], width, height, eyeFeather)

  if (eyeMask) {
    for (let i = 0; i < eyeMask.length; i++) {
      if (eyeMask[i] < 0.1) continue
      const pi = i * 4
      const r = data[pi], g = data[pi + 1], b = data[pi + 2]
      const lum = 0.299 * r + 0.587 * g + 0.114 * b

      // Only affect the white part of the eye (sclera), not iris/pupil/lashes.
      // Sclera is typically lum > 100, reddish tint.
      if (lum < 80) continue

      const whiteness = Math.min(1, (lum - 80) / 100)
      const boost = eyeMask[i] * intensity * 0.4 * whiteness

      // Brighten toward white and slightly desaturate (remove redness)
      const gray = lum
      data[pi] = clamp(r + (gray - r) * boost * 0.3 + (255 - r) * boost * 0.3)
      data[pi + 1] = clamp(g + (gray - g) * boost * 0.2 + (255 - g) * boost * 0.3)
      data[pi + 2] = clamp(b + (gray - b) * boost * 0.2 + (255 - b) * boost * 0.3)
    }
  }

  // --- Part 2: Reduce under-eye dark circles ---
  const underEyeLeft = [111, 116, 117, 118, 119, 120, 121, 128, 245]
  const underEyeRight = [340, 345, 346, 347, 348, 349, 350, 357, 465]
  const underFeather = Math.max(4, Math.round(width * 0.01))
  const underMask = createMultiRegionMask(keypoints, [
    underEyeLeft,
    underEyeRight,
  ], width, height, underFeather)

  if (underMask) {
    // Sample the actual cheek skin tone to use as a natural lift target
    const cheekMask = createMultiRegionMask(keypoints, [
      FACE_REGIONS.leftCheek,
      FACE_REGIONS.rightCheek,
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
    // Fallback if cheek sampling fails
    const tR = cheekN > 0 ? cheekR / cheekN : 170
    const tG = cheekN > 0 ? cheekG / cheekN : 140
    const tB = cheekN > 0 ? cheekB / cheekN : 130

    for (let i = 0; i < underMask.length; i++) {
      if (underMask[i] < 0.1) continue
      const pi = i * 4
      const r = data[pi], g = data[pi + 1], b = data[pi + 2]
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      const targetLum = 0.299 * tR + 0.587 * tG + 0.114 * tB

      // Only lift pixels darker than the cheek skin (actual dark circles)
      if (lum >= targetLum) continue

      const darkness = Math.min(1, (targetLum - lum) / 60)
      const lift = underMask[i] * intensity * 0.1 * darkness
      data[pi] = clamp(r + (tR - r) * lift)
      data[pi + 1] = clamp(g + (tG - g) * lift)
      data[pi + 2] = clamp(b + (tB - b) * lift)
    }
  }
}

export function applyTeethWhitening(imageData, keypoints, amount) {
  if (amount <= 0 || !keypoints?.length) return

  const { width, height, data } = imageData
  const intensity = amount / 100

  const feather = Math.max(2, Math.round(width * 0.004))
  const mask = createMultiRegionMask(keypoints, [
    FACE_REGIONS.innerLips,
  ], width, height, feather)
  if (!mask) return

  for (let i = 0; i < mask.length; i++) {
    if (mask[i] < 0.02) continue
    const pi = i * 4
    const r = data[pi], g = data[pi + 1], b = data[pi + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b

    // Only whiten pixels bright enough to be teeth (not lip or gum)
    if (lum < 70) continue

    const lumFactor = Math.min(1, (lum - 70) / 100)
    const blend = mask[i] * intensity * 0.55 * lumFactor
    // Desaturate yellow tint and brighten
    data[pi] = clamp(r + (lum - r) * blend * 0.4 + 10 * blend)
    data[pi + 1] = clamp(g + (lum - g) * blend * 0.4 + 10 * blend)
    data[pi + 2] = clamp(b + (lum - b) * blend * 0.3 + 12 * blend)
  }
}

export function applyBeautyToImageData(imageData, keypoints, settings) {
  const { smooth = 0, blemish = 0, evenness = 0, brightenEyes = 0, teethWhiten = 0 } = settings
  if (smooth > 0) applySkinSmoothing(imageData, keypoints, smooth)
  if (blemish > 0) applyBlemishRemoval(imageData, keypoints, blemish)
  if (evenness > 0) applySkinToneEvenness(imageData, keypoints, evenness)
  if (brightenEyes > 0) applyBrightenEyes(imageData, keypoints, brightenEyes)
  if (teethWhiten > 0) applyTeethWhitening(imageData, keypoints, teethWhiten)
}
