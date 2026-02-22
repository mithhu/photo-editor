/**
 * Combined beauty pipeline: single face detection, then beauty + reshape + makeup.
 * Processes on an HTMLCanvasElement at capped resolution (not DPR-scaled).
 * Caches face detection results so slider tweaks skip the expensive TF.js inference.
 */

import { detectFaceLandmarks } from './faceMesh'
import { applyBeautyToImageData } from './beautyFilters'
import { applyReshapeToImageData } from './faceReshape'
import { applyMakeupToCanvas } from './virtualMakeup'

export function hasActiveBeauty(beauty) {
  return beauty && (beauty.smooth > 0 || beauty.blemish > 0 || beauty.evenness > 0 || beauty.brightenEyes > 0 || beauty.teethWhiten > 0)
}

export function hasActiveReshape(reshape) {
  return reshape && (reshape.slimFace > 0 || reshape.biggerEyes > 0 || reshape.noseSlim > 0 || reshape.jawline > 0)
}

export function hasActiveMakeup(makeup) {
  return makeup && (makeup.lipstick?.opacity > 0 || makeup.blush?.opacity > 0 || makeup.eyeliner?.opacity > 0 || makeup.eyeshadow?.opacity > 0)
}

let runId = 0

// Face detection cache — avoids re-running TF.js when only sliders changed
let _cachedFaces = null
let _cachedImageSrc = null
let _cachedProcW = 0
let _cachedProcH = 0

export async function runBeautyPipeline(imageElement, beautySettings, reshapeSettings, makeupSettings) {
  const doBeauty = hasActiveBeauty(beautySettings)
  const doReshape = hasActiveReshape(reshapeSettings)
  const doMakeup = hasActiveMakeup(makeupSettings)

  if (!doBeauty && !doReshape && !doMakeup) return null

  const id = ++runId
  const width = imageElement.naturalWidth
  const height = imageElement.naturalHeight

  if (width === 0 || height === 0) return null

  const MAX_DIM = 512
  const scale = Math.min(1, MAX_DIM / Math.max(width, height))
  const procW = Math.round(width * scale)
  const procH = Math.round(height * scale)

  const workCanvas = document.createElement('canvas')
  workCanvas.width = procW
  workCanvas.height = procH
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(imageElement, 0, 0, procW, procH)

  // Reuse cached face detection if the image hasn't changed
  const imgSrc = imageElement.src
  let faces
  if (_cachedFaces && _cachedImageSrc === imgSrc && _cachedProcW === procW && _cachedProcH === procH) {
    faces = _cachedFaces
  } else {
    faces = await detectFaceLandmarks(workCanvas)
    if (faces?.length) {
      _cachedFaces = faces
      _cachedImageSrc = imgSrc
      _cachedProcW = procW
      _cachedProcH = procH
    }
  }

  if (!faces?.length) {
    console.warn('[Beauty] No faces detected')
    return null
  }

  if (id !== runId) return null

  for (const face of faces) {
    const kp = face.keypoints

    if (doBeauty) {
      const imageData = ctx.getImageData(0, 0, procW, procH)
      applyBeautyToImageData(imageData, kp, beautySettings)
      ctx.putImageData(imageData, 0, 0)
    }

    if (doReshape) {
      const srcData = ctx.getImageData(0, 0, procW, procH)
      const dstData = applyReshapeToImageData(srcData, kp, reshapeSettings)
      ctx.putImageData(dstData, 0, 0)
    }

    if (doMakeup) {
      applyMakeupToCanvas(workCanvas, kp, makeupSettings)
    }
  }

  if (id !== runId) return null

  return { canvas: workCanvas, id, width: procW, height: procH }
}

export function cancelBeautyPipeline() {
  runId++
}

export function invalidateFaceCache() {
  _cachedFaces = null
  _cachedImageSrc = null
}
