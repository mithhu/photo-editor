/** Map suggested filter names to preset IDs in constants.js */
const SUGGESTION_TO_PRESET = {
  bright: 'vivid',
  hdr: 'dramatic',
  cinematic: 'cinematic',
  matte: 'fade',
  vintage: 'vintage',
  film: 'vintage',
  vibrant: 'vivid',
  pop: 'y2k',
  cool: 'cool',
  arctic: 'cool',
  warm: 'warm',
  golden: 'golden-hour',
  contrast: 'clarendon',
  soft: 'dreamy',
  bw: 'bw',
}

export function suggestFilters(canvas) {
  const w = Math.min(canvas.width, 200)
  const h = Math.min(canvas.height, 200)

  const tmpCanvas = document.createElement('canvas')
  tmpCanvas.width = w
  tmpCanvas.height = h
  const tmpCtx = tmpCanvas.getContext('2d')
  tmpCtx.drawImage(canvas, 0, 0, w, h)

  const imageData = tmpCtx.getImageData(0, 0, w, h)
  const d = imageData.data
  const pixels = d.length / 4

  let totalBrightness = 0
  let totalSaturation = 0
  let totalWarmth = 0
  const lumValues = []

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]
    const g = d[i + 1]
    const b = d[i + 2]
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    lumValues.push(lum)
    totalBrightness += lum

    const max = Math.max(r, g, b) / 255
    const min = Math.min(r, g, b) / 255
    const sat = max > 0 ? (max - min) / max : 0
    totalSaturation += sat

    totalWarmth += (r - b) / 255
  }

  const avgBrightness = totalBrightness / pixels
  const avgSaturation = totalSaturation / pixels
  const avgWarmth = totalWarmth / pixels

  // Compute contrast (standard deviation of luminance)
  const meanLum = avgBrightness
  let lumVariance = 0
  for (const l of lumValues) {
    lumVariance += (l - meanLum) ** 2
  }
  const contrast = Math.sqrt(lumVariance / lumValues.length)

  const suggestions = []

  // Dark images → brighten
  if (avgBrightness < 0.35) {
    suggestions.push({ filter: 'bright', reason: 'Low light detected', confidence: 0.8 })
    suggestions.push({ filter: 'hdr', reason: 'Bring out details', confidence: 0.7 })
  }

  // Bright images → moody/cinematic
  if (avgBrightness > 0.65) {
    suggestions.push({ filter: 'cinematic', reason: 'High-key scene', confidence: 0.7 })
    suggestions.push({ filter: 'matte', reason: 'Soften brightness', confidence: 0.6 })
  }

  // High saturation → vintage/desaturate
  if (avgSaturation > 0.4) {
    suggestions.push({ filter: 'vintage', reason: 'Rich colors suit vintage', confidence: 0.75 })
    suggestions.push({ filter: 'film', reason: 'Film-like tones', confidence: 0.65 })
  }

  // Low saturation → pop/vibrant
  if (avgSaturation < 0.2) {
    suggestions.push({ filter: 'vibrant', reason: 'Boost muted colors', confidence: 0.8 })
    suggestions.push({ filter: 'pop', reason: 'Add punch', confidence: 0.7 })
  }

  // Warm images → cool filter
  if (avgWarmth > 0.1) {
    suggestions.push({ filter: 'cool', reason: 'Balance warm tones', confidence: 0.6 })
    suggestions.push({ filter: 'arctic', reason: 'Cool contrast', confidence: 0.5 })
  }

  // Cool images → warm filter
  if (avgWarmth < -0.05) {
    suggestions.push({ filter: 'warm', reason: 'Add warmth', confidence: 0.7 })
    suggestions.push({ filter: 'golden', reason: 'Golden hour look', confidence: 0.6 })
  }

  // Low contrast → contrast boost
  if (contrast < 0.15) {
    suggestions.push({ filter: 'contrast', reason: 'Flat image detected', confidence: 0.7 })
  }

  // High contrast → soften
  if (contrast > 0.35) {
    suggestions.push({ filter: 'soft', reason: 'Soften harsh contrast', confidence: 0.6 })
  }

  // Always suggest B&W as an option
  suggestions.push({ filter: 'bw', reason: 'Classic look', confidence: 0.4 })

  // Sort by confidence, take top 4
  suggestions.sort((a, b) => b.confidence - a.confidence)
  const top = suggestions.slice(0, 4)
  return top.map((s) => ({
    ...s,
    preset: SUGGESTION_TO_PRESET[s.filter] ?? 'none',
  }))
}
