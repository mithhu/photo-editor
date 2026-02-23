import type { FaceKeypoint, FaceMetrics, CelebrityMatch } from '../types'
import { CELEBRITY_DATABASE } from '../data/celebrityMetrics'

function dist(a: FaceKeypoint, b: FaceKeypoint): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

export function extractFaceMetrics(keypoints: FaceKeypoint[]): FaceMetrics | null {
  const minRequired = 474
  if (!keypoints || keypoints.length < minRequired) return null

  const faceLeft = keypoints[234]
  const faceRight = keypoints[454]
  const foreheadTop = keypoints[10]
  const chin = keypoints[152]
  const leftEyeOuter = keypoints[33]
  const leftEyeInner = keypoints[133]
  const rightEyeOuter = keypoints[263]
  const rightEyeInner = keypoints[362]
  const leftIris = keypoints[468]
  const rightIris = keypoints[473]
  const noseBridge = keypoints[6]
  const noseTip = keypoints[4]
  const upperLipTop = keypoints[0]
  const lowerLipBottom = keypoints[17]
  const mouthLeft = keypoints[61]
  const mouthRight = keypoints[291]
  const leftEyebrow = keypoints[105]
  const rightEyebrow = keypoints[334]

  const faceWidth = dist(faceLeft, faceRight)
  const faceHeight = dist(foreheadTop, chin)

  if (faceWidth < 1e-6 || faceHeight < 1e-6) return null

  const leftEyeWidth = dist(leftEyeOuter, leftEyeInner)
  const rightEyeWidth = dist(rightEyeOuter, rightEyeInner)

  return {
    faceAspectRatio: faceHeight / faceWidth,
    eyeDistanceRatio: dist(leftIris, rightIris) / faceWidth,
    noseLengthRatio: dist(noseBridge, noseTip) / faceHeight,
    lipFullnessRatio: dist(upperLipTop, lowerLipBottom) / faceHeight,
    jawlineWidth: dist(faceLeft, faceRight) / faceHeight,
    foreheadRatio: dist(foreheadTop, noseBridge) / faceHeight,
    eyeSizeRatio: (leftEyeWidth + rightEyeWidth) / 2 / faceWidth,
    chinRatio: dist(lowerLipBottom, chin) / faceHeight,
    eyebrowHeightRatio:
      (dist(leftEyebrow, leftIris) + dist(rightEyebrow, rightIris)) / 2 / faceHeight,
    mouthWidthRatio: dist(mouthLeft, mouthRight) / faceWidth,
  }
}

const METRIC_WEIGHTS: Record<keyof FaceMetrics, number> = {
  faceAspectRatio: 2,
  eyeDistanceRatio: 1.5,
  noseLengthRatio: 1,
  lipFullnessRatio: 1,
  jawlineWidth: 1.5,
  foreheadRatio: 0.8,
  eyeSizeRatio: 1.2,
  chinRatio: 0.8,
  eyebrowHeightRatio: 0.7,
  mouthWidthRatio: 1,
}

const METRIC_LABELS: Record<keyof FaceMetrics, string> = {
  faceAspectRatio: 'Similar face shape',
  eyeDistanceRatio: 'Similar eyes',
  noseLengthRatio: 'Similar nose',
  lipFullnessRatio: 'Similar lips',
  jawlineWidth: 'Similar jawline',
  foreheadRatio: 'Similar forehead',
  eyeSizeRatio: 'Similar eyes',
  chinRatio: 'Similar chin',
  eyebrowHeightRatio: 'Similar eyebrows',
  mouthWidthRatio: 'Similar mouth',
}

const METRIC_KEYS = Object.keys(METRIC_WEIGHTS) as (keyof FaceMetrics)[]

export function findCelebrityMatches(metrics: FaceMetrics, count = 5): CelebrityMatch[] {
  return CELEBRITY_DATABASE.map((celeb) => {
    let sumSq = 0
    let bestKey: keyof FaceMetrics = 'faceAspectRatio'
    let bestDiff = Infinity

    for (const key of METRIC_KEYS) {
      const diff = Math.abs(metrics[key] - celeb.metrics[key])
      sumSq += (diff * METRIC_WEIGHTS[key]) ** 2

      if (diff < bestDiff) {
        bestDiff = diff
        bestKey = key
      }
    }

    const distance = Math.sqrt(sumSq)
    const matchPercent = Math.max(0, Math.round(100 - distance * 80))

    return {
      name: celeb.name,
      matchPercent,
      bestFeature: METRIC_LABELS[bestKey],
    }
  })
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, count)
}
