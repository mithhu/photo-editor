/**
 * Analyze an image on the canvas and return optimal edit settings.
 * One-tap enhancement: adjusts exposure, contrast, saturation, and optionally beauty.
 */

export function analyzeAndEnhance(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = imageData.data

  const histogram = new Array(256).fill(0)
  let totalR = 0, totalG = 0, totalB = 0
  const pixelCount = d.length / 4

  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
    histogram[lum]++
    totalR += d[i]
    totalG += d[i + 1]
    totalB += d[i + 2]
  }

  // 1st and 99th percentile for auto-levels
  let cumulative = 0
  let low = 0, high = 255
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i]
    if (cumulative / pixelCount >= 0.01) { low = i; break }
  }
  cumulative = 0
  for (let i = 255; i >= 0; i--) {
    cumulative += histogram[i]
    if (cumulative / pixelCount >= 0.01) { high = i; break }
  }

  const avgLum = histogram.reduce((sum, count, i) => sum + count * i, 0) / pixelCount

  const avgR = totalR / pixelCount
  const avgG = totalG / pixelCount
  const avgB = totalB / pixelCount
  const avgSat = Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB)

  // Brightness: target ~128
  const brightnessFactor = avgLum < 100
    ? Math.min(1.4, 128 / Math.max(avgLum, 1))
    : avgLum > 180
      ? Math.max(0.7, 128 / avgLum)
      : 1

  // Contrast: expand tonal range
  const range = high - low
  const contrastFactor = range < 200
    ? Math.min(1.4, 220 / Math.max(range, 1))
    : range > 240
      ? 0.95
      : 1

  const exposureFactor = avgLum < 80
    ? Math.min(1.3, 1 + (80 - avgLum) / 200)
    : avgLum > 200
      ? Math.max(0.8, 1 - (avgLum - 200) / 200)
      : 1

  // Saturation: boost if desaturated
  const saturationFactor = avgSat < 40
    ? Math.min(1.3, 1 + (40 - avgSat) / 100)
    : avgSat < 70
      ? Math.min(1.15, 1 + (70 - avgSat) / 200)
      : 1

  // Vibrance: always add a little pop
  const vibranceBoost = avgSat < 50 ? 0.15 : 0.08

  // Slight warmth for photos that are cool/neutral
  const warmthBoost = avgB > avgR + 10 ? 0.05 : 0

  return {
    brightness: Math.round(brightnessFactor * 100) / 100,
    contrast: Math.round(contrastFactor * 100) / 100,
    exposure: Math.round(exposureFactor * 100) / 100,
    saturation: Math.round(saturationFactor * 100) / 100,
    vibrance: Math.round(vibranceBoost * 100) / 100,
    warmth: warmthBoost,
    beauty: { smooth: 10, blemish: 10, evenness: 8, brightenEyes: 12, teethWhiten: 8 },
    reshape: { slimFace: 15, biggerEyes: 10, noseSlim: 5, jawline: 10 },
  }
}
