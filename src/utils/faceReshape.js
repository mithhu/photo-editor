/**
 * Face reshaping using a unified displacement field.
 *
 * Builds a single smooth warp map covering the entire face region, then
 * applies it in one pass with bilinear interpolation. No per-landmark
 * circular regions, so no circular artifacts.
 */

import { FACE_REGIONS } from './faceMesh'

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v
}

function sampleBilinear(data, width, height, fx, fy) {
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

/**
 * Compute a face ellipse from the face oval landmarks.
 * Returns { cx, cy, rx, ry } — the center and radii.
 */
function computeFaceEllipse(keypoints) {
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
 * Slim Face: push pixels inward toward the vertical center axis of the face.
 * Uses an elliptical mask that covers the face, with maximum displacement
 * at the jawline level, tapering off toward forehead and chin.
 */
function gatherSlimFace(dispXY, width, height, keypoints, amount) {
  if (amount <= 0) return

  const ellipse = computeFaceEllipse(keypoints)
  if (!ellipse) return

  const { cx, cy, rx, ry } = ellipse
  const strength = (amount / 100) * 0.12

  // Expand the region slightly beyond the face for smooth falloff
  const padX = rx * 1.3
  const padY = ry * 1.2

  const minX = Math.max(0, Math.floor(cx - padX))
  const maxX = Math.min(width - 1, Math.ceil(cx + padX))
  const minY = Math.max(0, Math.floor(cy - padY))
  const maxY = Math.min(height - 1, Math.ceil(cy + padY))

  // Jawline Y range: displacement is strongest in the lower half of the face
  const jawY = cy + ry * 0.15
  const chinY = cy + ry

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      // Elliptical distance (0 at center, 1 at boundary)
      const nx = (x - cx) / padX
      const ny = (y - cy) / padY
      const ellDist = nx * nx + ny * ny
      if (ellDist >= 1) continue

      // Smooth falloff at ellipse boundary
      const edgeFade = 1 - ellDist
      const edgeWeight = edgeFade * edgeFade * (3 - 2 * edgeFade)

      // Vertical weighting: strongest at jaw level, zero at top of head
      let vertWeight
      if (y < cy - ry * 0.3) {
        vertWeight = 0 // above eyes — no slimming
      } else if (y < jawY) {
        vertWeight = (y - (cy - ry * 0.3)) / (jawY - (cy - ry * 0.3))
        vertWeight = vertWeight * vertWeight
      } else if (y < chinY) {
        vertWeight = 1.0
      } else {
        vertWeight = 0
      }

      // Horizontal displacement: pull inward toward center axis
      const offsetX = (x - cx)
      const dx = -offsetX * strength * edgeWeight * vertWeight

      const idx = (y * width + x) * 2
      dispXY[idx] += dx
    }
  }
}

/**
 * Bigger Eyes: magnify around each eye center.
 */
function gatherBiggerEyes(dispXY, width, height, keypoints, amount) {
  if (amount <= 0) return
  const strength = amount / 100

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
    const scale = strength * 0.15

    const minX = Math.max(0, Math.floor(ecx - radius))
    const maxX = Math.min(width - 1, Math.ceil(ecx + radius))
    const minY = Math.max(0, Math.floor(ecy - radius))
    const maxY = Math.min(height - 1, Math.ceil(ecy + radius))

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dist = Math.sqrt((x - ecx) ** 2 + (y - ecy) ** 2)
        if (dist >= radius) continue
        const t = dist / radius
        const s = 1 - t
        const w = s * s * (3 - 2 * s) * scale
        if (w <= 0.001) continue

        const idx = (y * width + x) * 2
        dispXY[idx] += (x - ecx) * w
        dispXY[idx + 1] += (y - ecy) * w
      }
    }
  }
}

/**
 * Nose Slim: push nose sides inward.
 */
function gatherNoseSlim(dispXY, width, height, keypoints, amount) {
  if (amount <= 0) return

  const noseTip = keypoints[4]
  const noseLeft = keypoints[129]
  const noseRight = keypoints[358]
  const noseBridge = keypoints[6]
  if (!noseTip || !noseLeft || !noseRight || !noseBridge) return

  const strength = amount / 100
  const noseCx = (noseLeft.x + noseRight.x) / 2
  const noseCy = (noseBridge.y + noseTip.y) / 2
  const noseW = Math.abs(noseLeft.x - noseRight.x) * 0.6
  const noseH = Math.abs(noseTip.y - noseBridge.y) * 0.8

  if (noseW < 2 || noseH < 2) return

  const padX = noseW * 1.5
  const padY = noseH * 1.3

  const minX = Math.max(0, Math.floor(noseCx - padX))
  const maxX = Math.min(width - 1, Math.ceil(noseCx + padX))
  const minY = Math.max(0, Math.floor(noseCy - padY))
  const maxY = Math.min(height - 1, Math.ceil(noseCy + padY))

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const nx = (x - noseCx) / padX
      const ny = (y - noseCy) / padY
      const ellDist = nx * nx + ny * ny
      if (ellDist >= 1) continue

      const edgeFade = 1 - ellDist
      const w = edgeFade * edgeFade * (3 - 2 * edgeFade)

      const dx = -(x - noseCx) * strength * 0.06 * w
      const idx = (y * width + x) * 2
      dispXY[idx] += dx
    }
  }
}

/**
 * Jawline: push chin up and jaw corners inward.
 */
function gatherJawline(dispXY, width, height, keypoints, amount) {
  if (amount <= 0) return

  const ellipse = computeFaceEllipse(keypoints)
  if (!ellipse) return

  const chin = keypoints[152]
  if (!chin) return

  const { cx, cy, rx, ry } = ellipse
  const strength = (amount / 100) * 0.05

  const padX = rx * 1.2
  const padY = ry * 0.5
  const regionCy = cy + ry * 0.5

  const minX = Math.max(0, Math.floor(cx - padX))
  const maxX = Math.min(width - 1, Math.ceil(cx + padX))
  const minY = Math.max(0, Math.floor(regionCy - padY))
  const maxY = Math.min(height - 1, Math.ceil(regionCy + padY * 1.5))

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const nx = (x - cx) / padX
      const ny = (y - regionCy) / padY
      const ellDist = nx * nx + ny * ny
      if (ellDist >= 1) continue

      const edgeFade = 1 - ellDist
      const w = edgeFade * edgeFade * (3 - 2 * edgeFade)

      // Push jaw corners inward, chin upward
      const dx = -(x - cx) * strength * w
      const dy = Math.max(0, (y - cy)) * strength * w * 0.5

      const idx = (y * width + x) * 2
      dispXY[idx] += dx
      dispXY[idx + 1] += dy
    }
  }
}

/**
 * Apply face reshaping to ImageData using pre-detected keypoints.
 * Does NOT call face detection — caller provides keypoints.
 * @returns {ImageData} the modified destination image data
 */
export function applyReshapeToImageData(srcData, keypoints, settings) {
  const { slimFace = 0, biggerEyes = 0, noseSlim = 0, jawline = 0 } = settings
  const { width, height } = srcData

  if (slimFace <= 0 && biggerEyes <= 0 && noseSlim <= 0 && jawline <= 0) {
    return new ImageData(new Uint8ClampedArray(srcData.data), width, height)
  }

  // Phase 1: Build unified displacement field
  const dispXY = new Float32Array(width * height * 2)

  gatherSlimFace(dispXY, width, height, keypoints, slimFace)
  gatherBiggerEyes(dispXY, width, height, keypoints, biggerEyes)
  gatherNoseSlim(dispXY, width, height, keypoints, noseSlim)
  gatherJawline(dispXY, width, height, keypoints, jawline)

  // Phase 2: Apply displacement in one pass with bilinear sampling
  const sd = srcData.data
  const dstData = new ImageData(new Uint8ClampedArray(sd), width, height)
  const dd = dstData.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 2
      const dx = dispXY[idx]
      const dy = dispXY[idx + 1]
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

  return dstData
}
