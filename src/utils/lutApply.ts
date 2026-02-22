import type { ParsedLUT } from './lutParser'

/**
 * Apply a parsed 3D LUT to ImageData using trilinear interpolation.
 * For 1D LUTs, applies per-channel lookup.
 */
export function applyLUT(imageData: ImageData, lut: ParsedLUT): void {
  if (!lut || !lut.data || !lut.size) return

  const d = imageData.data
  const { size, type, data, domainMin, domainMax } = lut

  if (type === '1d') {
    applyLUT1D(d, size, data, domainMin, domainMax)
  } else {
    applyLUT3D(d, size, data, domainMin, domainMax)
  }
}

function applyLUT1D(d: Uint8ClampedArray, size: number, data: Float32Array, domainMin: number[], domainMax: number[]): void {
  const rangeR = domainMax[0] - domainMin[0]
  const rangeG = domainMax[1] - domainMin[1]
  const rangeB = domainMax[2] - domainMin[2]
  const maxIdx = size - 1

  for (let i = 0; i < d.length; i += 4) {
    const nr = (d[i] / 255 - domainMin[0]) / rangeR
    const ng = (d[i + 1] / 255 - domainMin[1]) / rangeG
    const nb = (d[i + 2] / 255 - domainMin[2]) / rangeB

    const ri = Math.min(maxIdx, Math.max(0, nr * maxIdx))
    const gi = Math.min(maxIdx, Math.max(0, ng * maxIdx))
    const bi = Math.min(maxIdx, Math.max(0, nb * maxIdx))

    const rLo = Math.floor(ri), rHi = Math.min(maxIdx, rLo + 1), rFrac = ri - rLo
    const gLo = Math.floor(gi), gHi = Math.min(maxIdx, gLo + 1), gFrac = gi - gLo
    const bLo = Math.floor(bi), bHi = Math.min(maxIdx, bLo + 1), bFrac = bi - bLo

    d[i]     = Math.min(255, Math.max(0, Math.round((data[rLo * 3]     * (1 - rFrac) + data[rHi * 3]     * rFrac) * 255)))
    d[i + 1] = Math.min(255, Math.max(0, Math.round((data[gLo * 3 + 1] * (1 - gFrac) + data[gHi * 3 + 1] * gFrac) * 255)))
    d[i + 2] = Math.min(255, Math.max(0, Math.round((data[bLo * 3 + 2] * (1 - bFrac) + data[bHi * 3 + 2] * bFrac) * 255)))
  }
}

function applyLUT3D(d: Uint8ClampedArray, size: number, data: Float32Array, domainMin: number[], domainMax: number[]): void {
  const rangeR = domainMax[0] - domainMin[0]
  const rangeG = domainMax[1] - domainMin[1]
  const rangeB = domainMax[2] - domainMin[2]
  const maxIdx = size - 1
  const size3 = size * 3
  const sizeSize3 = size * size3

  for (let i = 0; i < d.length; i += 4) {
    const nr = (d[i] / 255 - domainMin[0]) / rangeR
    const ng = (d[i + 1] / 255 - domainMin[1]) / rangeG
    const nb = (d[i + 2] / 255 - domainMin[2]) / rangeB

    const ri = Math.min(maxIdx, Math.max(0, nr * maxIdx))
    const gi = Math.min(maxIdx, Math.max(0, ng * maxIdx))
    const bi = Math.min(maxIdx, Math.max(0, nb * maxIdx))

    const r0 = Math.floor(ri), r1 = Math.min(maxIdx, r0 + 1)
    const g0 = Math.floor(gi), g1 = Math.min(maxIdx, g0 + 1)
    const b0 = Math.floor(bi), b1 = Math.min(maxIdx, b0 + 1)

    const rf = ri - r0
    const gf = gi - g0
    const bf = bi - b0

    // .cube ordering: R changes fastest, then G, then B
    // index = (b * size * size + g * size + r) * 3
    const i000 = (b0 * sizeSize3 + g0 * size3 + r0 * 3)
    const i100 = (b0 * sizeSize3 + g0 * size3 + r1 * 3)
    const i010 = (b0 * sizeSize3 + g1 * size3 + r0 * 3)
    const i110 = (b0 * sizeSize3 + g1 * size3 + r1 * 3)
    const i001 = (b1 * sizeSize3 + g0 * size3 + r0 * 3)
    const i101 = (b1 * sizeSize3 + g0 * size3 + r1 * 3)
    const i011 = (b1 * sizeSize3 + g1 * size3 + r0 * 3)
    const i111 = (b1 * sizeSize3 + g1 * size3 + r1 * 3)

    for (let c = 0; c < 3; c++) {
      const c00 = data[i000 + c] * (1 - rf) + data[i100 + c] * rf
      const c10 = data[i010 + c] * (1 - rf) + data[i110 + c] * rf
      const c01 = data[i001 + c] * (1 - rf) + data[i101 + c] * rf
      const c11 = data[i011 + c] * (1 - rf) + data[i111 + c] * rf

      const c0 = c00 * (1 - gf) + c10 * gf
      const c1 = c01 * (1 - gf) + c11 * gf

      const val = c0 * (1 - bf) + c1 * bf
      d[i + c] = Math.min(255, Math.max(0, Math.round(val * 255)))
    }
  }
}
