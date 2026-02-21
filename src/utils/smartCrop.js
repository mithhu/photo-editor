let model = null

async function loadModel() {
  if (!model) {
    const tf = await import('@tensorflow/tfjs')
    await tf.ready()
    const cocoSsd = await import('@tensorflow-models/coco-ssd')
    try {
      model = await cocoSsd.load()
    } catch (e) {
      throw new Error(`COCO-SSD model failed to load: ${e.message}. Check your network connection.`)
    }
  }
  return model
}

export async function detectSubjects(imageElement) {
  const m = await loadModel()
  const predictions = await m.detect(imageElement)
  return predictions
}

export function computeSmartCrop(predictions, imageWidth, imageHeight, targetRatio = null) {
  if (!predictions.length) return null

  let minX = imageWidth, minY = imageHeight, maxX = 0, maxY = 0

  predictions.forEach((pred) => {
    const [x, y, w, h] = pred.bbox
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + w)
    maxY = Math.max(maxY, y + h)
  })

  const padX = (maxX - minX) * 0.15
  const padY = (maxY - minY) * 0.15
  minX = Math.max(0, minX - padX)
  minY = Math.max(0, minY - padY)
  maxX = Math.min(imageWidth, maxX + padX)
  maxY = Math.min(imageHeight, maxY + padY)

  let cropW = maxX - minX
  let cropH = maxY - minY

  if (targetRatio) {
    const currentRatio = cropW / cropH
    if (currentRatio > targetRatio) {
      cropH = cropW / targetRatio
      const centerY = (minY + maxY) / 2
      minY = Math.max(0, centerY - cropH / 2)
      maxY = Math.min(imageHeight, minY + cropH)
    } else {
      cropW = cropH * targetRatio
      const centerX = (minX + maxX) / 2
      minX = Math.max(0, centerX - cropW / 2)
      maxX = Math.min(imageWidth, minX + cropW)
    }
  }

  return {
    x: minX / imageWidth,
    y: minY / imageHeight,
    w: (maxX - minX) / imageWidth,
    h: (maxY - minY) / imageHeight,
  }
}
