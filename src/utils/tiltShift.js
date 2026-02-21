/**
 * Tilt-shift / focus blur effect.
 *
 * Applies spatially-varying blur: a sharp area stays crisp while everything
 * outside it gradually blurs using multi-pass box blur for quality.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasW
 * @param {number} canvasH
 * @param {{ mode: 'linear'|'radial', position: number, size: number, blur: number }} params
 *   position: 0-100 normalized center of the focus region
 *   size: 0-100 how large the sharp area is
 *   blur: 0-20 max blur radius in pixels
 */
export function applyTiltShift(ctx, canvasW, canvasH, params) {
  const { mode, position, size, blur } = params
  if (!blur || blur <= 0) return

  const pos = (position ?? 50) / 100
  const sz = Math.max(0.01, (size ?? 30) / 100)
  const maxBlur = Math.min(blur, 20)

  const src = ctx.getImageData(0, 0, canvasW, canvasH)
  const blurred = blurImageData(src, Math.ceil(maxBlur))

  const sd = src.data
  const bd = blurred.data

  for (let y = 0; y < canvasH; y++) {
    for (let x = 0; x < canvasW; x++) {
      const nx = x / canvasW
      const ny = y / canvasH

      let dist
      if (mode === 'radial') {
        const dx = nx - 0.5
        const dy = ny - pos
        dist = Math.sqrt(dx * dx + dy * dy) * 2
      } else {
        dist = Math.abs(ny - pos)
      }

      const halfSize = sz / 2
      const t = Math.min(1, Math.max(0, (dist - halfSize) / Math.max(halfSize, 0.01)))
      const alpha = t * t

      const i = (y * canvasW + x) * 4
      sd[i] = sd[i] + (bd[i] - sd[i]) * alpha
      sd[i + 1] = sd[i + 1] + (bd[i + 1] - sd[i + 1]) * alpha
      sd[i + 2] = sd[i + 2] + (bd[i + 2] - sd[i + 2]) * alpha
    }
  }

  ctx.putImageData(src, 0, 0)
}

/**
 * Three-pass box blur for high quality (approximates Gaussian).
 * Operates on a copy of the ImageData so the original is untouched.
 */
function blurImageData(imageData, radius) {
  const w = imageData.width
  const h = imageData.height

  const copy = new ImageData(
    new Uint8ClampedArray(imageData.data),
    w,
    h,
  )

  const passes = 3
  for (let p = 0; p < passes; p++) {
    boxBlurH(copy.data, w, h, radius)
    boxBlurV(copy.data, w, h, radius)
  }

  return copy
}

function boxBlurH(data, w, h, radius) {
  const r = Math.min(radius, Math.floor(w / 2))
  const diam = r * 2 + 1
  const temp = new Float32Array(w * 4)

  for (let y = 0; y < h; y++) {
    const rowOff = y * w * 4

    let sumR = 0, sumG = 0, sumB = 0, sumA = 0
    for (let i = -r; i <= r; i++) {
      const idx = rowOff + Math.min(w - 1, Math.max(0, i)) * 4
      sumR += data[idx]
      sumG += data[idx + 1]
      sumB += data[idx + 2]
      sumA += data[idx + 3]
    }

    for (let x = 0; x < w; x++) {
      temp[x * 4] = sumR / diam
      temp[x * 4 + 1] = sumG / diam
      temp[x * 4 + 2] = sumB / diam
      temp[x * 4 + 3] = sumA / diam

      const addIdx = Math.min(w - 1, x + r + 1)
      const subIdx = Math.max(0, x - r)

      const ai = rowOff + addIdx * 4
      const si = rowOff + subIdx * 4

      sumR += data[ai] - data[si]
      sumG += data[ai + 1] - data[si + 1]
      sumB += data[ai + 2] - data[si + 2]
      sumA += data[ai + 3] - data[si + 3]
    }

    for (let x = 0; x < w; x++) {
      const idx = rowOff + x * 4
      data[idx] = temp[x * 4]
      data[idx + 1] = temp[x * 4 + 1]
      data[idx + 2] = temp[x * 4 + 2]
      data[idx + 3] = temp[x * 4 + 3]
    }
  }
}

function boxBlurV(data, w, h, radius) {
  const r = Math.min(radius, Math.floor(h / 2))
  const diam = r * 2 + 1
  const temp = new Float32Array(h * 4)

  for (let x = 0; x < w; x++) {
    let sumR = 0, sumG = 0, sumB = 0, sumA = 0

    for (let i = -r; i <= r; i++) {
      const row = Math.min(h - 1, Math.max(0, i))
      const idx = (row * w + x) * 4
      sumR += data[idx]
      sumG += data[idx + 1]
      sumB += data[idx + 2]
      sumA += data[idx + 3]
    }

    for (let y = 0; y < h; y++) {
      temp[y * 4] = sumR / diam
      temp[y * 4 + 1] = sumG / diam
      temp[y * 4 + 2] = sumB / diam
      temp[y * 4 + 3] = sumA / diam

      const addRow = Math.min(h - 1, y + r + 1)
      const subRow = Math.max(0, y - r)

      const ai = (addRow * w + x) * 4
      const si = (subRow * w + x) * 4

      sumR += data[ai] - data[si]
      sumG += data[ai + 1] - data[si + 1]
      sumB += data[ai + 2] - data[si + 2]
      sumA += data[ai + 3] - data[si + 3]
    }

    for (let y = 0; y < h; y++) {
      const idx = (y * w + x) * 4
      data[idx] = temp[y * 4]
      data[idx + 1] = temp[y * 4 + 1]
      data[idx + 2] = temp[y * 4 + 2]
      data[idx + 3] = temp[y * 4 + 3]
    }
  }
}
