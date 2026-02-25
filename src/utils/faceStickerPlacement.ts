import type { FaceKeypoint, FaceStickerInstance } from '../types'
import { FACE_REGIONS } from './faceMesh'

export interface StickerPosition {
  x: number
  y: number
  size: number
  rotation: number
}

function avg(points: { x: number; y: number }[]): { x: number; y: number } {
  const sum = points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function getFaceWidth(kp: FaceKeypoint[]): number {
  if (kp.length < 468) return 0
  return distance(kp[234], kp[454])
}

function getAnchorPosition(
  anchor: string,
  kp: FaceKeypoint[],
): { x: number; y: number } | null {
  if (kp.length < 468) return null

  const leftEye = avg(FACE_REGIONS.leftEye.map((i) => kp[i]))
  const rightEye = avg(FACE_REGIONS.rightEye.map((i) => kp[i]))
  const nose = avg(FACE_REGIONS.noseTip.map((i) => kp[i]))
  const mouth = avg(FACE_REGIONS.lips.map((i) => kp[i]))
  const chin = kp[152]
  const forehead = kp[10]
  const leftCheek = avg(FACE_REGIONS.leftCheek.map((i) => kp[i]))
  const rightCheek = avg(FACE_REGIONS.rightCheek.map((i) => kp[i]))

  switch (anchor) {
    case 'eyes':
      return { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 }
    case 'forehead':
      return forehead
    case 'nose':
      return nose
    case 'mouth':
      return mouth
    case 'chin':
      return chin
    case 'left-cheek':
      return leftCheek
    case 'right-cheek':
      return rightCheek
    case 'full-face':
    default:
      return { x: (forehead.x + chin.x) / 2, y: (forehead.y + chin.y) / 2 }
  }
}

export function computeStickerPosition(
  sticker: FaceStickerInstance,
  keypoints: FaceKeypoint[],
  imgW: number,
  imgH: number
): StickerPosition | null {
  const hasFace = keypoints.length >= 468
  const faceW = hasFace ? getFaceWidth(keypoints) : 0
  const faceWidthNorm = faceW / imgW

  if (sticker.manualX !== undefined && sticker.manualY !== undefined) {
    const sizeNorm = hasFace ? faceWidthNorm * sticker.scale : sticker.scale * 0.15
    return {
      x: sticker.manualX,
      y: sticker.manualY,
      size: sizeNorm * imgW,
      rotation: sticker.rotation,
    }
  }

  if (!hasFace) return null

  const anchor = getAnchorPosition(sticker.anchor, keypoints)
  if (!anchor) return null

  const sizePixels = faceW * sticker.scale
  const yOffset = sticker.offsetY * faceW

  return {
    x: anchor.x / imgW,
    y: (anchor.y + yOffset) / imgH,
    size: sizePixels,
    rotation: sticker.rotation,
  }
}
