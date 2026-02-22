let model: any = null

const isDev: boolean = typeof window !== 'undefined' && window.location.hostname === 'localhost'

interface Prediction {
  bbox: [number, number, number, number]
  class: string
  score: number
}

interface CropRegion {
  x: number
  y: number
  w: number
  h: number
}

async function loadModel(): Promise<any> {
  if (!model) {
    const tf = await import('@tensorflow/tfjs')
    await tf.ready()
    const cocoSsd = await import('@tensorflow-models/coco-ssd')
    try {
      const config = isDev
        ? { modelUrl: '/proxy-tfjs-models/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json' }
        : undefined
      model = await cocoSsd.load(config)
    } catch (e: any) {
      throw new Error(`COCO-SSD model failed to load: ${e.message}. Check your network connection.`)
    }
  }
  return model
}

export async function detectSubjects(imageElement: HTMLImageElement): Promise<Prediction[]> {
  const m = await loadModel()
  const predictions: Prediction[] = await m.detect(imageElement)
  return predictions
}

export function computeSmartCrop(
  predictions: Prediction[],
  imageWidth: number,
  imageHeight: number,
  targetRatio: number | null = null
): CropRegion | null {
  if (!predictions.length) return null

  let minX: number = imageWidth, minY: number = imageHeight, maxX: number = 0, maxY: number = 0

  predictions.forEach((pred) => {
    const [x, y, w, h] = pred.bbox
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + w)
    maxY = Math.max(maxY, y + h)
  })

  const padX: number = (maxX - minX) * 0.15
  const padY: number = (maxY - minY) * 0.15
  minX = Math.max(0, minX - padX)
  minY = Math.max(0, minY - padY)
  maxX = Math.min(imageWidth, maxX + padX)
  maxY = Math.min(imageHeight, maxY + padY)

  let cropW: number = maxX - minX
  let cropH: number = maxY - minY

  if (targetRatio) {
    const currentRatio: number = cropW / cropH
    if (currentRatio > targetRatio) {
      cropH = cropW / targetRatio
      const centerY: number = (minY + maxY) / 2
      minY = Math.max(0, centerY - cropH / 2)
      maxY = Math.min(imageHeight, minY + cropH)
    } else {
      cropW = cropH * targetRatio
      const centerX: number = (minX + maxX) / 2
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
