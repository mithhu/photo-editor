/**
 * Film emulation presets — pixel-level color grading that goes beyond CSS filters.
 * Each preset defines a function that transforms RGB pixel values.
 *
 * Inspired by classic film stocks and popular mobile editor looks (Prequel, VSCO, etc.)
 */

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

function lerpColor(a, b, t) {
  return clamp(a + (b - a) * t)
}

/**
 * Koji — warm cinematic film emulation inspired by Kodak 2383 print stock.
 * Warm golden highlights, teal/blue shadows, slightly lifted blacks,
 * gentle desaturation in midtones, subtle halation glow.
 */
function koji(r, g, b) {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Lift blacks: raise floor to ~15
  r = clamp(r * 0.94 + 15)
  g = clamp(g * 0.94 + 12)
  b = clamp(b * 0.94 + 10)

  // Warm highlights — push toward golden/amber in bright areas
  const hlWeight = Math.max(0, (lum - 0.5) * 2)
  r = clamp(r + hlWeight * 18)
  g = clamp(g + hlWeight * 8)
  b = clamp(b - hlWeight * 6)

  // Cool shadows — push toward teal/blue in dark areas
  const shWeight = Math.max(0, (0.4 - lum) * 2.5)
  r = clamp(r - shWeight * 8)
  g = clamp(g + shWeight * 4)
  b = clamp(b + shWeight * 14)

  // Slight midtone desaturation for that film look
  const midWeight = 1 - Math.abs(lum - 0.5) * 2
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  const desat = 0.08 * midWeight
  r = clamp(r + (gray - r) * desat)
  g = clamp(g + (gray - g) * desat)
  b = clamp(b + (gray - b) * desat)

  // Gentle S-curve contrast
  const contrast = 1.08
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  return [r, g, b]
}

/**
 * Tokyo — cool-toned urban aesthetic. Teal highlights, muted greens,
 * slightly purple shadows, desaturated with high contrast.
 */
function tokyo(r, g, b) {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Desaturate slightly
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.15)
  g = clamp(g + (gray - g) * 0.15)
  b = clamp(b + (gray - b) * 0.15)

  // Teal push in highlights
  const hlWeight = Math.max(0, (lum - 0.4) * 2)
  r = clamp(r - hlWeight * 10)
  g = clamp(g + hlWeight * 6)
  b = clamp(b + hlWeight * 12)

  // Purple push in shadows
  const shWeight = Math.max(0, (0.35 - lum) * 3)
  r = clamp(r + shWeight * 8)
  g = clamp(g - shWeight * 6)
  b = clamp(b + shWeight * 10)

  // High contrast
  const contrast = 1.15
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  // Lift blacks slightly
  r = clamp(r * 0.96 + 10)
  g = clamp(g * 0.96 + 10)
  b = clamp(b * 0.96 + 12)

  return [r, g, b]
}

/**
 * Portra — Kodak Portra 400 emulation. Warm skin tones, soft contrast,
 * slightly lifted shadows, natural but slightly muted palette.
 */
function portra(r, g, b) {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Lift blacks substantially for that faded film look
  r = clamp(r * 0.9 + 25)
  g = clamp(g * 0.9 + 22)
  b = clamp(b * 0.9 + 20)

  // Warm overall push
  r = clamp(r + 6)
  b = clamp(b - 4)

  // Soft contrast — lower than normal
  const contrast = 0.95
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  // Slightly desaturate
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.1)
  g = clamp(g + (gray - g) * 0.1)
  b = clamp(b + (gray - b) * 0.1)

  // Warm highlights gently
  const hlWeight = Math.max(0, (lum - 0.55) * 2)
  r = clamp(r + hlWeight * 8)
  g = clamp(g + hlWeight * 3)

  return [r, g, b]
}

/**
 * Velvia — Fuji Velvia 50 emulation. Extremely vivid, saturated colors,
 * deep blacks, punchy contrast. Great for landscapes.
 */
function velvia(r, g, b) {
  // Boost saturation aggressively
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (r - gray) * 0.35)
  g = clamp(g + (g - gray) * 0.35)
  b = clamp(b + (b - gray) * 0.35)

  // Deep contrast
  const contrast = 1.2
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  // Push blues deeper, greens more vivid
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  if (b > r && b > g) b = clamp(b + 10)
  if (g > r && g > b) g = clamp(g + 8)

  // Crush blacks slightly
  const shWeight = Math.max(0, (0.2 - lum) * 5)
  r = clamp(r - shWeight * 5)
  g = clamp(g - shWeight * 5)
  b = clamp(b - shWeight * 5)

  return [r, g, b]
}

/**
 * Superia — Fuji Superia 400. Slightly cool tones, green cast in
 * midtones, punchy but not overdone. Classic disposable camera vibes.
 */
function superia(r, g, b) {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Green cast in midtones
  const midWeight = 1 - Math.abs(lum - 0.5) * 2
  g = clamp(g + midWeight * 8)
  r = clamp(r - midWeight * 3)

  // Cool shadow push
  const shWeight = Math.max(0, (0.35 - lum) * 3)
  b = clamp(b + shWeight * 10)
  r = clamp(r - shWeight * 4)

  // Lift blacks
  r = clamp(r * 0.95 + 12)
  g = clamp(g * 0.95 + 14)
  b = clamp(b * 0.95 + 16)

  // Moderate contrast
  const contrast = 1.05
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  return [r, g, b]
}

/**
 * Aura — Soft dreamy glow. Warm pastels, very lifted shadows,
 * low contrast, slightly hazy. Popular for portrait aesthetics.
 */
function aura(r, g, b) {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Heavily lift blacks for dreamy fade
  r = clamp(r * 0.82 + 45)
  g = clamp(g * 0.82 + 40)
  b = clamp(b * 0.82 + 42)

  // Warm tint
  r = clamp(r + 8)
  g = clamp(g + 2)
  b = clamp(b - 3)

  // Low contrast
  const contrast = 0.88
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  // Slight pink tint in highlights
  const hlWeight = Math.max(0, (lum - 0.6) * 2.5)
  r = clamp(r + hlWeight * 10)
  b = clamp(b + hlWeight * 5)

  return [r, g, b]
}

export const FILM_EMULATIONS = [
  { id: 'koji', name: 'Koji', fn: koji, description: 'Warm cinematic film' },
  { id: 'tokyo', name: 'Tokyo', fn: tokyo, description: 'Cool urban teal' },
  { id: 'portra', name: 'Portra', fn: portra, description: 'Soft warm portrait' },
  { id: 'velvia', name: 'Velvia', fn: velvia, description: 'Vivid saturated' },
  { id: 'superia', name: 'Superia', fn: superia, description: 'Cool disposable' },
  { id: 'aura', name: 'Aura', fn: aura, description: 'Dreamy pastel glow' },
]

export function applyFilmEmulation(imageData, emulationId, intensity = 1) {
  const emulation = FILM_EMULATIONS.find(e => e.id === emulationId)
  if (!emulation) return

  const d = imageData.data
  const fn = emulation.fn

  for (let i = 0; i < d.length; i += 4) {
    const [nr, ng, nb] = fn(d[i], d[i + 1], d[i + 2])

    if (intensity >= 1) {
      d[i] = nr
      d[i + 1] = ng
      d[i + 2] = nb
    } else {
      d[i] = lerpColor(d[i], nr, intensity)
      d[i + 1] = lerpColor(d[i + 1], ng, intensity)
      d[i + 2] = lerpColor(d[i + 2], nb, intensity)
    }
  }
}

/**
 * Adds realistic film grain to canvas.
 */
export function addFilmGrain(ctx, width, height, amount = 0.08) {
  if (amount <= 0) return
  const imageData = ctx.getImageData(0, 0, width, height)
  const d = imageData.data
  const strength = amount * 40

  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * strength
    d[i] = clamp(d[i] + noise)
    d[i + 1] = clamp(d[i + 1] + noise)
    d[i + 2] = clamp(d[i + 2] + noise)
  }

  ctx.putImageData(imageData, 0, 0)
}
