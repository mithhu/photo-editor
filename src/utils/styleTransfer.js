import * as tf from '@tensorflow/tfjs'

let styleNet = null
let transformNet = null

const STYLE_NET_URL = 'https://storage.googleapis.com/magenta-js/image/style_transfer/style_net/model.json'
const TRANSFORM_NET_URL = 'https://storage.googleapis.com/magenta-js/image/style_transfer/transformer_net/model.json'

async function loadModels(onProgress) {
  if (!styleNet) {
    onProgress?.('Loading style model...')
    await tf.ready()
    styleNet = await tf.loadGraphModel(STYLE_NET_URL)
  }
  if (!transformNet) {
    onProgress?.('Loading transform model...')
    transformNet = await tf.loadGraphModel(TRANSFORM_NET_URL)
  }
}

export async function applyStyleTransfer(contentCanvas, styleImageSrc, strength = 1.0, onProgress) {
  onProgress?.('Loading models...')
  await loadModels(onProgress)

  onProgress?.('Processing style...')

  const styleImg = await loadImage(styleImageSrc)

  const styleTensor = tf.browser.fromPixels(styleImg).toFloat().div(255).expandDims()
  const styleResized = tf.image.resizeBilinear(styleTensor, [256, 256])
  const styleBottleneck = styleNet.predict(styleResized)

  onProgress?.('Applying style...')

  const contentTensor = tf.browser.fromPixels(contentCanvas).toFloat().div(255).expandDims()
  const contentResized = tf.image.resizeBilinear(contentTensor, [384, 384])

  const stylized = transformNet.predict([contentResized, styleBottleneck])

  const blended = strength < 1
    ? tf.add(tf.mul(stylized, strength), tf.mul(contentResized, 1 - strength))
    : stylized

  const resultResized = tf.image.resizeBilinear(blended, [contentCanvas.height, contentCanvas.width])

  onProgress?.('Rendering...')

  const resultCanvas = document.createElement('canvas')
  resultCanvas.width = contentCanvas.width
  resultCanvas.height = contentCanvas.height
  await tf.browser.toPixels(resultResized.squeeze(), resultCanvas)

  tf.dispose([styleTensor, styleResized, styleBottleneck, contentTensor, contentResized, stylized, blended, resultResized])

  return resultCanvas.toDataURL('image/png')
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export const STYLE_PRESETS = [
  { id: 'starry-night', name: 'Starry Night', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/300px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg' },
  { id: 'great-wave', name: 'Great Wave', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/300px-Tsunami_by_hokusai_19th_century.jpg' },
  { id: 'scream', name: 'The Scream', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/300px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg' },
  { id: 'mosaic', name: 'Mosaic', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Pompeii_-_Casa_del_Fauno_-_Alexanderschlacht_-_Detail.jpg/300px-Pompeii_-_Casa_del_Fauno_-_Alexanderschlacht_-_Detail.jpg' },
]
