let upscalerInstance = null

const MAX_INPUT_PIXELS = 1024 * 1024 // 1 megapixel max input → 2 megapixel output

async function getUpscaler(onProgress) {
  if (upscalerInstance) return upscalerInstance
  onProgress?.('Loading upscale model...')
  const { default: Upscaler } = await import('upscaler')
  upscalerInstance = new Upscaler()
  await upscalerInstance.warmup([{ patchSize: 64, padding: 4 }])
  return upscalerInstance
}

function downscaleToLimit(img) {
  const { naturalWidth: w, naturalHeight: h } = img
  const pixels = w * h
  if (pixels <= MAX_INPUT_PIXELS) return img

  const scale = Math.sqrt(MAX_INPUT_PIXELS / pixels)
  const nw = Math.round(w * scale)
  const nh = Math.round(h * scale)

  const canvas = document.createElement('canvas')
  canvas.width = nw
  canvas.height = nh
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, nw, nh)
  return canvas
}

export async function upscaleImage(imageSrc, onProgress) {
  const upscaler = await getUpscaler(onProgress)

  const img = new Image()
  img.src = imageSrc
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = () => reject(new Error('Failed to load image'))
  })

  const { naturalWidth: ow, naturalHeight: oh } = img
  const input = downscaleToLimit(img)
  const inputW = input instanceof HTMLCanvasElement ? input.width : ow
  const inputH = input instanceof HTMLCanvasElement ? input.height : oh

  if (input instanceof HTMLCanvasElement) {
    onProgress?.(`Resized to ${inputW}×${inputH} before upscaling (original too large)...`)
  } else {
    onProgress?.('Upscaling image...')
  }

  const result = await upscaler.upscale(input, {
    output: 'base64',
    patchSize: 64,
    padding: 4,
    progress: (p) => {
      onProgress?.(`Upscaling... ${Math.round(p * 100)}%`)
    },
  })

  onProgress?.(`Done! Output: ${inputW * 2}×${inputH * 2}`)
  return result
}
