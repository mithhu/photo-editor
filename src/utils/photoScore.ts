export interface PhotoScoreResult {
  overall: number
  composition: number
  lighting: number
  color: number
  sharpness: number
  mood: string
  grade: string
  tip: string
}

const TIPS = {
  composition: 'Try the rule of thirds — place your subject off-center',
  lighting: 'Boost exposure slightly for a brighter, more inviting look',
  color: 'Add a touch of vibrance to make colors pop',
  sharpness: 'Increase clarity for a crisper result',
} as const

const MAX_SAMPLE = 256

/**
 * Downsample canvas to max 256x256 for performance, then return ImageData.
 */
function getSampledImageData(canvas: HTMLCanvasElement): ImageData | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const w = canvas.width
  const h = canvas.height
  if (w === 0 || h === 0) return null

  const scale = Math.min(MAX_SAMPLE / w, MAX_SAMPLE / h, 1)
  const sw = Math.max(1, Math.round(w * scale))
  const sh = Math.max(1, Math.round(h * scale))

  const offscreen = document.createElement('canvas')
  offscreen.width = sw
  offscreen.height = sh
  const offCtx = offscreen.getContext('2d')
  if (!offCtx) return null

  offCtx.drawImage(canvas, 0, 0, w, h, 0, 0, sw, sh)
  return offCtx.getImageData(0, 0, sw, sh)
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function sampleAt(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number
): { r: number; g: number; b: number } {
  const fx = Math.min(w - 1, Math.max(0, Math.floor(x)))
  const fy = Math.min(h - 1, Math.max(0, Math.floor(y)))
  const i = (fy * w + fx) * 4
  return { r: d[i], g: d[i + 1], b: d[i + 2] }
}

function scoreComposition(d: Uint8ClampedArray, w: number, h: number): number {
  const pts: { x: number; y: number }[] = []
  for (const tx of [1 / 3, 2 / 3]) {
    for (const ty of [1 / 3, 2 / 3]) {
      pts.push({ x: w * tx - 0.5, y: h * ty - 0.5 })
    }
  }
  pts.push({ x: w / 2 - 0.5, y: h / 2 - 0.5 })

  const lums: number[] = pts.map((p) => {
    const { r, g, b } = sampleAt(d, w, h, p.x, p.y)
    return luminance(r, g, b)
  })

  const ruleThirds = lums.slice(0, 4)
  const center = lums[4]
  const mean = ruleThirds.reduce((a, b) => a + b, 0) / 4
  const variance =
    ruleThirds.reduce((acc, v) => acc + (v - mean) ** 2, 0) / 4 || 0
  const ruleScore = Math.min(100, 20 + Math.sqrt(variance) * 2.5)

  let edgeWeight = 0
  const margin = Math.min(w, h) * 0.15
  for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 32))) {
    for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 32))) {
      const nearEdge =
        x < margin ||
        x > w - margin ||
        y < margin ||
        y > h - margin
      if (nearEdge) {
        const i = (y * w + x) * 4
        edgeWeight += luminance(d[i], d[i + 1], d[i + 2])
      }
    }
  }
  const edgeCount = Math.ceil((w * h) / 256)
  const avgEdge = edgeWeight / edgeCount
  const edgeScore = Math.min(100, avgEdge * 0.5)

  let leftSum = 0
  let rightSum = 0
  const midX = Math.floor(w / 2)
  for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 32))) {
    for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 32))) {
      const i = (y * w + x) * 4
      const lum = luminance(d[i], d[i + 1], d[i + 2])
      if (x < midX) leftSum += lum
      else rightSum += lum
    }
  }
  const totalLR = leftSum + rightSum || 1
  const symRatio = Math.min(leftSum, rightSum) / Math.max(leftSum, rightSum)
  const symmetryScore = symRatio >= 0.4 && symRatio <= 0.6 ? 90 : symRatio > 0.2 && symRatio < 0.9 ? 60 : 40

  const goldenX1 = w * 0.382
  const goldenX2 = w * 0.618
  const goldenY1 = h * 0.382
  const goldenY2 = h * 0.618
  let subjectScore = 50
  for (const gx of [goldenX1, goldenX2]) {
    for (const gy of [goldenY1, goldenY2]) {
      const { r, g, b } = sampleAt(d, w, h, gx, gy)
      const lum = luminance(r, g, b)
      const maxC = Math.max(r, g, b)
      const minC = Math.min(r, g, b)
      const contrast = maxC - minC
      if (lum > 40 && lum < 220 && contrast > 30) subjectScore += 10
    }
  }
  subjectScore = Math.min(100, subjectScore)

  const composition =
    ruleScore * 0.3 +
    edgeScore * 0.2 +
    symmetryScore * 0.25 +
    subjectScore * 0.25
  return Math.round(Math.min(100, Math.max(0, composition)))
}

function scoreLighting(d: Uint8ClampedArray, w: number, h: number): number {
  const hist = new Uint32Array(256)
  let totalLum = 0
  const n = (d.length / 4) | 0

  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(luminance(d[i], d[i + 1], d[i + 2]))
    hist[lum]++
    totalLum += lum
  }

  const avgLum = totalLum / n
  const peakIdx = hist.indexOf(Math.max(...hist))

  const exposureScore = 100 - Math.abs(peakIdx - 128) / 1.28

  let lowCount = 0
  let highCount = 0
  for (let i = 0; i <= 5; i++) lowCount += hist[i]
  for (let i = 250; i <= 255; i++) highCount += hist[i]
  const clipRatio = (lowCount + highCount) / n
  const clipScore = Math.max(0, 100 - clipRatio * 500)

  let minIdx = 0
  let maxIdx = 255
  while (minIdx < 256 && hist[minIdx] === 0) minIdx++
  while (maxIdx >= 0 && hist[maxIdx] === 0) maxIdx--
  const spread = maxIdx - minIdx
  const dynamicScore = Math.min(100, spread * 0.4)

  const contrast = spread
  const contrastScore =
    contrast < 80 ? 40 + contrast * 0.5 : contrast > 200 ? 95 : 60 + contrast * 0.2

  const lighting =
    exposureScore * 0.35 +
    clipScore * 0.25 +
    dynamicScore * 0.2 +
    contrastScore * 0.2
  return Math.round(Math.min(100, Math.max(0, lighting)))
}

function scoreColor(d: Uint8ClampedArray, w: number, h: number): number {
  let totalSat = 0
  let totalR = 0
  let totalG = 0
  let totalB = 0
  const hues: number[] = []
  const sats: number[] = []

  const pixelStep = Math.max(1, Math.floor((d.length / 4) / 4000))
  for (let i = 0; i < d.length; i += 4 * pixelStep) {
    const r = d[i] / 255
    const g = d[i + 1] / 255
    const b = d[i + 2] / 255
    const maxC = Math.max(r, g, b)
    const minC = Math.min(r, g, b)
    const sat = maxC > 0 ? (maxC - minC) / maxC : 0
    totalSat += sat
    totalR += r
    totalG += g
    totalB += b

    let h_ = 0
    if (maxC !== minC) {
      const d_ = maxC - minC
      if (maxC === r) h_ = ((g - b) / d_ + (g < b ? 6 : 0)) / 6
      else if (maxC === g) h_ = ((b - r) / d_ + 2) / 6
      else h_ = ((r - g) / d_ + 4) / 6
    }
    hues.push(Math.round(h_ * 360))
    sats.push(sat)
  }

  const count = hues.length || 1
  const avgSat = (totalSat / count) * 100

  const hueBuckets = new Map<number, number>()
  const bucketSize = 30
  for (const h_ of hues) {
    const b = Math.floor(h_ / bucketSize) * bucketSize
    hueBuckets.set(b, (hueBuckets.get(b) ?? 0) + 1)
  }
  const distinctClusters = hueBuckets.size
  const harmonyScore =
    distinctClusters >= 2 && distinctClusters <= 4
      ? 95
      : distinctClusters === 1
        ? 70
        : Math.max(50, 90 - distinctClusters * 5)

  const avgR = totalR / count
  const avgB = totalB / count
  const warmth = (avgR - avgB) * 100
  const wbScore = Math.max(50, 100 - Math.abs(warmth) * 0.5)

  const maxSat = sats.length > 0 ? Math.max(...sats) * 100 : 0
  const minSat = sats.length > 0 ? Math.min(...sats) * 100 : 0
  const vibrance = maxSat - minSat
  const vibranceScore = Math.min(100, 30 + vibrance)

  const saturationScore = Math.min(100, avgSat * 1.2)

  const color =
    saturationScore * 0.25 +
    harmonyScore * 0.3 +
    wbScore * 0.2 +
    vibranceScore * 0.25
  return Math.round(Math.min(100, Math.max(0, color)))
}

function scoreSharpness(d: Uint8ClampedArray, w: number, h: number): number {
  const lap = new Float32Array(w * h)
  const lapKernel = [0, -1, 0, -1, 4, -1, 0, -1, 0]

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let v = 0
      let ki = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const i = ((y + dy) * w + (x + dx)) * 4
          const lum = luminance(d[i], d[i + 1], d[i + 2])
          v += lapKernel[ki++] * lum
        }
      }
      lap[y * w + x] = v * v
    }
  }

  let sum = 0
  let count = 0
  for (let i = 0; i < lap.length; i++) {
    if (lap[i] > 0) {
      sum += lap[i]
      count++
    }
  }
  const variance = count > 0 ? sum / count : 0
  const raw = Math.min(100, Math.sqrt(variance) * 0.8)
  return Math.round(Math.min(100, Math.max(0, raw)))
}

function detectMood(d: Uint8ClampedArray, w: number, h: number): string {
  let totalLum = 0
  let totalSat = 0
  let totalR = 0
  let totalG = 0
  let totalB = 0
  let minLum = 255
  let maxLum = 0
  const step = Math.max(1, Math.floor((w * h) / 3000))
  for (let i = 0; i < d.length; i += 4 * step) {
    const r = d[i] / 255
    const g = d[i + 1] / 255
    const b = d[i + 2] / 255
    const maxC = Math.max(r, g, b)
    const minC = Math.min(r, g, b)
    const sat = maxC > 0 ? (maxC - minC) / maxC : 0
    const lum = 0.299 * r + 0.587 * g + 0.114 * b

    totalLum += lum
    totalSat += sat
    totalR += r
    totalG += g
    totalB += b
    if (lum < minLum) minLum = lum
    if (lum > maxLum) maxLum = lum
  }

  const n = Math.ceil((d.length / 4) / step)
  const avgLum = totalLum / n
  const avgSat = totalSat / n
  const warmth = (totalR - totalB) / n
  const contrast = maxLum - minLum

  if (avgSat > 0.5 && avgLum > 0.6) return 'Vibrant'
  if (avgLum < 0.4 && contrast > 0.4) return 'Moody'
  if (warmth > 0.08 && avgSat >= 0.3 && avgSat <= 0.65) return 'Warm'
  if (warmth < -0.08 && avgSat >= 0.3 && avgSat <= 0.65) return 'Cool'
  if (avgSat < 0.3 && avgLum > 0.55) return 'Dreamy'
  if (avgSat > 0.55 && contrast > 0.5) return 'Bold'
  if (contrast < 0.3 && avgLum >= 0.35 && avgLum <= 0.65) return 'Soft'
  if (contrast > 0.5) return 'Dramatic'

  return 'Vibrant'
}

function getGrade(overall: number): string {
  if (overall >= 95) return 'S+'
  if (overall >= 90) return 'S'
  if (overall >= 85) return 'A+'
  if (overall >= 80) return 'A'
  if (overall >= 70) return 'B+'
  if (overall >= 60) return 'B'
  if (overall >= 50) return 'C'
  return 'D'
}

function getTip(
  composition: number,
  lighting: number,
  color: number,
  sharpness: number
): string {
  const scores = [
    { key: 'composition' as const, value: composition },
    { key: 'lighting' as const, value: lighting },
    { key: 'color' as const, value: color },
    { key: 'sharpness' as const, value: sharpness },
  ]
  scores.sort((a, b) => a.value - b.value)
  return TIPS[scores[0].key]
}

export function analyzePhotoScore(canvas: HTMLCanvasElement): PhotoScoreResult {
  const img = getSampledImageData(canvas)
  if (!img) {
    return {
      overall: 0,
      composition: 0,
      lighting: 0,
      color: 0,
      sharpness: 0,
      mood: 'Soft',
      grade: 'D',
      tip: TIPS.composition,
    }
  }

  const d = img.data
  const w = img.width
  const h = img.height

  const composition = scoreComposition(d, w, h)
  const lighting = scoreLighting(d, w, h)
  const color = scoreColor(d, w, h)
  const sharpness = scoreSharpness(d, w, h)

  const overall = Math.round(
    composition * 0.25 +
      lighting * 0.3 +
      color * 0.25 +
      sharpness * 0.2
  )

  return {
    overall: Math.min(100, Math.max(0, overall)),
    composition,
    lighting,
    color,
    sharpness,
    mood: detectMood(d, w, h),
    grade: getGrade(overall),
    tip: getTip(composition, lighting, color, sharpness),
  }
}
