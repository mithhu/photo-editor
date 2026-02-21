let upscalerInstance = null

async function getUpscaler(onProgress) {
  if (upscalerInstance) return upscalerInstance
  onProgress?.('Loading upscale model...')
  const { default: Upscaler } = await import('upscaler')
  upscalerInstance = new Upscaler()
  await upscalerInstance.warmup([{ patchSize: 64, padding: 2 }])
  return upscalerInstance
}

export async function upscaleImage(imageSrc, onProgress) {
  const upscaler = await getUpscaler(onProgress)
  onProgress?.('Upscaling image (this may take a moment)...')

  const img = new Image()
  img.src = imageSrc
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = () => reject(new Error('Failed to load image'))
  })

  const result = await upscaler.upscale(img, {
    output: 'base64',
    patchSize: 64,
    padding: 2,
    progress: (p) => {
      onProgress?.(`Upscaling... ${Math.round(p * 100)}%`)
    },
  })

  return result
}
