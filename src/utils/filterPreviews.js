import { FILTER_PRESETS } from '../constants'
import { applyPixelFilters } from './pixelFilters'

const THUMB_SIZE = 48
let _cache = { src: null, previews: null }

/**
 * Load an image from a src string and draw it at THUMB_SIZE into a reusable
 * offscreen canvas, returning the base ImageData before any filter is applied.
 */
function loadThumbImageData(imageSrc) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = THUMB_SIZE
      canvas.height = THUMB_SIZE
      const ctx = canvas.getContext('2d')

      const aspect = img.width / img.height
      let sx = 0, sy = 0, sw = img.width, sh = img.height
      if (aspect > 1) {
        sw = img.height
        sx = (img.width - sw) / 2
      } else {
        sh = img.width
        sy = (img.height - sh) / 2
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, THUMB_SIZE, THUMB_SIZE)
      resolve({ canvas, ctx, baseData: ctx.getImageData(0, 0, THUMB_SIZE, THUMB_SIZE) })
    }
    img.onerror = reject
    img.src = imageSrc
  })
}

/**
 * Generate a Map of filterId -> dataURL thumbnails for every FILTER_PRESET.
 * Results are cached by imageSrc so repeated calls with the same image are free.
 */
export async function generateFilterPreviews(imageSrc) {
  if (!imageSrc) return {}
  if (_cache.src === imageSrc && _cache.previews) return _cache.previews

  const { canvas, ctx, baseData } = await loadThumbImageData(imageSrc)
  const previews = {}

  for (const preset of FILTER_PRESETS) {
    if (preset.ops.length === 0) {
      ctx.putImageData(baseData, 0, 0)
    } else {
      const copy = new ImageData(
        new Uint8ClampedArray(baseData.data),
        THUMB_SIZE,
        THUMB_SIZE
      )
      applyPixelFilters(copy, preset.ops)
      ctx.putImageData(copy, 0, 0)
    }
    previews[preset.id] = canvas.toDataURL('image/jpeg', 0.7)
  }

  _cache = { src: imageSrc, previews }
  return previews
}
