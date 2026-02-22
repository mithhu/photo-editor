/**
 * Magic Wand selection tool.
 * Flood-fills from a seed point, selecting all connected pixels within a color tolerance.
 * Returns a Uint8Array mask (0 = unselected, 255 = selected).
 */
export function magicWandSelect(
  imageData: ImageData,
  seedX: number,
  seedY: number,
  tolerance: number = 32,
  contiguous: boolean = true
): Uint8Array {
  const { width, height, data } = imageData
  const mask = new Uint8Array(width * height)
  const sx: number = Math.round(seedX)
  const sy: number = Math.round(seedY)
  if (sx < 0 || sx >= width || sy < 0 || sy >= height) return mask

  const seedIdx: number = (sy * width + sx) * 4
  const seedR: number = data[seedIdx]
  const seedG: number = data[seedIdx + 1]
  const seedB: number = data[seedIdx + 2]
  const tol2: number = tolerance * tolerance * 3

  const colorMatch = (i: number): boolean => {
    const dr: number = data[i] - seedR
    const dg: number = data[i + 1] - seedG
    const db: number = data[i + 2] - seedB
    return (dr * dr + dg * dg + db * db) <= tol2
  }

  if (contiguous) {
    const visited = new Uint8Array(width * height)
    const stack: number[] = [sx + sy * width]
    visited[sx + sy * width] = 1

    while (stack.length > 0) {
      const idx: number = stack.pop()!
      const px: number = idx % width
      const py: number = (idx - px) / width
      const pi: number = idx * 4

      if (colorMatch(pi)) {
        mask[idx] = 255
        if (px > 0 && !visited[idx - 1]) { visited[idx - 1] = 1; stack.push(idx - 1) }
        if (px < width - 1 && !visited[idx + 1]) { visited[idx + 1] = 1; stack.push(idx + 1) }
        if (py > 0 && !visited[idx - width]) { visited[idx - width] = 1; stack.push(idx - width) }
        if (py < height - 1 && !visited[idx + width]) { visited[idx + width] = 1; stack.push(idx + width) }
      }
    }
  } else {
    for (let i = 0; i < width * height; i++) {
      if (colorMatch(i * 4)) mask[i] = 255
    }
  }

  return mask
}

/**
 * Feather a selection mask using a simple box blur.
 */
export function featherMask(mask: Uint8Array, width: number, height: number, radius: number = 2): Uint8Array {
  if (radius <= 0) return mask
  const out = new Uint8Array(width * height)
  const r: number = Math.ceil(radius)
  const area: number = (2 * r + 1) * (2 * r + 1)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum: number = 0
      for (let dy = -r; dy <= r; dy++) {
        const ny: number = y + dy
        if (ny < 0 || ny >= height) continue
        for (let dx = -r; dx <= r; dx++) {
          const nx: number = x + dx
          if (nx < 0 || nx >= width) continue
          sum += mask[ny * width + nx]
        }
      }
      out[y * width + x] = Math.round(sum / area)
    }
  }
  return out
}

/**
 * Draw the selection as a tinted overlay (unselected = dimmed, selected = clear).
 * Uses a temporary canvas for proper alpha compositing.
 */
export function drawSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  mask: Uint8Array,
  width: number,
  height: number
): void {
  const tmpCanvas: HTMLCanvasElement = document.createElement('canvas')
  tmpCanvas.width = width
  tmpCanvas.height = height
  const tmpCtx: CanvasRenderingContext2D = tmpCanvas.getContext('2d')!
  const overlayData: ImageData = tmpCtx.createImageData(width, height)
  const od: Uint8ClampedArray = overlayData.data

  for (let i = 0; i < mask.length; i++) {
    const pi: number = i * 4
    if (mask[i] < 128) {
      od[pi] = 0; od[pi + 1] = 0; od[pi + 2] = 0; od[pi + 3] = 100
    }
    const x: number = i % width, y: number = (i - x) / width
    if (mask[i] >= 128) {
      const left: number = x > 0 ? mask[i - 1] : 0
      const right: number = x < width - 1 ? mask[i + 1] : 0
      const top: number = y > 0 ? mask[i - width] : 0
      const bottom: number = y < height - 1 ? mask[i + width] : 0
      if (left < 128 || right < 128 || top < 128 || bottom < 128) {
        od[pi] = 130; od[pi + 1] = 130; od[pi + 2] = 255; od[pi + 3] = 180
      }
    }
  }

  tmpCtx.putImageData(overlayData, 0, 0)
  ctx.drawImage(tmpCanvas, 0, 0)
}
