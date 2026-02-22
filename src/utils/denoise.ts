/**
 * Fast bilateral-filter-inspired denoise using a box-blur approach.
 * Runs entirely on canvas pixel data — no ML model needed.
 * Strength 0-1 controls blend between original and smoothed.
 */
export function denoiseImage(canvas: HTMLCanvasElement, strength: number = 0.5): string {
  const ctx = canvas.getContext('2d')!
  const w: number = canvas.width
  const h: number = canvas.height
  const src: ImageData = ctx.getImageData(0, 0, w, h)
  const dst: ImageData = ctx.getImageData(0, 0, w, h)
  const sd: Uint8ClampedArray = src.data
  const dd: Uint8ClampedArray = dst.data
  const radius: number = strength < 0.3 ? 1 : strength < 0.7 ? 2 : 3
  const threshold: number = 20 + strength * 40

  for (let y = radius; y < h - radius; y++) {
    for (let x = radius; x < w - radius; x++) {
      const idx: number = (y * w + x) * 4
      let rSum = 0, gSum = 0, bSum = 0, wSum = 0

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const nIdx: number = ((y + ky) * w + (x + kx)) * 4
          const dr: number = sd[nIdx] - sd[idx]
          const dg: number = sd[nIdx + 1] - sd[idx + 1]
          const db: number = sd[nIdx + 2] - sd[idx + 2]
          const colorDist: number = Math.sqrt(dr * dr + dg * dg + db * db)

          if (colorDist < threshold) {
            const weight: number = 1 - colorDist / threshold
            rSum += sd[nIdx] * weight
            gSum += sd[nIdx + 1] * weight
            bSum += sd[nIdx + 2] * weight
            wSum += weight
          }
        }
      }

      if (wSum > 0) {
        const blend: number = strength
        dd[idx] = sd[idx] * (1 - blend) + (rSum / wSum) * blend
        dd[idx + 1] = sd[idx + 1] * (1 - blend) + (gSum / wSum) * blend
        dd[idx + 2] = sd[idx + 2] * (1 - blend) + (bSum / wSum) * blend
      }
    }
  }

  ctx.putImageData(dst, 0, 0)
  return canvas.toDataURL('image/png')
}

export async function denoiseFromSrc(
  imageSrc: string,
  strength: number = 0.5,
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.('Preparing denoise...')

  const img = new Image()
  img.src = imageSrc
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image'))
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  onProgress?.('Reducing noise...')

  await new Promise<void>((resolve) => requestAnimationFrame(() => {
    denoiseImage(canvas, strength)
    resolve()
  }))

  return canvas.toDataURL('image/png')
}
