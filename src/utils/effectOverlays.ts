/**
 * Procedurally-generated visual effect overlays for photo editing.
 * Each effect draws directly onto a 2D canvas context using gradients,
 * paths, and compositing — no external images required.
 */

// ---------------------------------------------------------------------------
// Types & config
// ---------------------------------------------------------------------------

export type EffectOverlayType =
  | 'none'
  | 'bokeh'
  | 'sparkles'
  | 'dust'
  | 'rain'
  | 'snow'
  | 'light-streaks'
  | 'butterflies'
  | 'hearts'
  | 'stars'
  | 'confetti'

export interface EffectOverlayConfig {
  type: EffectOverlayType
  intensity: number // 0-100
  seed: number
}

export const EFFECT_OVERLAY_PRESETS: { id: EffectOverlayType; name: string; emoji: string }[] = [
  { id: 'none', name: 'None', emoji: '🚫' },
  { id: 'bokeh', name: 'Bokeh', emoji: '🔵' },
  { id: 'sparkles', name: 'Sparkles', emoji: '✨' },
  { id: 'dust', name: 'Film Dust', emoji: '🌫️' },
  { id: 'rain', name: 'Rain', emoji: '🌧️' },
  { id: 'snow', name: 'Snow', emoji: '❄️' },
  { id: 'light-streaks', name: 'Light Streaks', emoji: '🌅' },
  { id: 'butterflies', name: 'Butterflies', emoji: '🦋' },
  { id: 'hearts', name: 'Hearts', emoji: '💕' },
  { id: 'stars', name: 'Stars', emoji: '⭐' },
  { id: 'confetti', name: 'Confetti', emoji: '🎊' },
]

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function randRange(rng: () => number, min: number, max: number): number {
  return lerp(min, max, rng())
}

// ---------------------------------------------------------------------------
// Shape helpers
// ---------------------------------------------------------------------------

function drawHeartPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  const s = size / 2
  ctx.beginPath()
  ctx.moveTo(cx, cy + s * 0.6)
  ctx.bezierCurveTo(cx - s * 1.2, cy - s * 0.4, cx - s * 0.6, cy - s * 1.4, cx, cy - s * 0.6)
  ctx.bezierCurveTo(cx + s * 0.6, cy - s * 1.4, cx + s * 1.2, cy - s * 0.4, cx, cy + s * 0.6)
  ctx.closePath()
}

function drawStarPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  points: number,
): void {
  const innerR = outerR * 0.4
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function drawButterflyPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  rotation: number,
): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotation)
  const s = size / 2

  ctx.beginPath()
  // left upper wing
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-s * 0.8, -s * 1.2, -s * 1.5, -s * 0.5, -s * 0.3, -s * 0.1)
  // left lower wing
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-s * 0.8, s * 0.8, -s * 1.3, s * 0.6, -s * 0.2, s * 0.15)
  // right upper wing
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(s * 0.8, -s * 1.2, s * 1.5, -s * 0.5, s * 0.3, -s * 0.1)
  // right lower wing
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(s * 0.8, s * 0.8, s * 1.3, s * 0.6, s * 0.2, s * 0.15)
  ctx.closePath()

  ctx.restore()
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  rotation: number,
): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotation)

  // 4-pointed star via two thin overlapping ellipses
  for (let i = 0; i < 2; i++) {
    ctx.save()
    ctx.rotate((i * Math.PI) / 4)
    ctx.beginPath()
    ctx.ellipse(0, 0, size * 0.08, size, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  ctx.restore()
}

// ---------------------------------------------------------------------------
// Effect renderers
// ---------------------------------------------------------------------------

type EffectFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  seed: number,
) => void

function drawBokeh(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  seed: number,
): void {
  const rng = mulberry32(seed)
  const count = Math.round(lerp(20, 40, intensity))

  ctx.globalCompositeOperation = 'screen'

  const warmHues = [30, 40, 50, 55, 350, 10]
  const coolHues = [200, 220, 240, 260, 180]
  const allHues = [...warmHues, ...coolHues]

  for (let i = 0; i < count; i++) {
    const x = rng() * w
    const y = rng() * h
    const r = randRange(rng, 5, 40)
    const alpha = randRange(rng, 0.08, 0.25) * intensity
    const hue = allHues[Math.floor(rng() * allHues.length)]
    const sat = Math.round(randRange(rng, 50, 80))
    const light = Math.round(randRange(rng, 60, 80))

    const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r)
    g.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`)
    g.addColorStop(0.6, `hsla(${hue}, ${sat}%, ${light - 10}%, ${alpha * 0.5})`)
    g.addColorStop(1, `hsla(${hue}, ${sat}%, ${light - 15}%, 0)`)

    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = g
    ctx.fill()
  }
}

function drawSparkles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  seed: number,
): void {
  const rng = mulberry32(seed)
  const count = Math.round(lerp(25, 60, intensity))
  const heroCount = Math.max(2, Math.round(count * 0.12))

  ctx.globalCompositeOperation = 'screen'

  for (let i = 0; i < count; i++) {
    const isHero = i < heroCount
    const x = rng() * w
    const y = rng() * h
    const size = isHero ? randRange(rng, 14, 28) : randRange(rng, 4, 12)
    const rotation = rng() * Math.PI * 2
    const alpha = randRange(rng, 0.4, 0.9) * intensity

    const useGold = rng() > 0.5
    const color = useGold
      ? `rgba(255, 240, 180, ${alpha})`
      : `rgba(255, 255, 255, ${alpha})`

    ctx.fillStyle = color
    drawSparkle(ctx, x, y, size, rotation)

    if (isHero) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5)
      glow.addColorStop(0, `rgba(255, 255, 240, ${alpha * 0.4})`)
      glow.addColorStop(1, 'rgba(255, 255, 240, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(x, y, size * 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawDust(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  seed: number,
): void {
  const rng = mulberry32(seed)
  const dotCount = Math.round(lerp(40, 120, intensity))
  const scratchCount = Math.round(lerp(3, 12, intensity))

  ctx.globalCompositeOperation = 'overlay'

  // dots
  for (let i = 0; i < dotCount; i++) {
    const x = rng() * w
    const y = rng() * h
    const r = randRange(rng, 0.5, 2.5)
    const alpha = randRange(rng, 0.15, 0.5) * intensity

    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(230, 210, 180, ${alpha})`
    ctx.fill()
  }

  // scratches / elongated streaks
  for (let i = 0; i < scratchCount; i++) {
    const x = rng() * w
    const y = rng() * h
    const len = randRange(rng, 10, 60)
    const angle = randRange(rng, -0.3, 0.3)
    const alpha = randRange(rng, 0.08, 0.25) * intensity

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.strokeStyle = `rgba(240, 220, 190, ${alpha})`
    ctx.lineWidth = randRange(rng, 0.3, 1.2)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(len, 0)
    ctx.stroke()
    ctx.restore()
  }
}

function drawRain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  seed: number,
): void {
  const rng = mulberry32(seed)
  const count = Math.round(lerp(50, 200, intensity))

  ctx.globalCompositeOperation = 'screen'

  const angle = -0.35 // ~20 degrees toward left

  for (let i = 0; i < count; i++) {
    const x = rng() * w * 1.3 - w * 0.15
    const y = rng() * h
    const len = randRange(rng, 15, 50)
    const alpha = randRange(rng, 0.15, 0.45) * intensity

    ctx.strokeStyle = `rgba(200, 220, 255, ${alpha})`
    ctx.lineWidth = randRange(rng, 0.5, 1.5)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle + Math.PI / 2) * len)
    ctx.stroke()
  }
}

function drawSnow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  seed: number,
): void {
  const rng = mulberry32(seed)
  const count = Math.round(lerp(50, 150, intensity))

  ctx.globalCompositeOperation = 'screen'

  for (let i = 0; i < count; i++) {
    const x = rng() * w
    const y = rng() * h
    const r = randRange(rng, 1, 6)
    const alpha = randRange(rng, 0.3, 0.8) * intensity
    const hasGlow = rng() > 0.6

    if (hasGlow) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5)
      glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.5})`)
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(x, y, r * 2.5, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.fill()
  }
}

function drawLightStreaks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  seed: number,
): void {
  const rng = mulberry32(seed)
  const count = Math.round(lerp(2, 4, intensity))

  ctx.globalCompositeOperation = 'screen'

  const tones: [number, number, number][] = [
    [255, 220, 130], // warm gold
    [255, 200, 100],
    [180, 210, 255], // cool blue
    [200, 180, 255], // soft lavender
  ]

  for (let i = 0; i < count; i++) {
    const startX = randRange(rng, -w * 0.2, w * 0.5)
    const startY = randRange(rng, -h * 0.2, h * 0.3)
    const endX = randRange(rng, w * 0.5, w * 1.2)
    const endY = randRange(rng, h * 0.5, h * 1.2)
    const streakWidth = randRange(rng, 40, 120)
    const alpha = randRange(rng, 0.12, 0.3) * intensity
    const tone = tones[Math.floor(rng() * tones.length)]

    const dx = endX - startX
    const dy = endY - startY
    const len = Math.sqrt(dx * dx + dy * dy)
    const nx = -dy / len
    const ny = dx / len

    const g = ctx.createLinearGradient(
      startX + nx * streakWidth,
      startY + ny * streakWidth,
      startX - nx * streakWidth,
      startY - ny * streakWidth,
    )
    g.addColorStop(0, `rgba(${tone[0]}, ${tone[1]}, ${tone[2]}, 0)`)
    g.addColorStop(0.3, `rgba(${tone[0]}, ${tone[1]}, ${tone[2]}, ${alpha * 0.5})`)
    g.addColorStop(0.5, `rgba(${tone[0]}, ${tone[1]}, ${tone[2]}, ${alpha})`)
    g.addColorStop(0.7, `rgba(${tone[0]}, ${tone[1]}, ${tone[2]}, ${alpha * 0.5})`)
    g.addColorStop(1, `rgba(${tone[0]}, ${tone[1]}, ${tone[2]}, 0)`)

    ctx.save()
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(startX + nx * streakWidth, startY + ny * streakWidth)
    ctx.lineTo(endX + nx * streakWidth * 0.5, endY + ny * streakWidth * 0.5)
    ctx.lineTo(endX - nx * streakWidth * 0.5, endY - ny * streakWidth * 0.5)
    ctx.lineTo(startX - nx * streakWidth, startY - ny * streakWidth)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

function drawButterflies(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  seed: number,
): void {
  const rng = mulberry32(seed)
  const count = Math.round(lerp(8, 12, intensity))

  ctx.globalCompositeOperation = 'screen'

  const colors = [
    [255, 180, 210], // pink
    [200, 180, 255], // lavender
    [170, 210, 255], // light blue
    [255, 200, 230], // soft rose
    [180, 230, 255], // sky
    [220, 190, 255], // lilac
  ]

  for (let i = 0; i < count; i++) {
    const x = rng() * w
    const y = rng() * h
    const size = randRange(rng, 18, 45)
    const rotation = randRange(rng, -0.5, 0.5)
    const alpha = randRange(rng, 0.2, 0.5) * intensity
    const c = colors[Math.floor(rng() * colors.length)]

    ctx.save()
    ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
    drawButterflyPath(ctx, x, y, size, rotation)
    ctx.fill()

    // wing fill (broader shape)
    ctx.translate(x, y)
    ctx.rotate(rotation)
    const hs = size / 2

    // left wings
    ctx.beginPath()
    ctx.ellipse(-hs * 0.55, -hs * 0.35, hs * 0.5, hs * 0.7, -0.3, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha * 0.7})`
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(-hs * 0.4, hs * 0.25, hs * 0.35, hs * 0.45, -0.2, 0, Math.PI * 2)
    ctx.fill()

    // right wings
    ctx.beginPath()
    ctx.ellipse(hs * 0.55, -hs * 0.35, hs * 0.5, hs * 0.7, 0.3, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(hs * 0.4, hs * 0.25, hs * 0.35, hs * 0.45, 0.2, 0, Math.PI * 2)
    ctx.fill()

    // body
    ctx.beginPath()
    ctx.ellipse(0, 0, size * 0.04, hs * 0.6, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${c[0] - 40}, ${c[1] - 40}, ${c[2] - 40}, ${alpha})`
    ctx.fill()

    ctx.restore()
  }
}

function drawHearts(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  seed: number,
): void {
  const rng = mulberry32(seed)
  const count = Math.round(lerp(15, 30, intensity))

  ctx.globalCompositeOperation = 'screen'

  const pinks: [number, number, number][] = [
    [255, 100, 130],
    [255, 130, 160],
    [255, 80, 120],
    [255, 150, 180],
    [230, 70, 100],
    [255, 160, 190],
  ]

  for (let i = 0; i < count; i++) {
    const x = rng() * w
    const y = rng() * h
    const size = randRange(rng, 10, 40)
    const alpha = randRange(rng, 0.15, 0.5) * intensity
    const c = pinks[Math.floor(rng() * pinks.length)]

    ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
    drawHeartPath(ctx, x, y, size)
    ctx.fill()

    // soft glow
    if (rng() > 0.5) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size)
      glow.addColorStop(0, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha * 0.3})`)
      glow.addColorStop(1, `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0)`)
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  seed: number,
): void {
  const rng = mulberry32(seed)
  const count = Math.round(lerp(60, 200, intensity))

  ctx.globalCompositeOperation = 'screen'

  for (let i = 0; i < count; i++) {
    const x = rng() * w
    const y = rng() * h
    const isBright = rng() > 0.8
    const r = isBright ? randRange(rng, 1.5, 3.5) : randRange(rng, 0.5, 1.5)
    const alpha = (isBright ? randRange(rng, 0.6, 1) : randRange(rng, 0.2, 0.5)) * intensity

    // twinkle glow for brighter stars
    if (isBright) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 5)
      glow.addColorStop(0, `rgba(255, 255, 240, ${alpha * 0.35})`)
      glow.addColorStop(0.5, `rgba(220, 230, 255, ${alpha * 0.1})`)
      glow.addColorStop(1, 'rgba(200, 220, 255, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(x, y, r * 5, 0, Math.PI * 2)
      ctx.fill()

      // 4-pointed spike
      ctx.fillStyle = `rgba(255, 255, 250, ${alpha * 0.6})`
      drawSparkle(ctx, x, y, r * 3, rng() * Math.PI)
    }

    // core dot
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.fill()
  }
}

function drawConfetti(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  seed: number,
): void {
  const rng = mulberry32(seed)
  const count = Math.round(lerp(30, 80, intensity))

  ctx.globalCompositeOperation = 'screen'

  const rainbowColors = [
    [255, 80, 80],   // red
    [255, 160, 50],  // orange
    [255, 230, 60],  // yellow
    [80, 220, 100],  // green
    [60, 160, 255],  // blue
    [160, 80, 255],  // purple
    [255, 100, 200], // pink
    [80, 230, 220],  // teal
  ]

  for (let i = 0; i < count; i++) {
    const x = rng() * w
    const y = rng() * h
    const pieceW = randRange(rng, 4, 12)
    const pieceH = randRange(rng, 8, 20)
    const rotation = rng() * Math.PI * 2
    const alpha = randRange(rng, 0.4, 0.8) * intensity
    const c = rainbowColors[Math.floor(rng() * rainbowColors.length)]

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rotation)
    ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
    ctx.fillRect(-pieceW / 2, -pieceH / 2, pieceW, pieceH)
    ctx.restore()
  }
}

// ---------------------------------------------------------------------------
// Effect registry
// ---------------------------------------------------------------------------

const EFFECTS: Record<string, EffectFn> = {
  bokeh: drawBokeh,
  sparkles: drawSparkles,
  dust: drawDust,
  rain: drawRain,
  snow: drawSnow,
  'light-streaks': drawLightStreaks,
  butterflies: drawButterflies,
  hearts: drawHearts,
  stars: drawStars,
  confetti: drawConfetti,
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function drawEffectOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: EffectOverlayConfig,
): void {
  if (config.type === 'none' || config.intensity <= 0) return

  const fn = EFFECTS[config.type]
  if (!fn) return

  ctx.save()
  fn(ctx, width, height, Math.min(1, Math.max(0, config.intensity / 100)), config.seed)
  ctx.restore()
}
