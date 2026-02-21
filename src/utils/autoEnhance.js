export function analyzeAndEnhance(canvas) {
  const ctx = canvas.getContext('2d')
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

  // Find 1st and 99th percentile for auto-levels
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

  // Target average luminance ~128
  const brightnessFactor = avgLum < 100
    ? Math.min(1.4, 128 / Math.max(avgLum, 1))
    : avgLum > 180
      ? Math.max(0.7, 128 / avgLum)
      : 1

  // Expand tonal range
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

  // Boost if image is desaturated
  const saturationFactor = avgSat < 40
    ? Math.min(1.3, 1 + (40 - avgSat) / 100)
    : 1

  return {
    brightness: Math.round(brightnessFactor * 100) / 100,
    contrast: Math.round(contrastFactor * 100) / 100,
    exposure: Math.round(exposureFactor * 100) / 100,
    saturation: Math.round(saturationFactor * 100) / 100,
  }
}
