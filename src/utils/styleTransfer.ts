let styleNet: any = null
let transformNet: any = null
let _tf: any = null

const isDev: boolean = typeof window !== 'undefined' && window.location.hostname === 'localhost'
const STYLE_MODEL_BASE: string = isDev
  ? '/proxy-style-models/arbitrary-image-stylization-tfjs'
  : 'https://reiinakano.github.io/arbitrary-image-stylization-tfjs'

const STYLE_NET_URL: string = `${STYLE_MODEL_BASE}/saved_model_style_js/model.json`
const TRANSFORM_NET_URL: string = `${STYLE_MODEL_BASE}/saved_model_transformer_separable_js/model.json`

const STYLE_NET_IDB: string = 'indexeddb://style-transfer-style-net'
const TRANSFORM_NET_IDB: string = 'indexeddb://style-transfer-transform-net'

async function getTf(): Promise<any> {
  if (!_tf) _tf = await import('@tensorflow/tfjs')
  return _tf
}

async function loadFromCacheOrNetwork(
  tf: any,
  remoteUrl: string,
  idbKey: string,
  onProgress: ((msg: string) => void) | undefined,
  label: string
): Promise<any> {
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

async function loadModels(onProgress?: (msg: string) => void): Promise<void> {
  const tf = await getTf()

  if (!styleNet) {
    onProgress?.('Initializing TF.js...')
    await tf.ready()
    try {
      styleNet = await loadFromCacheOrNetwork(
        tf, STYLE_NET_URL, STYLE_NET_IDB, onProgress, 'Style model (~10 MB)'
      )
    } catch (e: any) {
      throw new Error(`Style model failed to load: ${e.message}. Check your network connection.`)
    }
  }

  if (!transformNet) {
    try {
      transformNet = await loadFromCacheOrNetwork(
        tf, TRANSFORM_NET_URL, TRANSFORM_NET_IDB, onProgress, 'Transform model (~2.5 MB)'
      )
    } catch (e: any) {
      throw new Error(`Transform model failed to load: ${e.message}. Check your network connection.`)
    }
  }
}

export async function applyStyleTransfer(
  contentCanvas: HTMLCanvasElement,
  styleImageSrc: string,
  strength: number = 1.0,
  onProgress?: (msg: string) => void
): Promise<string> {
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load style image. The image URL may have CORS restrictions.`))
    img.src = src
  })
}

export interface StylePreset {
  id: string
  name: string
}

export const STYLE_PRESETS: StylePreset[] = [
  { id: 'starry-night', name: 'Starry Night' },
  { id: 'great-wave', name: 'Great Wave' },
  { id: 'scream', name: 'The Scream' },
  { id: 'mosaic', name: 'Mosaic' },
]
