/**
 * Combined beauty pipeline: single face detection, then beauty + reshape + makeup.
 * Processes on an OffscreenCanvas at the original image dimensions (not DPR-scaled).
 * Returns a canvas that drawCanvas can use as the source image instead of the raw photo.
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

/**
 * Run the full beauty pipeline on the original image.
 * Uses the image element directly for face detection (better accuracy at natural resolution).
 *
 * @param {HTMLImageElement} imageElement - The original image element
 * @param {Object} beautySettings - { smooth, blemish, evenness, brightenEyes, teethWhiten }
 * @param {Object} reshapeSettings - { slimFace, biggerEyes, noseSlim, jawline }
 * @param {Object} makeupSettings - { lipstick, blush, eyeliner, eyeshadow }
 * @returns {Promise<{ canvas: HTMLCanvasElement, id: number } | null>}
 */
export async function runBeautyPipeline(imageElement, beautySettings, reshapeSettings, makeupSettings) {
  const doBeauty = hasActiveBeauty(beautySettings)
  const doReshape = hasActiveReshape(reshapeSettings)
  const doMakeup = hasActiveMakeup(makeupSettings)

  if (!doBeauty && !doReshape && !doMakeup) return null

  const id = ++runId
  const width = imageElement.naturalWidth
  const height = imageElement.naturalHeight

  if (width === 0 || height === 0) return null

  // Work at a capped resolution for performance
  const MAX_DIM = 1024
  const scale = Math.min(1, MAX_DIM / Math.max(width, height))
  const procW = Math.round(width * scale)
  const procH = Math.round(height * scale)

  // Use a regular canvas for maximum TF.js compatibility
  const workCanvas = document.createElement('canvas')
  workCanvas.width = procW
  workCanvas.height = procH
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(imageElement, 0, 0, procW, procH)

  // Run face detection directly on the canvas (best supported input type)
  const faces = await detectFaceLandmarks(workCanvas)
  if (!faces?.length) {
    console.warn('[Beauty] No faces detected')
    return null
  }

  if (id !== runId) return null

  console.log(`[Beauty] Detected ${faces.length} face(s), keypoints: ${faces[0].keypoints.length}`)

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
