let model: any = null

async function loadModel(): Promise<any> {
  if (!model) {
    const tf = await import('@tensorflow/tfjs')
    await tf.ready()
    const blazeface = await import('@tensorflow-models/blazeface')
    try {
      model = await blazeface.load()
    } catch (e: any) {
      throw new Error(`BlazeFace model failed to load: ${e.message}. Check your network connection.`)
    }
  }
  return model
}

export interface FaceBox {
  topLeft: [number, number]
  bottomRight: [number, number]
}

interface CropRegion {
  x: number
  y: number
  w: number
  h: number
}

export async function detectFaces(imageSrcOrElement: string | HTMLImageElement): Promise<FaceBox[]> {
  let img: HTMLImageElement
  if (imageSrcOrElement instanceof HTMLImageElement) {
    img = imageSrcOrElement
    if (!img.complete || !img.naturalWidth) {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image for face detection'))
      })
    }
  } else {
    img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageSrcOrElement
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load image for face detection'))
    })
  }

  const m = await loadModel()
  const faces: any[] = await m.estimateFaces(img, false, false, true)

  return faces.map((f: any) => ({
    topLeft: Array.isArray(f.topLeft) ? f.topLeft : [f.topLeft.dataSync()[0], f.topLeft.dataSync()[1]],
    bottomRight: Array.isArray(f.bottomRight)
      ? f.bottomRight
      : [f.bottomRight.dataSync()[0], f.bottomRight.dataSync()[1]],
  })) as FaceBox[]
}

/** Portrait-friendly aspect ratios: 3:4 ≈ 0.75, 4:5 = 0.8 */
const PORTRAIT_RATIO_3_4: number = 3 / 4
const PORTRAIT_RATIO_4_5: number = 4 / 5

export function computePortraitCrop(
  faces: FaceBox[],
  imageWidth: number,
  imageHeight: number,
  targetRatio: number = PORTRAIT_RATIO_3_4
): CropRegion | null {
  if (!faces?.length) return null

  let minX: number = imageWidth
  let minY: number = imageHeight
  let maxX: number = 0
  let maxY: number = 0

  faces.forEach((f) => {
    const x1: number = f.topLeft[0]
    const y1: number = f.topLeft[1]
    const x2: number = f.bottomRight[0]
    const y2: number = f.bottomRight[1]
    minX = Math.min(minX, x1)
    minY = Math.min(minY, y1)
    maxX = Math.max(maxX, x2)
    maxY = Math.max(maxY, y2)
  })

  const faceW: number = maxX - minX
  const faceH: number = maxY - minY
  const faceCenterX: number = (minX + maxX) / 2

  const headroomRatio: number = 0.5
  const headroom: number = faceH * headroomRatio
  const sidePadding: number = faceW * 0.25

  const cropH: number = Math.max(faceH * 2.2, faceH + headroom + sidePadding)
  const cropW: number = cropH * targetRatio

  let cropX: number = faceCenterX - cropW / 2
  let cropY: number = minY - headroom
  cropY = Math.max(0, cropY)

  if (cropY + cropH > imageHeight) {
    cropY = Math.max(0, imageHeight - cropH)
  }
  if (cropY < 0) cropY = 0

  if (cropX < 0) cropX = 0
  if (cropX + cropW > imageWidth) {
    cropX = Math.max(0, imageWidth - cropW)
  }

  cropX = Math.max(0, Math.min(imageWidth - cropW, cropX))
  cropY = Math.max(0, Math.min(imageHeight - cropH, cropY))
  const finalW: number = Math.min(cropW, imageWidth - cropX)
  const finalH: number = Math.min(cropH, imageHeight - cropY)

  if (finalW <= 0 || finalH <= 0) return null

  return {
    x: cropX / imageWidth,
    y: cropY / imageHeight,
    w: finalW / imageWidth,
    h: finalH / imageHeight,
  }
}
