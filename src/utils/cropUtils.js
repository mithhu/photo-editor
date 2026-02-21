/**
 * Compute center-crop region (sx, sy, sw, sh) for given dimensions and aspect ratio.
 * @param {number} w - Image width
 * @param {number} h - Image height
 * @param {string} ratio - 'original' | '1:1' | '4:5' | '16:9' | '9:16' | '3:4' | '2:3'
 * @returns {{ sx: number, sy: number, sw: number, sh: number }}
 */
export function getCropRegion(w, h, ratio) {
  if (ratio === 'original') return { sx: 0, sy: 0, sw: w, sh: h }

  const ratios = {
    '1:1': 1,
    '4:5': 4 / 5,
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '3:4': 3 / 4,
    '2:3': 2 / 3,
  }
  const targetRatio = ratios[ratio]
  if (!targetRatio) return { sx: 0, sy: 0, sw: w, sh: h }

  const currentRatio = w / h
  let sx = 0, sy = 0, sw = w, sh = h

  if (currentRatio > targetRatio) {
    sw = h * targetRatio
    sx = (w - sw) / 2
  } else {
    sh = w / targetRatio
    sy = (h - sh) / 2
  }

  return { sx, sy, sw, sh }
}

export const CROP_RATIOS = ['original', '1:1', '4:5', '16:9', '9:16', '3:4', '2:3', 'custom']
