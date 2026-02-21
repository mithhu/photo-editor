let styleNet = null
let transformNet = null
let _tf = null

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
const STYLE_MODEL_BASE = isDev
  ? '/proxy-style-models/arbitrary-image-stylization-tfjs'
  : 'https://reiinakano.github.io/arbitrary-image-stylization-tfjs'

const STYLE_NET_URL = `${STYLE_MODEL_BASE}/saved_model_style_js/model.json`
const TRANSFORM_NET_URL = `${STYLE_MODEL_BASE}/saved_model_transformer_separable_js/model.json`

const STYLE_NET_IDB = 'indexeddb://style-transfer-style-net'
const TRANSFORM_NET_IDB = 'indexeddb://style-transfer-transform-net'

async function getTf() {
  if (!_tf) _tf = await import('@tensorflow/tfjs')
  return _tf
}

async function loadFromCacheOrNetwork(tf, remoteUrl, idbKey, onProgress, label) {
  try {
    const cached = await tf.loadGraphModel(idbKey)
    onProgress?.(`${label} loaded from cache`)
    return cached
  } catch {
    // Not in cache — download from network
  }

  onProgress?.(`Downloading ${label}...`)
  const model = await tf.loadGraphModel(remoteUrl)

  try {
    await model.save(idbKey)
  } catch {
    // Save failed (e.g. storage full) — not critical
  }

  return model
}

async function loadModels(onProgress) {
  const tf = await getTf()

  if (!styleNet) {
    onProgress?.('Initializing TF.js...')
    await tf.ready()
    try {
      styleNet = await loadFromCacheOrNetwork(
        tf, STYLE_NET_URL, STYLE_NET_IDB, onProgress, 'Style model (~10 MB)'
      )
    } catch (e) {
      throw new Error(`Style model failed to load: ${e.message}. Check your network connection.`)
    }
  }

  if (!transformNet) {
    try {
      transformNet = await loadFromCacheOrNetwork(
        tf, TRANSFORM_NET_URL, TRANSFORM_NET_IDB, onProgress, 'Transform model (~2.5 MB)'
      )
    } catch (e) {
      throw new Error(`Transform model failed to load: ${e.message}. Check your network connection.`)
    }
  }
}

export async function applyStyleTransfer(contentCanvas, styleImageSrc, strength = 1.0, onProgress) {
  onProgress?.('Loading models...')
  await loadModels(onProgress)
  const tf = await getTf()

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
    img.onerror = () => reject(new Error(`Failed to load style image. The image URL may have CORS restrictions.`))
    img.src = src
  })
}

export const STYLE_PRESETS = [
  { id: 'starry-night', name: 'Starry Night' },
  { id: 'great-wave', name: 'Great Wave' },
  { id: 'scream', name: 'The Scream' },
  { id: 'mosaic', name: 'Mosaic' },
]
