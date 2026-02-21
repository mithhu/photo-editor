/**
 * Applies monochromatic film grain noise to an existing canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width  - canvas pixel width
 * @param {number} height - canvas pixel height
 * @param {number} amount - 0-100 intensity
 * @param {number} size   - 1 (fine), 2 (medium), 3 (coarse)
 */
export function applyGrain(ctx, width, height, amount, size) {
  if (amount <= 0) return

  const imgData = ctx.getImageData(0, 0, width, height)
  const d = imgData.data
  const intensity = (amount / 100) * 80
  const blockSize = Math.max(1, Math.min(3, Math.round(size)))

  if (blockSize === 1) {
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * intensity
      d[i] = Math.min(255, Math.max(0, d[i] + noise))
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise))
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise))
    }
  } else {
    for (let by = 0; by < height; by += blockSize) {
      for (let bx = 0; bx < width; bx += blockSize) {
        const noise = (Math.random() - 0.5) * intensity
        const maxY = Math.min(by + blockSize, height)
        const maxX = Math.min(bx + blockSize, width)
        for (let y = by; y < maxY; y++) {
          for (let x = bx; x < maxX; x++) {
            const i = (y * width + x) * 4
            d[i] = Math.min(255, Math.max(0, d[i] + noise))
            d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise))
            d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise))
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0)
}
