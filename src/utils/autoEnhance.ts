/**
 * Analyze an image on the canvas and return optimal edit settings.
 * One-tap enhancement: adjusts exposure, contrast, saturation, and optionally beauty.
 */

import type { BeautySettings, ReshapeSettings } from '../types'

interface EnhanceResult {
  brightness: number
  contrast: number
  exposure: number
  saturation: number
  vibrance: number
  warmth: number
  beauty: BeautySettings
  reshape: ReshapeSettings
}

export function analyzeAndEnhance(canvas: HTMLCanvasElement): EnhanceResult {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const imageData: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d: Uint8ClampedArray = imageData.data

  const histogram: number[] = new Array(256).fill(0)
  let totalR: number = 0, totalG: number = 0, totalB: number = 0
  const pixelCount: number = d.length / 4

  for (let i = 0; i < d.length; i += 4) {
    const lum: number = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
    histogram[lum]++
    totalR += d[i]
    totalG += d[i + 1]
    totalB += d[i + 2]
  }

  let cumulative: number = 0
  let low: number = 0, high: number = 255
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i]
    if (cumulative / pixelCount >= 0.01) { low = i; break }
  }
  cumulative = 0
  for (let i = 255; i >= 0; i--) {
    cumulative += histogram[i]
    if (cumulative / pixelCount >= 0.01) { high = i; break }
  }

  const avgLum: number = histogram.reduce((sum, count, i) => sum + count * i, 0) / pixelCount

  const avgR: number = totalR / pixelCount
  const avgG: number = totalG / pixelCount
  const avgB: number = totalB / pixelCount
  const avgSat: number = Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB)

  const brightnessFactor: number = avgLum < 100
    ? Math.min(1.4, 128 / Math.max(avgLum, 1))
    : avgLum > 180
      ? Math.max(0.7, 128 / avgLum)
      : 1

  const range: number = high - low
  const contrastFactor: number = range < 200
    ? Math.min(1.4, 220 / Math.max(range, 1))
    : range > 240
      ? 0.95
      : 1

  const exposureFactor: number = avgLum < 80
    ? Math.min(1.3, 1 + (80 - avgLum) / 200)
    : avgLum > 200
      ? Math.max(0.8, 1 - (avgLum - 200) / 200)
      : 1

  const saturationFactor: number = avgSat < 40
    ? Math.min(1.3, 1 + (40 - avgSat) / 100)
    : avgSat < 70
      ? Math.min(1.15, 1 + (70 - avgSat) / 200)
      : 1

  const vibranceBoost: number = avgSat < 50 ? 0.15 : 0.08

  const warmthBoost: number = avgB > avgR + 10 ? 0.05 : 0

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
