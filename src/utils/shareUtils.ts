const APP_URL: string = 'https://photosai.vercel.app'
const SHARE_TEXT: string = 'Check out my edit — made with PhotosAI'

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob: Blob | null) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to create blob from canvas'))
    }, 'image/png')
  })
}

export async function canvasToFile(canvas: HTMLCanvasElement, filename: string = 'edited-photo.png'): Promise<File> {
  const blob: Blob = await canvasToBlob(canvas)
  return new File([blob], filename, { type: 'image/png' })
}

export async function copyImageToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  const blob: Blob = await canvasToBlob(canvas)
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ])
}

export async function shareNative(canvas: HTMLCanvasElement): Promise<void> {
  const file: File = await canvasToFile(canvas)
  if (!navigator.canShare?.({ files: [file] })) {
    throw new Error('Native sharing not supported')
  }
  await navigator.share({
    files: [file],
    title: 'PhotosAI',
    text: SHARE_TEXT,
  })
}

export function supportsNativeShare(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  try {
    const file = new File([''], 'test.png', { type: 'image/png' })
    return navigator.canShare?.({ files: [file] }) ?? false
  } catch {
    return false
  }
}

export function openTwitterShare(): void {
  const url: string = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(APP_URL)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function openFacebookShare(): void {
  const url: string = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function openWhatsAppShare(): void {
  const url: string = `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${APP_URL}`)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
