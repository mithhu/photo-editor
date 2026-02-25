import type { FaceKeypoint } from '../types'
import type { MoodCategory } from '../data/moodQuotes'
import { FACE_REGIONS } from './faceMesh'

function avg(points: { x: number; y: number }[]): { x: number; y: number } {
  const s = points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 })
  return { x: s.x / points.length, y: s.y / points.length }
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

interface FaceExpression {
  smileScore: number
  eyeOpenness: number
  browRaise: number
  mouthOpenness: number
}

function analyzeFaceExpression(kp: FaceKeypoint[]): FaceExpression | null {
  if (kp.length < 468) return null

  const leftMouth = kp[61]
  const rightMouth = kp[291]
  const upperLip = kp[13]
  const lowerLip = kp[14]
  const noseTip = kp[1]

  const mouthWidth = dist(leftMouth, rightMouth)
  const mouthHeight = dist(upperLip, lowerLip)

  const leftEyeTop = avg(FACE_REGIONS.leftEye.slice(4, 8).map((i) => kp[i]))
  const leftEyeBot = avg(FACE_REGIONS.leftEye.slice(0, 4).map((i) => kp[i]))
  const rightEyeTop = avg(FACE_REGIONS.rightEye.slice(4, 8).map((i) => kp[i]))
  const rightEyeBot = avg(FACE_REGIONS.rightEye.slice(0, 4).map((i) => kp[i]))

  const leftEyeOpen = dist(leftEyeTop, leftEyeBot)
  const rightEyeOpen = dist(rightEyeTop, rightEyeBot)
  const eyeOpenness = (leftEyeOpen + rightEyeOpen) / 2

  const leftBrow = avg(FACE_REGIONS.leftEyebrow.map((i) => kp[i]))
  const rightBrow = avg(FACE_REGIONS.rightEyebrow.map((i) => kp[i]))
  const leftEyeCenter = avg(FACE_REGIONS.leftEye.map((i) => kp[i]))
  const rightEyeCenter = avg(FACE_REGIONS.rightEye.map((i) => kp[i]))
  const browDist = (dist(leftBrow, leftEyeCenter) + dist(rightBrow, rightEyeCenter)) / 2

  const faceHeight = dist(kp[10], kp[152])

  const mouthCornerY = (leftMouth.y + rightMouth.y) / 2
  const smileScore = (noseTip.y - mouthCornerY) / faceHeight

  return {
    smileScore: Math.max(-1, Math.min(1, smileScore * 10)),
    eyeOpenness: eyeOpenness / faceHeight,
    browRaise: browDist / faceHeight,
    mouthOpenness: mouthHeight / mouthWidth,
  }
}

interface ImageColorMood {
  brightness: number
  warmth: number
  saturation: number
  contrast: number
}

function analyzeImageColors(canvas: HTMLCanvasElement): ImageColorMood {
  const ctx = canvas.getContext('2d')
  if (!ctx) return { brightness: 0.5, warmth: 0, saturation: 0.3, contrast: 0.5 }

  const maxDim = 100
  const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height))
  const w = Math.round(canvas.width * scale)
  const h = Math.round(canvas.height * scale)

  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const tctx = tmp.getContext('2d')!
  tctx.drawImage(canvas, 0, 0, w, h)
  const d = tctx.getImageData(0, 0, w, h).data

  let totalLum = 0, totalSat = 0, totalR = 0, totalB = 0
  let minLum = 1, maxLum = 0
  const n = d.length / 4

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255
    const g = d[i + 1] / 255
    const b = d[i + 2] / 255
    const mx = Math.max(r, g, b)
    const mn = Math.min(r, g, b)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    const sat = mx > 0 ? (mx - mn) / mx : 0

    totalLum += lum
    totalSat += sat
    totalR += r
    totalB += b
    if (lum < minLum) minLum = lum
    if (lum > maxLum) maxLum = lum
  }

  return {
    brightness: totalLum / n,
    warmth: (totalR - totalB) / n,
    saturation: totalSat / n,
    contrast: maxLum - minLum,
  }
}

export interface MoodResult {
  primary: MoodCategory
  secondary: MoodCategory
  confidence: number
  expression: string
}

export function detectImageMood(
  canvas: HTMLCanvasElement,
  faceKeypoints: FaceKeypoint[] | null
): MoodResult {
  const colors = analyzeImageColors(canvas)
  const expr = faceKeypoints ? analyzeFaceExpression(faceKeypoints) : null

  const scores: Record<MoodCategory, number> = {
    happy: 0, sad: 0, confident: 0, romantic: 0, moody: 0, chill: 0,
    energetic: 0, dreamy: 0, savage: 0, motivational: 0, funny: 0, aesthetic: 0,
  }

  let expressionLabel = 'neutral'

  if (expr) {
    if (expr.smileScore > 0.15) {
      scores.happy += 3
      scores.funny += 1.5
      scores.energetic += 1
      expressionLabel = 'smiling'
    } else if (expr.smileScore > 0.05) {
      scores.happy += 1.5
      scores.chill += 1
      scores.confident += 1
      expressionLabel = 'slight smile'
    } else if (expr.smileScore < -0.1) {
      scores.sad += 3
      scores.moody += 2
      expressionLabel = 'frowning'
    } else {
      scores.confident += 1
      scores.moody += 0.5
      scores.aesthetic += 0.5
      expressionLabel = 'neutral'
    }

    if (expr.mouthOpenness > 0.4) {
      scores.energetic += 2
      scores.funny += 1
      scores.happy += 1
      expressionLabel = expr.smileScore > 0.05 ? 'laughing' : 'surprised'
    }

    if (expr.eyeOpenness > 0.06) {
      scores.energetic += 0.5
    } else if (expr.eyeOpenness < 0.03) {
      scores.chill += 1
      scores.dreamy += 1
      expressionLabel = expressionLabel === 'neutral' ? 'relaxed' : expressionLabel
    }

    if (expr.browRaise > 0.12) {
      scores.confident += 1
      scores.savage += 0.5
    }
  }

  if (colors.brightness > 0.6 && colors.saturation > 0.4) {
    scores.happy += 2
    scores.energetic += 1.5
  }
  if (colors.brightness < 0.35) {
    scores.moody += 2
    scores.sad += 1
    scores.aesthetic += 1
  }
  if (colors.warmth > 0.08) {
    scores.romantic += 1.5
    scores.happy += 0.5
    scores.dreamy += 1
  }
  if (colors.warmth < -0.06) {
    scores.moody += 1
    scores.sad += 0.5
    scores.chill += 0.5
  }
  if (colors.saturation > 0.5) {
    scores.energetic += 1.5
    scores.savage += 0.5
  }
  if (colors.saturation < 0.25) {
    scores.dreamy += 1.5
    scores.chill += 1
    scores.aesthetic += 1
  }
  if (colors.contrast > 0.5) {
    scores.savage += 1
    scores.confident += 1
    scores.motivational += 0.5
  }
  if (colors.contrast < 0.3) {
    scores.chill += 1
    scores.dreamy += 0.5
  }

  if (colors.brightness > 0.55 && colors.saturation > 0.3 && colors.warmth > 0.03) {
    scores.aesthetic += 1.5
  }

  const sorted = (Object.entries(scores) as [MoodCategory, number][])
    .sort((a, b) => b[1] - a[1])

  const primary = sorted[0]
  const secondary = sorted[1]
  const maxScore = Math.max(1, primary[1])

  return {
    primary: primary[0],
    secondary: secondary[0],
    confidence: Math.min(1, primary[1] / maxScore),
    expression: expressionLabel,
  }
}
