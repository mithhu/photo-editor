interface CropRegion {
  sx: number
  sy: number
  sw: number
  sh: number
}

/**
 * Compute center-crop region (sx, sy, sw, sh) for given dimensions and aspect ratio.
 */
export function getCropRegion(w: number, h: number, ratio: string): CropRegion {
  if (ratio === 'original') return { sx: 0, sy: 0, sw: w, sh: h }

  const ratios: Record<string, number> = {
    '1:1': 1,
    '4:5': 4 / 5,
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '3:4': 3 / 4,
    '2:3': 2 / 3,
  }
  const targetRatio: number | undefined = ratios[ratio]
  if (!targetRatio) return { sx: 0, sy: 0, sw: w, sh: h }

  const currentRatio: number = w / h
  let sx: number = 0, sy: number = 0, sw: number = w, sh: number = h

  if (currentRatio > targetRatio) {
    sw = h * targetRatio
    sx = (w - sw) / 2
  } else {
    sh = w / targetRatio
    sy = (h - sh) / 2
  }

  return { sx, sy, sw, sh }
}

export const CROP_RATIOS: string[] = ['original', '1:1', '4:5', '16:9', '9:16', '3:4', '2:3', 'custom']
