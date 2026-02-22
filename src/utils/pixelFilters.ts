const clamp = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v)

type RGBTuple = [number, number, number]

export interface PixelFilterOp {
  type: string
  value: number
}

export function applyBrightness(r: number, g: number, b: number, amount: number): RGBTuple {
  const f = amount
  return [clamp(r * f), clamp(g * f), clamp(b * f)]
}

export function applyContrast(r: number, g: number, b: number, amount: number): RGBTuple {
  const f = amount
  return [
    clamp(((r / 255 - 0.5) * f + 0.5) * 255),
    clamp(((g / 255 - 0.5) * f + 0.5) * 255),
    clamp(((b / 255 - 0.5) * f + 0.5) * 255),
  ]
}

export function applySaturate(r: number, g: number, b: number, amount: number): RGBTuple {
  const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return [
    clamp(gray + (r - gray) * amount),
    clamp(gray + (g - gray) * amount),
    clamp(gray + (b - gray) * amount),
  ]
}

export function applySepia(r: number, g: number, b: number, amount: number): RGBTuple {
  const sr = 0.393 * r + 0.769 * g + 0.189 * b
  const sg = 0.349 * r + 0.686 * g + 0.168 * b
  const sb = 0.272 * r + 0.534 * g + 0.131 * b
  return [
    clamp(r + (sr - r) * amount),
    clamp(g + (sg - g) * amount),
    clamp(b + (sb - b) * amount),
  ]
}

export function applyGrayscale(r: number, g: number, b: number, amount: number): RGBTuple {
  const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return [
    clamp(r + (gray - r) * amount),
    clamp(g + (gray - g) * amount),
    clamp(b + (gray - b) * amount),
  ]
}

export function applyHueRotate(r: number, g: number, b: number, degrees: number): RGBTuple {
  const rad = (degrees * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  // Standard hue-rotation matrix
  const nr = clamp(
    r * (0.213 + cos * 0.787 - sin * 0.213) +
    g * (0.715 - cos * 0.715 - sin * 0.715) +
    b * (0.072 - cos * 0.072 + sin * 0.928)
  )
  const ng = clamp(
    r * (0.213 - cos * 0.213 + sin * 0.143) +
    g * (0.715 + cos * 0.285 + sin * 0.140) +
    b * (0.072 - cos * 0.072 - sin * 0.283)
  )
  const nb = clamp(
    r * (0.213 - cos * 0.213 - sin * 0.787) +
    g * (0.715 - cos * 0.715 + sin * 0.715) +
    b * (0.072 + cos * 0.928 + sin * 0.072)
  )
  return [nr, ng, nb]
}

/**
 * Apply a sequence of filter operations to pixel data in-place.
 * Each op is { type: string, value: number }.
 * This replaces ctx.filter for iOS compatibility.
 */
export function applyPixelFilters(imgData: ImageData, ops: PixelFilterOp[]): void {
  if (!ops || ops.length === 0) return
  const d = imgData.data
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2]
    for (let j = 0; j < ops.length; j++) {
      const { type, value } = ops[j]
      switch (type) {
        case 'brightness':
          [r, g, b] = applyBrightness(r, g, b, value)
          break
        case 'contrast':
          [r, g, b] = applyContrast(r, g, b, value)
          break
        case 'saturate':
          [r, g, b] = applySaturate(r, g, b, value)
          break
        case 'sepia':
          [r, g, b] = applySepia(r, g, b, value)
          break
        case 'grayscale':
          [r, g, b] = applyGrayscale(r, g, b, value)
          break
        case 'hue-rotate':
          [r, g, b] = applyHueRotate(r, g, b, value)
          break
      }
    }
    d[i] = r
    d[i + 1] = g
    d[i + 2] = b
  }
}
