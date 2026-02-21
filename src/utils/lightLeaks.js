/**
 * Canvas-generated light leak and bokeh overlay effects.
 * Each generator draws onto a provided context using gradients/shapes,
 * then composited over the image via 'screen' blend mode.
 */

function drawWarm(ctx, w, h) {
  const g = ctx.createRadialGradient(0, h, 0, w * 0.6, h * 0.4, Math.max(w, h) * 0.7)
  g.addColorStop(0, 'rgba(255, 120, 20, 0.7)')
  g.addColorStop(0.4, 'rgba(255, 80, 10, 0.35)')
  g.addColorStop(0.7, 'rgba(255, 50, 0, 0.12)')
  g.addColorStop(1, 'rgba(255, 30, 0, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  const g2 = ctx.createRadialGradient(w * 0.8, h * 0.2, 0, w * 0.8, h * 0.2, w * 0.4)
  g2.addColorStop(0, 'rgba(255, 200, 50, 0.4)')
  g2.addColorStop(0.5, 'rgba(255, 150, 30, 0.15)')
  g2.addColorStop(1, 'rgba(255, 100, 0, 0)')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, w, h)
}

function drawCool(ctx, w, h) {
  const g = ctx.createRadialGradient(w, 0, 0, w * 0.4, h * 0.6, Math.max(w, h) * 0.7)
  g.addColorStop(0, 'rgba(80, 120, 255, 0.6)')
  g.addColorStop(0.4, 'rgba(100, 80, 220, 0.3)')
  g.addColorStop(0.7, 'rgba(120, 60, 200, 0.1)')
  g.addColorStop(1, 'rgba(80, 40, 180, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  const g2 = ctx.createLinearGradient(0, 0, w * 0.3, h)
  g2.addColorStop(0, 'rgba(150, 100, 255, 0.25)')
  g2.addColorStop(0.5, 'rgba(100, 150, 255, 0.1)')
  g2.addColorStop(1, 'rgba(80, 100, 200, 0)')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, w, h)
}

function drawRainbow(ctx, w, h) {
  const streaks = [
    { x: 0.1, y: 0, color: 'rgba(255, 50, 50, 0.3)' },
    { x: 0.25, y: 0, color: 'rgba(255, 180, 30, 0.25)' },
    { x: 0.4, y: 0, color: 'rgba(255, 255, 50, 0.22)' },
    { x: 0.55, y: 0, color: 'rgba(50, 255, 80, 0.2)' },
    { x: 0.7, y: 0, color: 'rgba(50, 130, 255, 0.22)' },
    { x: 0.85, y: 0, color: 'rgba(180, 50, 255, 0.25)' },
  ]

  streaks.forEach(({ x, color }) => {
    const g = ctx.createLinearGradient(x * w, 0, (x + 0.3) * w, h)
    g.addColorStop(0, color)
    g.addColorStop(0.5, color.replace(/[\d.]+\)$/, '0.1)'))
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
}

function drawFlare(ctx, w, h) {
  const cx = w * 0.5
  const cy = h * 0.45
  const maxR = Math.max(w, h) * 0.5

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
  g.addColorStop(0, 'rgba(255, 255, 240, 0.8)')
  g.addColorStop(0.1, 'rgba(255, 240, 200, 0.5)')
  g.addColorStop(0.3, 'rgba(255, 200, 100, 0.15)')
  g.addColorStop(0.6, 'rgba(255, 150, 50, 0.05)')
  g.addColorStop(1, 'rgba(255, 100, 0, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  const rayCount = 12
  ctx.save()
  ctx.translate(cx, cy)
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2
    const rayLen = maxR * (0.6 + Math.random() * 0.4)
    const rayWidth = maxR * 0.02

    ctx.save()
    ctx.rotate(angle)
    const rg = ctx.createLinearGradient(0, 0, rayLen, 0)
    rg.addColorStop(0, 'rgba(255, 255, 220, 0.4)')
    rg.addColorStop(0.5, 'rgba(255, 220, 150, 0.1)')
    rg.addColorStop(1, 'rgba(255, 200, 100, 0)')
    ctx.fillStyle = rg
    ctx.fillRect(0, -rayWidth / 2, rayLen, rayWidth)
    ctx.restore()
  }
  ctx.restore()
}

function drawBokeh(ctx, w, h) {
  const count = 25 + Math.floor(Math.random() * 15)
  const seed = 42
  const rng = mulberry32(seed)

  for (let i = 0; i < count; i++) {
    const x = rng() * w
    const y = rng() * h
    const r = 8 + rng() * Math.min(w, h) * 0.06
    const alpha = 0.08 + rng() * 0.18
    const hue = Math.floor(rng() * 360)

    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r)
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
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const GENERATORS = {
  warm: drawWarm,
  cool: drawCool,
  rainbow: drawRainbow,
  flare: drawFlare,
  bokeh: drawBokeh,
}

/**
 * Draws a light leak overlay on top of the current canvas content.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w         - canvas pixel width
 * @param {number} h         - canvas pixel height
 * @param {string} type      - one of 'warm', 'cool', 'rainbow', 'flare', 'bokeh'
 * @param {number} intensity - 0-1 blend strength
 */
export function applyLightLeak(ctx, w, h, type, intensity) {
  const gen = GENERATORS[type]
  if (!gen || intensity <= 0) return

  const offscreen = new OffscreenCanvas(w, h)
  const offCtx = offscreen.getContext('2d')
  gen(offCtx, w, h)

  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = Math.min(1, Math.max(0, intensity))
  ctx.drawImage(offscreen, 0, 0)
  ctx.restore()
}
