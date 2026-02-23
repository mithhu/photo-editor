/**
 * Background replacement utilities.
 * Takes a foreground image (with transparent background from bg removal)
 * and composites it onto various background types.
 */

export type BgType = 'solid' | 'gradient' | 'blur' | 'scene'

export interface GradientConfig {
  color1: string
  color2: string
  angle: number // degrees
}

export interface SceneConfig {
  id: string
  name: string
  colors: string[] // gradient stops simulating the scene
  angle: number
}

export const SOLID_COLORS: { id: string; name: string; color: string }[] = [
  { id: 'white', name: 'White', color: '#ffffff' },
  { id: 'black', name: 'Black', color: '#000000' },
  { id: 'light-gray', name: 'Light Gray', color: '#e5e7eb' },
  { id: 'dark-gray', name: 'Dark Gray', color: '#374151' },
  { id: 'red', name: 'Red', color: '#ef4444' },
  { id: 'blue', name: 'Blue', color: '#3b82f6' },
  { id: 'green', name: 'Green', color: '#22c55e' },
  { id: 'purple', name: 'Purple', color: '#a855f7' },
  { id: 'pink', name: 'Pink', color: '#ec4899' },
  { id: 'yellow', name: 'Yellow', color: '#eab308' },
  { id: 'orange', name: 'Orange', color: '#f97316' },
  { id: 'teal', name: 'Teal', color: '#14b8a6' },
  { id: 'indigo', name: 'Indigo', color: '#6366f1' },
  { id: 'rose', name: 'Rose', color: '#f43f5e' },
  { id: 'navy', name: 'Navy', color: '#1e3a5f' },
  { id: 'cream', name: 'Cream', color: '#fef3c7' },
]

export const GRADIENT_PRESETS: { id: string; name: string; config: GradientConfig }[] = [
  { id: 'sunset', name: 'Sunset', config: { color1: '#f97316', color2: '#ec4899', angle: 135 } },
  { id: 'ocean', name: 'Ocean', config: { color1: '#06b6d4', color2: '#3b82f6', angle: 180 } },
  { id: 'lavender', name: 'Lavender', config: { color1: '#c084fc', color2: '#818cf8', angle: 135 } },
  { id: 'mint', name: 'Mint', config: { color1: '#34d399', color2: '#06b6d4', angle: 135 } },
  { id: 'fire', name: 'Fire', config: { color1: '#ef4444', color2: '#f97316', angle: 180 } },
  { id: 'twilight', name: 'Twilight', config: { color1: '#6366f1', color2: '#ec4899', angle: 135 } },
  { id: 'forest', name: 'Forest', config: { color1: '#065f46', color2: '#22c55e', angle: 180 } },
  { id: 'peach', name: 'Peach', config: { color1: '#fbbf24', color2: '#f472b6', angle: 135 } },
  { id: 'midnight', name: 'Midnight', config: { color1: '#0f172a', color2: '#312e81', angle: 180 } },
  { id: 'rose-gold', name: 'Rose Gold', config: { color1: '#fda4af', color2: '#fbbf24', angle: 135 } },
  { id: 'arctic', name: 'Arctic', config: { color1: '#e0f2fe', color2: '#bae6fd', angle: 180 } },
  { id: 'neon', name: 'Neon', config: { color1: '#a855f7', color2: '#06b6d4', angle: 135 } },
]

export const SCENE_PRESETS: SceneConfig[] = [
  { id: 'beach', name: 'Beach', colors: ['#87CEEB', '#F0E68C', '#DEB887'], angle: 180 },
  { id: 'studio-gray', name: 'Studio Gray', colors: ['#6b7280', '#4b5563', '#374151'], angle: 180 },
  { id: 'studio-white', name: 'Studio White', colors: ['#f9fafb', '#e5e7eb', '#d1d5db'], angle: 180 },
  { id: 'city-night', name: 'City Night', colors: ['#0a0a1a', '#1a1a3e', '#2d1b69'], angle: 180 },
  { id: 'golden-hour', name: 'Golden Hour', colors: ['#fdba74', '#fb923c', '#ea580c'], angle: 180 },
  { id: 'cloudy-sky', name: 'Cloudy Sky', colors: ['#94a3b8', '#cbd5e1', '#e2e8f0'], angle: 180 },
  { id: 'nature-green', name: 'Nature', colors: ['#22c55e', '#16a34a', '#166534'], angle: 180 },
  { id: 'autumn', name: 'Autumn', colors: ['#dc2626', '#ea580c', '#eab308'], angle: 135 },
]

function drawGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  angleDeg: number
): void {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const half = Math.max(w, h) / 2

  const x0 = w / 2 - cos * half
  const y0 = h / 2 - sin * half
  const x1 = w / 2 + cos * half
  const y1 = h / 2 + sin * half

  const grad = ctx.createLinearGradient(x0, y0, x1, y1)
  colors.forEach((c, i) => {
    grad.addColorStop(i / Math.max(1, colors.length - 1), c)
  })

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

export function replaceBackgroundSolid(
  fgCanvas: HTMLCanvasElement,
  color: string
): string {
  const { width, height } = fgCanvas
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d')!

  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(fgCanvas, 0, 0)

  return out.toDataURL('image/png')
}

export function replaceBackgroundGradient(
  fgCanvas: HTMLCanvasElement,
  config: GradientConfig
): string {
  const { width, height } = fgCanvas
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d')!

  drawGradient(ctx, width, height, [config.color1, config.color2], config.angle)
  ctx.drawImage(fgCanvas, 0, 0)

  return out.toDataURL('image/png')
}

export function replaceBackgroundScene(
  fgCanvas: HTMLCanvasElement,
  scene: SceneConfig
): string {
  const { width, height } = fgCanvas
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d')!

  drawGradient(ctx, width, height, scene.colors, scene.angle)
  ctx.drawImage(fgCanvas, 0, 0)

  return out.toDataURL('image/png')
}

export function replaceBackgroundBlur(
  fgCanvas: HTMLCanvasElement,
  originalSrc: string,
  blurAmount: number = 20
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const { width, height } = fgCanvas
      const out = document.createElement('canvas')
      out.width = width
      out.height = height
      const ctx = out.getContext('2d')!

      ctx.filter = `blur(${blurAmount}px)`
      ctx.drawImage(img, 0, 0, width, height)
      ctx.filter = 'none'

      ctx.drawImage(fgCanvas, 0, 0)
      resolve(out.toDataURL('image/png'))
    }
    img.onerror = () => {
      resolve(fgCanvas.toDataURL('image/png'))
    }
    img.src = originalSrc
  })
}
