import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal'

interface BackgroundRemovalProgress {
  key: string
  current: number
  total: number
  percent: number
}

export async function removeBackground(
  imageSrc: string,
  onProgress?: (progress: BackgroundRemovalProgress) => void
): Promise<string> {
  const config = {
    progress: (key: string, current: number, total: number) => {
      onProgress?.({ key, current, total, percent: total > 0 ? Math.round((current / total) * 100) : 0 })
    },
  }

  const blob = await imglyRemoveBackground(imageSrc, config)
  return URL.createObjectURL(blob)
}
