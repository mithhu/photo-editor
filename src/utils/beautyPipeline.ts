/**
 * Combined beauty pipeline: single face detection, then beauty + reshape + makeup.
 * Processes on an HTMLCanvasElement at capped resolution (not DPR-scaled).
 * Caches face detection results so slider tweaks skip the expensive TF.js inference.
 */

import type { BeautySettings, ReshapeSettings, MakeupSettings, DetectedFace } from '../types'
import { detectFaceLandmarks } from './faceMesh'
import { applyBeautyToImageData } from './beautyFilters'
import { applyReshapeToImageData } from './faceReshape'
import { applyMakeupToCanvas } from './virtualMakeup'

export function hasActiveBeauty(beauty: BeautySettings | null | undefined): boolean {
  return !!(beauty && (beauty.smooth > 0 || beauty.blemish > 0 || beauty.evenness > 0 || beauty.brightenEyes > 0 || beauty.teethWhiten > 0))
}

export function hasActiveReshape(reshape: ReshapeSettings | null | undefined): boolean {
  return !!(reshape && (reshape.slimFace > 0 || reshape.biggerEyes > 0 || reshape.noseSlim > 0 || reshape.jawline > 0))
}

export function hasActiveMakeup(makeup: MakeupSettings | null | undefined): boolean {
  return !!(makeup && (makeup.lipstick?.opacity > 0 || makeup.blush?.opacity > 0 || makeup.eyeliner?.opacity > 0 || makeup.eyeshadow?.opacity > 0))
}

let runId: number = 0

let _cachedFaces: DetectedFace[] | null = null
let _cachedImageSrc: string | null = null
let _cachedProcW: number = 0
let _cachedProcH: number = 0

interface PipelineResult {
  canvas: HTMLCanvasElement
  id: number
  width: number
  height: number
}

export async function runBeautyPipeline(
  imageElement: HTMLImageElement,
  beautySettings: BeautySettings,
  reshapeSettings: ReshapeSettings,
  makeupSettings: MakeupSettings
): Promise<PipelineResult | null> {
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
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(imageElement, 0, 0, procW, procH)

  const imgSrc = imageElement.src
  let faces: DetectedFace[]
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

export function cancelBeautyPipeline(): void {
  runId++
}

export function invalidateFaceCache(): void {
  _cachedFaces = null
  _cachedImageSrc = null
}
