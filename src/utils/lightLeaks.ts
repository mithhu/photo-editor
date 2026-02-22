/**
 * Canvas-generated light leak and bokeh overlay effects.
 * Each generator draws onto a provided context using gradients/shapes,
 * then composited over the image via 'screen' blend mode.
 */

type LeakGenerator = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, w: number, h: number) => void

function drawWarm(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, w: number, h: number): void {
  const g: CanvasGradient = ctx.createRadialGradient(0, h, 0, w * 0.6, h * 0.4, Math.max(w, h) * 0.7)
  g.addColorStop(0, 'rgba(255, 120, 20, 0.7)')
  g.addColorStop(0.4, 'rgba(255, 80, 10, 0.35)')
  g.addColorStop(0.7, 'rgba(255, 50, 0, 0.12)')
  g.addColorStop(1, 'rgba(255, 30, 0, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  const g2: CanvasGradient = ctx.createRadialGradient(w * 0.8, h * 0.2, 0, w * 0.8, h * 0.2, w * 0.4)
  g2.addColorStop(0, 'rgba(255, 200, 50, 0.4)')
  g2.addColorStop(0.5, 'rgba(255, 150, 30, 0.15)')
  g2.addColorStop(1, 'rgba(255, 100, 0, 0)')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, w, h)
}

function drawCool(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, w: number, h: number): void {
  const g: CanvasGradient = ctx.createRadialGradient(w, 0, 0, w * 0.4, h * 0.6, Math.max(w, h) * 0.7)
  g.addColorStop(0, 'rgba(80, 120, 255, 0.6)')
  g.addColorStop(0.4, 'rgba(100, 80, 220, 0.3)')
  g.addColorStop(0.7, 'rgba(120, 60, 200, 0.1)')
  g.addColorStop(1, 'rgba(80, 40, 180, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  const g2: CanvasGradient = ctx.createLinearGradient(0, 0, w * 0.3, h)
  g2.addColorStop(0, 'rgba(150, 100, 255, 0.25)')
  g2.addColorStop(0.5, 'rgba(100, 150, 255, 0.1)')
  g2.addColorStop(1, 'rgba(80, 100, 200, 0)')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, w, h)
}

function drawRainbow(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, w: number, h: number): void {
  const streaks: { x: number; y: number; color: string }[] = [
    { x: 0.1, y: 0, color: 'rgba(255, 50, 50, 0.3)' },
    { x: 0.25, y: 0, color: 'rgba(255, 180, 30, 0.25)' },
    { x: 0.4, y: 0, color: 'rgba(255, 255, 50, 0.22)' },
    { x: 0.55, y: 0, color: 'rgba(50, 255, 80, 0.2)' },
    { x: 0.7, y: 0, color: 'rgba(50, 130, 255, 0.22)' },
    { x: 0.85, y: 0, color: 'rgba(180, 50, 255, 0.25)' },
  ]

  streaks.forEach(({ x, color }) => {
    const g: CanvasGradient = ctx.createLinearGradient(x * w, 0, (x + 0.3) * w, h)
    g.addColorStop(0, color)
    g.addColorStop(0.5, color.replace(/[\d.]+\)$/, '0.1)'))
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
}

function drawFlare(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, w: number, h: number): void {
  const cx: number = w * 0.5
  const cy: number = h * 0.45
  const maxR: number = Math.max(w, h) * 0.5

  const g: CanvasGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
  g.addColorStop(0, 'rgba(255, 255, 240, 0.8)')
  g.addColorStop(0.1, 'rgba(255, 240, 200, 0.5)')
  g.addColorStop(0.3, 'rgba(255, 200, 100, 0.15)')
  g.addColorStop(0.6, 'rgba(255, 150, 50, 0.05)')
  g.addColorStop(1, 'rgba(255, 100, 0, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  const rayCount: number = 12
  ctx.save()
  ctx.translate(cx, cy)
  for (let i = 0; i < rayCount; i++) {
    const angle: number = (i / rayCount) * Math.PI * 2
    const rayLen: number = maxR * (0.6 + Math.random() * 0.4)
    const rayWidth: number = maxR * 0.02

    ctx.save()
    ctx.rotate(angle)
    const rg: CanvasGradient = ctx.createLinearGradient(0, 0, rayLen, 0)
    rg.addColorStop(0, 'rgba(255, 255, 220, 0.4)')
    rg.addColorStop(0.5, 'rgba(255, 220, 150, 0.1)')
    rg.addColorStop(1, 'rgba(255, 200, 100, 0)')
    ctx.fillStyle = rg
    ctx.fillRect(0, -rayWidth / 2, rayLen, rayWidth)
    ctx.restore()
  }
  ctx.restore()
}

function drawBokeh(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, w: number, h: number): void {
  const count: number = 25 + Math.floor(Math.random() * 15)
  const seed: number = 42
  const rng: () => number = mulberry32(seed)

  for (let i = 0; i < count; i++) {
    const x: number = rng() * w
    const y: number = rng() * h
    const r: number = 8 + rng() * Math.min(w, h) * 0.06
    const alpha: number = 0.08 + rng() * 0.18
    const hue: number = Math.floor(rng() * 360)

    const g: CanvasGradient = ctx.createRadialGradient(x, y, r * 0.2, x, y, r)
    g.addColorStop(0, `hsla(${hue}, 70%, 75%, ${alpha})`)
    g.addColorStop(0.7, `hsla(${hue}, 60%, 65%, ${alpha * 0.4})`)
    g.addColorStop(1, `hsla(${hue}, 50%, 55%, 0)`)

    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = g
    ctx.fill()
  }
}

/** Simple seeded PRNG for deterministic bokeh placement */
function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t: number = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const GENERATORS: Record<string, LeakGenerator> = {
  warm: drawWarm,
  cool: drawCool,
  rainbow: drawRainbow,
  flare: drawFlare,
  bokeh: drawBokeh,
}

/**
 * Draws a light leak overlay on top of the current canvas content.
 */
export function applyLightLeak(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  type: string,
  intensity: number
): void {
  const gen: LeakGenerator | undefined = GENERATORS[type]
  if (!gen || intensity <= 0) return

  const offscreen = new OffscreenCanvas(w, h)
  const offCtx: OffscreenCanvasRenderingContext2D | null = offscreen.getContext('2d')
  if (!offCtx) return
  gen(offCtx, w, h)

  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = Math.min(1, Math.max(0, intensity))
  ctx.drawImage(offscreen, 0, 0)
  ctx.restore()
}
