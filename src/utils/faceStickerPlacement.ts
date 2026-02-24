import type { FaceKeypoint, FaceStickerInstance } from '../types'
import { FACE_REGIONS } from './faceMesh'

interface StickerPosition {
  x: number
  y: number
  size: number
  rotation: number
}

function avg(points: { x: number; y: number }[]): { x: number; y: number } {
  const sum = points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function getAnchorPosition(
  anchor: string,
  kp: FaceKeypoint[],
  imgW: number,
  imgH: number
): { x: number; y: number; faceWidth: number } | null {
  if (kp.length < 468) return null

  const leftEye = avg(FACE_REGIONS.leftEye.map((i) => kp[i]))
  const rightEye = avg(FACE_REGIONS.rightEye.map((i) => kp[i]))
  const nose = avg(FACE_REGIONS.noseTip.map((i) => kp[i]))
  const mouth = avg(FACE_REGIONS.lips.map((i) => kp[i]))
  const chin = kp[152]
  const forehead = kp[10]
  const leftCheek = avg(FACE_REGIONS.leftCheek.map((i) => kp[i]))
  const rightCheek = avg(FACE_REGIONS.rightCheek.map((i) => kp[i]))
  const eyeCenter = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 }
  const faceCenter = { x: (forehead.x + chin.x) / 2, y: (forehead.y + chin.y) / 2 }

  const faceWidth = dist(kp[234], kp[454])

  let pos: { x: number; y: number }

  switch (anchor) {
    case 'eyes':
      pos = eyeCenter
      break
    case 'forehead':
      pos = forehead
      break
    case 'nose':
      pos = nose
      break
    case 'mouth':
      pos = mouth
      break
    case 'chin':
      pos = chin
      break
    case 'left-cheek':
      pos = leftCheek
      break
    case 'right-cheek':
      pos = rightCheek
      break
    case 'full-face':
    default:
      pos = faceCenter
      break
  }

  return {
    x: pos.x / imgW,
    y: pos.y / imgH,
    faceWidth: faceWidth / imgW,
  }
}

export function computeStickerPosition(
  sticker: FaceStickerInstance,
  keypoints: FaceKeypoint[],
  imgW: number,
  imgH: number
): StickerPosition | null {
  if (sticker.manualX !== undefined && sticker.manualY !== undefined) {
    return {
      x: sticker.manualX,
      y: sticker.manualY,
      size: sticker.scale * 60,
      rotation: sticker.rotation,
    }
  }

  const anchorPos = getAnchorPosition(sticker.anchor, keypoints, imgW, imgH)
  if (!anchorPos) return null

  const baseSizeFraction = anchorPos.faceWidth * sticker.scale
  const size = baseSizeFraction * imgW

  return {
    x: anchorPos.x,
    y: anchorPos.y + sticker.offsetY * anchorPos.faceWidth,
    size,
    rotation: sticker.rotation,
  }
}
