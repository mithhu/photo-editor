import imglyRemoveBackground from '@imgly/background-removal'

export async function removeBackground(imageSrc, onProgress) {
  const config = {
    progress: (key, current, total) => {
      onProgress?.({ key, current, total, percent: total > 0 ? Math.round((current / total) * 100) : 0 })
    },
  }

  const blob = await imglyRemoveBackground(imageSrc, config)
  return URL.createObjectURL(blob)
}
