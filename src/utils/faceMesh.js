/**
 * Face mesh detection using MediaPipe Face Mesh via TensorFlow.js.
 * Returns 468 3D landmarks per detected face.
 */

let detector = null

export async function loadFaceMesh() {
  if (detector) return detector

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

  return detector
}

/**
 * Detect face landmarks from an image element or canvas.
 * @param {HTMLImageElement|HTMLCanvasElement} input
 * @returns {Promise<Array<{keypoints: Array<{x:number,y:number,z:number,name?:string}>}>>}
 */
export async function detectFaceLandmarks(input) {
  const det = await loadFaceMesh()
  return det.estimateFaces(input)
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
