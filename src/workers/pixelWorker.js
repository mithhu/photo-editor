/**
 * Web Worker for heavy pixel processing that cannot run on the GPU.
 * Handles: Oil Paint (histogram-based), Glitch (random displacement), LUT 3D (trilinear).
 * All other effects have been moved to the WebGL pipeline.
 */

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v))

function applyLUT3D(d, lut) {
  if (!lut || !lut.data) return
  const size = lut.size
  const lutData = lut.data
  const sm1 = size - 1

  for (let i = 0; i < d.length; i += 4) {
    const rIdx = (d[i] / 255) * sm1
    const gIdx = (d[i + 1] / 255) * sm1
    const bIdx = (d[i + 2] / 255) * sm1

    const r0 = Math.floor(rIdx), r1 = Math.min(r0 + 1, sm1), rf = rIdx - r0
    const g0 = Math.floor(gIdx), g1 = Math.min(g0 + 1, sm1), gf = gIdx - g0
    const b0 = Math.floor(bIdx), b1 = Math.min(b0 + 1, sm1), bf = bIdx - b0

    const idx = (ri, gi, bi) => (bi * size * size + gi * size + ri) * 3
    const i000 = idx(r0, g0, b0), i100 = idx(r1, g0, b0)
    const i010 = idx(r0, g1, b0), i110 = idx(r1, g1, b0)
    const i001 = idx(r0, g0, b1), i101 = idx(r1, g0, b1)
    const i011 = idx(r0, g1, b1), i111 = idx(r1, g1, b1)

    for (let c = 0; c < 3; c++) {
      const c00 = lutData[i000 + c] * (1 - rf) + lutData[i100 + c] * rf
      const c10 = lutData[i010 + c] * (1 - rf) + lutData[i110 + c] * rf
      const c01 = lutData[i001 + c] * (1 - rf) + lutData[i101 + c] * rf
      const c11 = lutData[i011 + c] * (1 - rf) + lutData[i111 + c] * rf
      const c0 = c00 * (1 - gf) + c10 * gf
      const c1 = c01 * (1 - gf) + c11 * gf
      d[i + c] = clamp((c0 * (1 - bf) + c1 * bf) * 255)
    }
  }
}

self.onmessage = function (e) {
  const { type, data, width, height, params } = e.data

  if (type === 'processPixels') {
    const d = new Uint8ClampedArray(data)
    const { glitch, oilPaint, lut } = params

    // LUT 3D
    if (lut) applyLUT3D(d, lut)

    // Glitch effect
    const glitchAmt = glitch || 0
    if (glitchAmt > 0) {
      const intensity = glitchAmt / 100
      const src = new Uint8ClampedArray(d)
      const w = width, h = height
      const numSlices = Math.floor(2 + intensity * 20)
      let seed = w * h
      const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647 }

      for (let s = 0; s < numSlices; s++) {
        const sliceY = Math.floor(rand() * h)
        const sliceH = Math.floor(1 + rand() * intensity * 30)
        const offset = Math.floor((rand() - 0.5) * intensity * w * 0.3)

        for (let dy = 0; dy < sliceH && sliceY + dy < h; dy++) {
          const y = sliceY + dy
          for (let x = 0; x < w; x++) {
            const di = (y * w + x) * 4
            const sx = Math.max(0, Math.min(w - 1, x + offset))
            const si = (y * w + sx) * 4
            d[di] = src[si]
            d[di + 1] = src[di + 1]
            d[di + 2] = src[si + 2]
          }
        }
      }

      if (intensity > 0.3) {
        const channelShift = Math.floor(intensity * 8)
        for (let y = 0; y < h; y += Math.floor(3 + rand() * 10)) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4
            const rx = Math.min(w - 1, x + channelShift)
            d[i] = src[(y * w + rx) * 4]
          }
        }
      }
    }

    // Oil Paint effect
    const oilRadius = oilPaint || 0
    if (oilRadius > 0) {
      const src = new Uint8ClampedArray(d)
      const w = width, h = height
      const r = Math.min(oilRadius, 5)
      const levels = 20

      for (let y = r; y < h - r; y++) {
        for (let x = r; x < w - r; x++) {
          const bins = new Uint32Array(levels)
          const binR = new Float32Array(levels)
          const binG = new Float32Array(levels)
          const binB = new Float32Array(levels)

          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              const si = ((y + dy) * w + (x + dx)) * 4
              const intns = Math.floor(((src[si] + src[si + 1] + src[si + 2]) / 3) * levels / 256)
              const bin = Math.min(levels - 1, intns)
              bins[bin]++
              binR[bin] += src[si]
              binG[bin] += src[si + 1]
              binB[bin] += src[si + 2]
            }
          }

          let maxBin = 0, maxCount = 0
          for (let b = 0; b < levels; b++) {
            if (bins[b] > maxCount) { maxCount = bins[b]; maxBin = b }
          }

          const di = (y * w + x) * 4
          if (maxCount > 0) {
            d[di] = Math.round(binR[maxBin] / maxCount)
            d[di + 1] = Math.round(binG[maxBin] / maxCount)
            d[di + 2] = Math.round(binB[maxBin] / maxCount)
          }
        }
      }
    }

    self.postMessage({ type: 'pixelsProcessed', data: d.buffer, width, height }, [d.buffer])
  }
}
