const APP_URL = 'https://github.com/mithhu/photo-editor'
const SHARE_TEXT = 'Check out my edit — made with Photo Editor'

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to create blob from canvas'))
    }, 'image/png')
  })
}

export async function canvasToFile(canvas, filename = 'edited-photo.png') {
  const blob = await canvasToBlob(canvas)
  return new File([blob], filename, { type: 'image/png' })
}

export async function copyImageToClipboard(canvas) {
  const blob = await canvasToBlob(canvas)
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ])
}

export async function shareNative(canvas) {
  const file = await canvasToFile(canvas)
  if (!navigator.canShare?.({ files: [file] })) {
    throw new Error('Native sharing not supported')
  }
  await navigator.share({
    files: [file],
    title: 'Photo Editor',
    text: SHARE_TEXT,
  })
}

export function supportsNativeShare() {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  try {
    const file = new File([''], 'test.png', { type: 'image/png' })
    return navigator.canShare?.({ files: [file] }) ?? false
  } catch {
    return false
  }
}

export function openTwitterShare() {
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(APP_URL)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function openFacebookShare() {
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function openWhatsAppShare() {
  const url = `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${APP_URL}`)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
