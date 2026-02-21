let model = null

async function loadModel() {
  if (!model) {
    const tf = await import('@tensorflow/tfjs')
    await tf.ready()
    const blazeface = await import('@tensorflow-models/blazeface')
    try {
      model = await blazeface.load()
    } catch (e) {
      throw new Error(`BlazeFace model failed to load: ${e.message}. Check your network connection.`)
    }
  }
  return model
}

/**
 * Detect faces in an image using BlazeFace.
 * @param {string | HTMLImageElement} imageSrcOrElement - Data URL, URL, or loaded HTMLImageElement
 * @returns {Promise<Array<{ topLeft: [number, number], bottomRight: [number, number] }>>}
 *   Array of face bounding boxes (topLeft/bottomRight in normalized 0-1 coords)
 */
export async function detectFaces(imageSrcOrElement) {
  let img
  if (imageSrcOrElement instanceof HTMLImageElement) {
    img = imageSrcOrElement
    if (!img.complete || !img.naturalWidth) {
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = () => reject(new Error('Failed to load image for face detection'))
      })
    }
  } else {
    img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageSrcOrElement
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('Failed to load image for face detection'))
    })
  }

  const m = await loadModel()
  const faces = await m.estimateFaces(img, false, false, true)

  return faces.map((f) => ({
    topLeft: Array.isArray(f.topLeft) ? f.topLeft : [f.topLeft.dataSync()[0], f.topLeft.dataSync()[1]],
    bottomRight: Array.isArray(f.bottomRight)
      ? f.bottomRight
      : [f.bottomRight.dataSync()[0], f.bottomRight.dataSync()[1]],
  }))
}

/** Portrait-friendly aspect ratios: 3:4 ≈ 0.75, 4:5 = 0.8 */
const PORTRAIT_RATIO_3_4 = 3 / 4
const PORTRAIT_RATIO_4_5 = 4 / 5

/**
 * Compute a portrait crop region centered on detected face(s) with headroom.
 * @param {Array<{ topLeft: [number, number], bottomRight: [number, number] }>} faces - Normalized face boxes (0-1)
 * @param {number} imageWidth - Image width in pixels
 * @param {number} imageHeight - Image height in pixels
 * @param {number} [targetRatio] - Aspect ratio (width/height). Default 3:4. Use 4/5 for 4:5
 * @returns {{ x: number, y: number, w: number, h: number } | null} Normalized crop (0-1) or null if no faces
 */
export function computePortraitCrop(
  faces,
  imageWidth,
  imageHeight,
  targetRatio = PORTRAIT_RATIO_3_4
) {
  if (!faces?.length) return null

  // BlazeFace returns pixel coordinates
  let minX = imageWidth
  let minY = imageHeight
  let maxX = 0
  let maxY = 0

  faces.forEach((f) => {
    const x1 = f.topLeft[0]
    const y1 = f.topLeft[1]
    const x2 = f.bottomRight[0]
    const y2 = f.bottomRight[1]
    minX = Math.min(minX, x1)
    minY = Math.min(minY, y1)
    maxX = Math.max(maxX, x2)
    maxY = Math.max(maxY, y2)
  })

  const faceW = maxX - minX
  const faceH = maxY - minY
  const faceCenterX = (minX + maxX) / 2

  // Headroom: extra space above the face (typical portrait composition)
  const headroomRatio = 0.5
  const headroom = faceH * headroomRatio
  const sidePadding = faceW * 0.25

  // Desired crop height: from above head to below chin, with headroom
  const cropH = Math.max(faceH * 2.2, faceH + headroom + sidePadding)
  const cropW = cropH * targetRatio

  // Center horizontally on face; vertically shift up to include headroom above face top
  let cropX = faceCenterX - cropW / 2
  let cropY = minY - headroom
  cropY = Math.max(0, cropY)

  // Center the crop if we have room
  if (cropY + cropH > imageHeight) {
    cropY = Math.max(0, imageHeight - cropH)
  }
  if (cropY < 0) cropY = 0

  if (cropX < 0) cropX = 0
  if (cropX + cropW > imageWidth) {
    cropX = Math.max(0, imageWidth - cropW)
  }

  // Clamp to image bounds
  cropX = Math.max(0, Math.min(imageWidth - cropW, cropX))
  cropY = Math.max(0, Math.min(imageHeight - cropH, cropY))
  const finalW = Math.min(cropW, imageWidth - cropX)
  const finalH = Math.min(cropH, imageHeight - cropY)

  if (finalW <= 0 || finalH <= 0) return null

  return {
    x: cropX / imageWidth,
    y: cropY / imageHeight,
    w: finalW / imageWidth,
    h: finalH / imageHeight,
  }
}
