/**
 * Face mesh detection using MediaPipe Face Mesh via TensorFlow.js.
 * Returns 468 3D landmarks per detected face.
 *
 * Includes robust error handling, singleton model loading, and
 * a loading promise that callers can await for UI indicators.
 */

let detector = null
let loadingPromise = null
let loadFailed = false

/**
 * Load the face mesh model. Returns the same promise if already loading.
 * Caches the detector for reuse across calls.
 */
export async function loadFaceMesh() {
  if (detector) return detector
  if (loadFailed) return null

  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    try {
      const tf = await import('@tensorflow/tfjs')
      await tf.ready()

      const faceLandmarksDetection = await import('@tensorflow-models/face-landmarks-detection')

      detector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: 'tfjs',
          refineLandmarks: true,
          maxFaces: 4,
        }
      )

      // Warm-up inference: the first estimateFaces call is slow due to
      // GPU shader compilation. Run on a tiny canvas so it's nearly free.
      try {
        const warmup = document.createElement('canvas')
        warmup.width = 32
        warmup.height = 32
        await detector.estimateFaces(warmup)
      } catch {
        // Warm-up failure is non-critical
      }

      return detector
    } catch (err) {
      console.error('[FaceMesh] Model failed to load:', err)
      loadFailed = true
      return null
    } finally {
      loadingPromise = null
    }
  })()

  return loadingPromise
}

/**
 * Detect face landmarks from an image element or canvas.
 * Returns empty array if model isn't available or detection fails.
 * @param {HTMLImageElement|HTMLCanvasElement|OffscreenCanvas} input
 * @returns {Promise<Array<{keypoints: Array<{x:number,y:number,z:number,name?:string}>}>>}
 */
export async function detectFaceLandmarks(input) {
  try {
    const det = await loadFaceMesh()
    if (!det) {
      console.warn('[FaceMesh] Detector not available')
      return []
    }

    // OffscreenCanvas isn't supported by TF.js — convert to a regular canvas
    if (typeof OffscreenCanvas !== 'undefined' && input instanceof OffscreenCanvas) {
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = input.width
      tempCanvas.height = input.height
      const tCtx = tempCanvas.getContext('2d')
      tCtx.drawImage(input, 0, 0)
      return await det.estimateFaces(tempCanvas)
    }

    return await det.estimateFaces(input)
  } catch (err) {
    console.warn('[FaceMesh] Detection failed:', err.message)
    return []
  }
}

/**
 * Check if the face mesh model is currently loading.
 */
export function isFaceMeshLoading() {
  return loadingPromise !== null
}

/**
 * Check if the face mesh model loaded successfully.
 */
export function isFaceMeshReady() {
  return detector !== null
}

/**
 * Key landmark indices for MediaPipe Face Mesh (468 points).
 * These map to anatomical regions used for beauty filters.
 */
export const FACE_REGIONS = {
  leftEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  rightEye: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
  leftEyebrow: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  rightEyebrow: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
  lips: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185],
  upperLip: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146],
  lowerLip: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291],
  innerLips: [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95],
  nose: [1, 2, 98, 327, 168, 6, 197, 195, 5, 4, 19, 94, 2],
  noseTip: [1, 2, 4, 5, 195],
  leftCheek: [116, 123, 147, 187, 205, 36, 142, 126],
  rightCheek: [345, 352, 376, 411, 425, 266, 371, 355],
  jawline: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  forehead: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  faceOval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  leftIris: [468, 469, 470, 471, 472],
  rightIris: [473, 474, 475, 476, 477],
}
