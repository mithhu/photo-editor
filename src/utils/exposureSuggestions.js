const LUMINANCE_UNDEREXPOSED = 85
const LUMINANCE_OVEREXPOSED = 180
const CONTRAST_LOW_RANGE = 120
const COLOR_CAST_THRESHOLD = 12
const MAX_SUGGESTIONS = 3

export function getExposureSuggestions(canvas) {
  if (!canvas) return []

  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  if (width === 0 || height === 0) return []

  const imageData = ctx.getImageData(0, 0, width, height)
  const d = imageData.data
  const pixelCount = d.length / 4

  let totalR = 0, totalG = 0, totalB = 0
  let minLum = 255, maxLum = 0
  let totalLum = 0

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    totalR += r
    totalG += g
    totalB += b
    totalLum += lum
    if (lum < minLum) minLum = lum
    if (lum > maxLum) maxLum = lum
  }

  const avgLum = totalLum / pixelCount
  const avgR = totalR / pixelCount
  const avgG = totalG / pixelCount
  const avgB = totalB / pixelCount
  const lumRange = maxLum - minLum

  const suggestions = []

  if (avgLum < LUMINANCE_UNDEREXPOSED) {
    const boost = Math.min(1.3, 1 + (LUMINANCE_UNDEREXPOSED - avgLum) / 200)
    suggestions.push({
      label: 'Brighten',
      description: 'Image appears underexposed',
      changes: {
        brightness: Math.round(boost * 100) / 100,
        exposure: Math.round(Math.min(1.2, 1 + (LUMINANCE_UNDEREXPOSED - avgLum) / 400) * 100) / 100,
      },
    })
  } else if (avgLum > LUMINANCE_OVEREXPOSED) {
    const reduce = Math.max(0.75, 1 - (avgLum - LUMINANCE_OVEREXPOSED) / 200)
    suggestions.push({
      label: 'Darken',
      description: 'Image appears overexposed',
      changes: {
        brightness: Math.round(reduce * 100) / 100,
        exposure: Math.round(Math.max(0.85, 1 - (avgLum - LUMINANCE_OVEREXPOSED) / 400) * 100) / 100,
      },
    })
  }

  const avgChannel = (avgR + avgG + avgB) / 3
  const deviationR = avgR - avgChannel
  const deviationG = avgG - avgChannel
  const deviationB = avgB - avgChannel

  const maxDeviation = Math.max(Math.abs(deviationR), Math.abs(deviationG), Math.abs(deviationB))
  if (maxDeviation > COLOR_CAST_THRESHOLD) {
    let warmthAdj = 0, tintAdj = 0, castLabel = ''

    if (Math.abs(deviationR) === maxDeviation && deviationR > 0) {
      warmthAdj = -Math.min(0.4, deviationR / 60)
      castLabel = 'warm (red) cast'
    } else if (Math.abs(deviationB) === maxDeviation && deviationB > 0) {
      warmthAdj = Math.min(0.4, deviationB / 60)
      castLabel = 'cool (blue) cast'
    } else if (Math.abs(deviationG) === maxDeviation && deviationG > 0) {
      tintAdj = -Math.min(0.4, deviationG / 60)
      castLabel = 'green cast'
    } else if (deviationG < 0 && Math.abs(deviationG) === maxDeviation) {
      tintAdj = Math.min(0.4, Math.abs(deviationG) / 60)
      castLabel = 'magenta cast'
    }

    if (warmthAdj !== 0 || tintAdj !== 0) {
      const changes = {}
      if (warmthAdj !== 0) changes.warmth = Math.round(warmthAdj * 100) / 100
      if (tintAdj !== 0) changes.tint = Math.round(tintAdj * 100) / 100
      suggestions.push({
        label: 'Fix White Balance',
        description: `Detected ${castLabel}`,
        changes,
      })
    }
  }

  if (lumRange < CONTRAST_LOW_RANGE) {
    const boost = Math.min(1.35, 1 + (CONTRAST_LOW_RANGE - lumRange) / 300)
    suggestions.push({
      label: 'Boost Contrast',
      description: 'Image has low tonal range',
      changes: {
        contrast: Math.round(boost * 100) / 100,
      },
    })
  }

  return suggestions.slice(0, MAX_SUGGESTIONS)
}
