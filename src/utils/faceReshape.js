/**
 * Face reshaping using face mesh landmark displacement.
 * Applies subtle warping (mesh-based) to reshape facial features.
 *
 * All functions accept keypoints directly — caller handles face detection.
 */

import { FACE_REGIONS } from './faceMesh'

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v
}

function displace(src, dst, cx, cy, radius, dx, dy) {
  const { width, height } = src
  const sd = src.data
  const dd = dst.data
  const r2 = radius * radius

  const minX = Math.max(0, Math.floor(cx - radius))
  const maxX = Math.min(width - 1, Math.ceil(cx + radius))
  const minY = Math.max(0, Math.floor(cy - radius))
  const maxY = Math.min(height - 1, Math.ceil(cy + radius))

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const distSq = (x - cx) ** 2 + (y - cy) ** 2
      if (distSq >= r2) continue

      const factor = 1 - Math.sqrt(distSq) / radius
      const weight = factor * factor

      const srcX = clamp(Math.round(x - dx * weight), 0, width - 1)
      const srcY = clamp(Math.round(y - dy * weight), 0, height - 1)

      const dstIdx = (y * width + x) * 4
      const srcIdx = (srcY * width + srcX) * 4

      dd[dstIdx] = sd[srcIdx]
      dd[dstIdx + 1] = sd[srcIdx + 1]
      dd[dstIdx + 2] = sd[srcIdx + 2]
      dd[dstIdx + 3] = sd[srcIdx + 3]
    }
  }
}

function applySlimFace(src, dst, keypoints, amount) {
  if (amount <= 0) return

  const jaw = FACE_REGIONS.jawline.map(i => keypoints[i]).filter(Boolean)
  if (jaw.length < 5) return

  let sumX = 0
  jaw.forEach(p => { sumX += p.x })
  const cx = sumX / jaw.length

  const faceWidth = Math.abs(jaw[0].x - jaw[jaw.length - 1].x) || 100

  const strength = amount / 100
  const radius = faceWidth * 0.3

  for (const pt of jaw) {
    const dx = (pt.x - cx) * strength * 0.08
    displace(src, dst, pt.x, pt.y, radius, dx, 0)
  }
}

function applyBiggerEyes(src, dst, keypoints, amount) {
  if (amount <= 0) return

  const strength = amount / 100

  for (const eyeRegion of [FACE_REGIONS.leftEye, FACE_REGIONS.rightEye]) {
    const pts = eyeRegion.map(i => keypoints[i]).filter(Boolean)
    if (pts.length < 4) continue

    let cx = 0, cy = 0
    pts.forEach(p => { cx += p.x; cy += p.y })
    cx /= pts.length
    cy /= pts.length

    let maxDist = 0
    pts.forEach(p => {
      const d = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2)
      if (d > maxDist) maxDist = d
    })

    const radius = maxDist * 2.5
    const scale = strength * 0.15

    const { width, height } = src
    const sd = src.data
    const dd = dst.data
    const r2 = radius * radius

    const minX = Math.max(0, Math.floor(cx - radius))
    const maxX = Math.min(width - 1, Math.ceil(cx + radius))
    const minY = Math.max(0, Math.floor(cy - radius))
    const maxY = Math.min(height - 1, Math.ceil(cy + radius))

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const distSq = (x - cx) ** 2 + (y - cy) ** 2
        if (distSq >= r2) continue

        const dist = Math.sqrt(distSq)
        const factor = 1 - dist / radius
        const weight = factor * factor * scale

        const srcX = clamp(Math.round(cx + (x - cx) * (1 - weight)), 0, width - 1)
        const srcY = clamp(Math.round(cy + (y - cy) * (1 - weight)), 0, height - 1)

        const dstIdx = (y * width + x) * 4
        const srcIdx = (srcY * width + srcX) * 4

        dd[dstIdx] = sd[srcIdx]
        dd[dstIdx + 1] = sd[srcIdx + 1]
        dd[dstIdx + 2] = sd[srcIdx + 2]
        dd[dstIdx + 3] = sd[srcIdx + 3]
      }
    }
  }
}

function applyNoseSlim(src, dst, keypoints, amount) {
  if (amount <= 0) return

  const noseTip = keypoints[4]
  const noseLeft = keypoints[129]
  const noseRight = keypoints[358]
  if (!noseTip || !noseLeft || !noseRight) return

  const strength = amount / 100
  const noseWidth = Math.abs(noseLeft.x - noseRight.x)
  const radius = noseWidth * 0.8

  displace(src, dst, noseLeft.x, noseLeft.y, radius, -noseWidth * strength * 0.06, 0)
  displace(src, dst, noseRight.x, noseRight.y, radius, noseWidth * strength * 0.06, 0)
}

function applyJawline(src, dst, keypoints, amount) {
  if (amount <= 0) return

  const chin = keypoints[152]
  const leftJaw = keypoints[172]
  const rightJaw = keypoints[397]
  if (!chin || !leftJaw || !rightJaw) return

  const strength = amount / 100
  const jawWidth = Math.abs(leftJaw.x - rightJaw.x)
  const radius = jawWidth * 0.2

  displace(src, dst, chin.x, chin.y, radius, 0, jawWidth * strength * 0.03)
  displace(src, dst, leftJaw.x, leftJaw.y, radius, -jawWidth * strength * 0.04, jawWidth * strength * 0.02)
  displace(src, dst, rightJaw.x, rightJaw.y, radius, jawWidth * strength * 0.04, jawWidth * strength * 0.02)
}

/**
 * Apply face reshaping to ImageData using pre-detected keypoints.
 * Does NOT call face detection — caller provides keypoints.
 * @returns {ImageData} the modified destination image data
 */
export function applyReshapeToImageData(srcData, keypoints, settings) {
  const { slimFace = 0, biggerEyes = 0, noseSlim = 0, jawline = 0 } = settings

  const dstData = new ImageData(
    new Uint8ClampedArray(srcData.data),
    srcData.width,
    srcData.height,
  )

  if (slimFace > 0) applySlimFace(srcData, dstData, keypoints, slimFace)
  if (biggerEyes > 0) applyBiggerEyes(srcData, dstData, keypoints, biggerEyes)
  if (noseSlim > 0) applyNoseSlim(srcData, dstData, keypoints, noseSlim)
  if (jawline > 0) applyJawline(srcData, dstData, keypoints, jawline)

  return dstData
}
