/**
 * Film emulation presets — pixel-level color grading that goes beyond CSS filters.
 * Each preset defines a function that transforms RGB pixel values.
 *
 * Inspired by classic film stocks and popular mobile editor looks (Prequel, VSCO, etc.)
 */

type RGBTuple = [number, number, number]
type FilmEmulationFn = (r: number, g: number, b: number) => RGBTuple

export interface FilmEmulation {
  id: string
  name: string
  fn: FilmEmulationFn
  description: string
  category: string
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

function lerpColor(a: number, b: number, t: number): number {
  return clamp(a + (b - a) * t)
}

/**
 * Koji — warm cinematic film emulation inspired by Kodak 2383 print stock.
 * Warm golden highlights, teal/blue shadows, slightly lifted blacks,
 * gentle desaturation in midtones, subtle halation glow.
 */
function koji(r: number, g: number, b: number): RGBTuple {
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
function tokyo(r: number, g: number, b: number): RGBTuple {
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
function portra(r: number, g: number, b: number): RGBTuple {
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
function velvia(r: number, g: number, b: number): RGBTuple {
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
function superia(r: number, g: number, b: number): RGBTuple {
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
function aura(r: number, g: number, b: number): RGBTuple {
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

/**
 * Havana — warm tropical look. Heavy warm cast, orange highlights,
 * teal shadows, lifted blacks, moderate contrast.
 */
function havana(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Lift blacks with warm bias
  r = clamp(r * 0.92 + 20)
  g = clamp(g * 0.92 + 14)
  b = clamp(b * 0.92 + 8)

  // Heavy warm cast
  r = clamp(r + 12)
  g = clamp(g + 4)
  b = clamp(b - 10)

  // Orange push in highlights
  const hlWeight = Math.max(0, (lum - 0.45) * 2)
  r = clamp(r + hlWeight * 22)
  g = clamp(g + hlWeight * 8)
  b = clamp(b - hlWeight * 12)

  // Teal shadows
  const shWeight = Math.max(0, (0.35 - lum) * 3)
  r = clamp(r - shWeight * 10)
  g = clamp(g + shWeight * 6)
  b = clamp(b + shWeight * 14)

  // Moderate contrast
  const contrast = 1.1
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  return [r, g, b]
}

/**
 * Berlin — cool muted European aesthetic. Desaturated, blue-gray tones,
 * crushed blacks, slightly cold overall.
 */
function berlin(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Heavy desaturation
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.35)
  g = clamp(g + (gray - g) * 0.35)
  b = clamp(b + (gray - b) * 0.35)

  // Cool blue-gray push
  r = clamp(r - 6)
  g = clamp(g - 2)
  b = clamp(b + 10)

  // Crush blacks
  const shWeight = Math.max(0, (0.25 - lum) * 4)
  r = clamp(r - shWeight * 12)
  g = clamp(g - shWeight * 12)
  b = clamp(b - shWeight * 8)

  // Moderate contrast
  const contrast = 1.12
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  // Slight lift to floor
  r = clamp(r * 0.97 + 6)
  g = clamp(g * 0.97 + 6)
  b = clamp(b * 0.97 + 8)

  return [r, g, b]
}

/**
 * Seoul — soft K-drama aesthetic. Pink-toned highlights, very low contrast,
 * lifted shadows, slight lavender cast, gentle desaturation.
 */
function seoul(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Lift shadows heavily
  r = clamp(r * 0.85 + 38)
  g = clamp(g * 0.85 + 35)
  b = clamp(b * 0.85 + 38)

  // Gentle desaturation
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.18)
  g = clamp(g + (gray - g) * 0.18)
  b = clamp(b + (gray - b) * 0.18)

  // Pink-toned highlights
  const hlWeight = Math.max(0, (lum - 0.5) * 2)
  r = clamp(r + hlWeight * 14)
  g = clamp(g - hlWeight * 4)
  b = clamp(b + hlWeight * 6)

  // Slight lavender cast overall
  r = clamp(r + 4)
  b = clamp(b + 6)

  // Very low contrast
  const contrast = 0.85
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  return [r, g, b]
}

/**
 * Paris — romantic warm tone. Golden warmth, soft pink highlights,
 * creamy midtones, low contrast, lifted blacks.
 */
function paris(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Lift blacks with warm floor
  r = clamp(r * 0.88 + 30)
  g = clamp(g * 0.88 + 25)
  b = clamp(b * 0.88 + 18)

  // Golden warm tone
  r = clamp(r + 10)
  g = clamp(g + 4)
  b = clamp(b - 8)

  // Soft pink highlights
  const hlWeight = Math.max(0, (lum - 0.55) * 2.5)
  r = clamp(r + hlWeight * 12)
  g = clamp(g - hlWeight * 2)
  b = clamp(b + hlWeight * 4)

  // Creamy midtones — desaturate midrange slightly
  const midWeight = 1 - Math.abs(lum - 0.5) * 2
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.12 * midWeight)
  g = clamp(g + (gray - g) * 0.12 * midWeight)
  b = clamp(b + (gray - b) * 0.12 * midWeight)

  // Low contrast
  const contrast = 0.9
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  return [r, g, b]
}

/**
 * Bali — tropical vibrant. Boosted greens and teals, warm highlights,
 * high saturation, moderate contrast.
 */
function bali(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Boost saturation
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (r - gray) * 0.25)
  g = clamp(g + (g - gray) * 0.3)
  b = clamp(b + (b - gray) * 0.25)

  // Push greens and teals
  const midWeight = 1 - Math.abs(lum - 0.5) * 2
  g = clamp(g + midWeight * 12)
  b = clamp(b + midWeight * 6)

  // Warm highlights
  const hlWeight = Math.max(0, (lum - 0.5) * 2)
  r = clamp(r + hlWeight * 14)
  g = clamp(g + hlWeight * 6)
  b = clamp(b - hlWeight * 8)

  // Moderate contrast
  const contrast = 1.1
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  return [r, g, b]
}

/**
 * Nordic — desaturated cool blue. Heavy desaturation, blue tint,
 * high contrast, dark moody. Scandinavian crime drama look.
 */
function nordic(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Heavy desaturation
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.45)
  g = clamp(g + (gray - g) * 0.45)
  b = clamp(b + (gray - b) * 0.45)

  // Blue tint
  r = clamp(r - 8)
  g = clamp(g - 4)
  b = clamp(b + 14)

  // High contrast
  const contrast = 1.25
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  // Dark moody — push shadows down
  const shWeight = Math.max(0, (0.3 - lum) * 3)
  r = clamp(r - shWeight * 10)
  g = clamp(g - shWeight * 10)
  b = clamp(b - shWeight * 6)

  return [r, g, b]
}

/**
 * RetroVHS — VHS retro look. Color bleeding (red channel shifted),
 * lifted blacks, reduced saturation, slight magenta cast, low contrast.
 */
function retroVhs(r: number, g: number, b: number): RGBTuple {
  // Simulate color bleeding by cross-contaminating channels
  const origR = r
  r = clamp(r * 0.85 + g * 0.1 + b * 0.05)
  g = clamp(origR * 0.05 + g * 0.85 + b * 0.1)

  // Reduce saturation
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.25)
  g = clamp(g + (gray - g) * 0.25)
  b = clamp(b + (gray - b) * 0.25)

  // Lift blacks heavily
  r = clamp(r * 0.85 + 35)
  g = clamp(g * 0.85 + 30)
  b = clamp(b * 0.85 + 32)

  // Slight magenta cast
  r = clamp(r + 6)
  g = clamp(g - 4)
  b = clamp(b + 4)

  // Low contrast
  const contrast = 0.88
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  return [r, g, b]
}

/**
 * Disposable — disposable camera look. Washed out, green/yellow cast,
 * heavily lifted blacks, low contrast, slight overexposure feel.
 */
function disposable(r: number, g: number, b: number): RGBTuple {
  // Overexposure feel — push brightness
  r = clamp(r + 15)
  g = clamp(g + 15)
  b = clamp(b + 10)

  // Heavily lift blacks
  r = clamp(r * 0.8 + 50)
  g = clamp(g * 0.8 + 50)
  b = clamp(b * 0.8 + 40)

  // Green/yellow cast
  r = clamp(r + 4)
  g = clamp(g + 10)
  b = clamp(b - 12)

  // Desaturate for washed-out look
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.2)
  g = clamp(g + (gray - g) * 0.2)
  b = clamp(b + (gray - b) * 0.2)

  // Low contrast
  const contrast = 0.85
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  return [r, g, b]
}

/**
 * Cyberpunk — neon aesthetic. Pushed teal shadows, hot magenta highlights,
 * high saturation, high contrast, vivid.
 */
function cyberpunk(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Boost saturation aggressively
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (r - gray) * 0.3)
  g = clamp(g + (g - gray) * 0.3)
  b = clamp(b + (b - gray) * 0.3)

  // Teal shadows
  const shWeight = Math.max(0, (0.4 - lum) * 2.5)
  r = clamp(r - shWeight * 14)
  g = clamp(g + shWeight * 10)
  b = clamp(b + shWeight * 16)

  // Hot magenta highlights
  const hlWeight = Math.max(0, (lum - 0.55) * 2.5)
  r = clamp(r + hlWeight * 20)
  g = clamp(g - hlWeight * 10)
  b = clamp(b + hlWeight * 14)

  // High contrast
  const contrast = 1.22
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  return [r, g, b]
}

/**
 * SunsetBlvd — extreme golden hour. Heavy orange/amber push, warm everything,
 * soft contrast, glowing highlights.
 */
function sunsetBlvd(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Heavy orange/amber push
  r = clamp(r + 20)
  g = clamp(g + 6)
  b = clamp(b - 18)

  // Warm everything — scale channels
  r = clamp(r * 1.05)
  g = clamp(g * 0.98)
  b = clamp(b * 0.85)

  // Glowing highlights — lift bright areas further
  const hlWeight = Math.max(0, (lum - 0.45) * 2)
  r = clamp(r + hlWeight * 18)
  g = clamp(g + hlWeight * 10)
  b = clamp(b + hlWeight * 2)

  // Lift blacks with warmth
  r = clamp(r * 0.92 + 20)
  g = clamp(g * 0.92 + 14)
  b = clamp(b * 0.92 + 6)

  // Soft contrast
  const contrast = 0.92
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  return [r, g, b]
}

/**
 * FilmNoir — classic black & white with warmth. Convert to grayscale,
 * add slight sepia tint, high contrast, deep blacks.
 */
function filmNoir(r: number, g: number, b: number): RGBTuple {
  // Convert to grayscale
  const gray = 0.299 * r + 0.587 * g + 0.114 * b

  // High contrast
  const contrast = 1.3
  let v = clamp(((gray / 255 - 0.5) * contrast + 0.5) * 255)

  // Deep blacks — crush shadows
  const lum = gray / 255
  const shWeight = Math.max(0, (0.25 - lum) * 4)
  v = clamp(v - shWeight * 15)

  // Add slight sepia tint
  r = clamp(v + 8)
  g = clamp(v + 2)
  b = clamp(v - 6)

  return [r, g, b]
}

/**
 * PastelPop — pastel aesthetic. Heavily lifted blacks, very low contrast,
 * desaturated but pink/peach tinted, dreamy soft.
 */
function pastelPop(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Heavily lift blacks
  r = clamp(r * 0.75 + 60)
  g = clamp(g * 0.75 + 55)
  b = clamp(b * 0.75 + 58)

  // Desaturate substantially
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.3)
  g = clamp(g + (gray - g) * 0.3)
  b = clamp(b + (gray - b) * 0.3)

  // Pink/peach tint
  r = clamp(r + 10)
  g = clamp(g - 2)
  b = clamp(b + 4)

  // Very low contrast
  const contrast = 0.82
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  // Dreamy soft highlights
  const hlWeight = Math.max(0, (lum - 0.6) * 2.5)
  r = clamp(r + hlWeight * 8)
  g = clamp(g + hlWeight * 4)
  b = clamp(b + hlWeight * 6)

  return [r, g, b]
}

/**
 * Chrome — metallic/chrome look. High contrast, slight blue-steel tint,
 * desaturated midtones, bright whites, deep blacks.
 */
function chrome(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Desaturate midtones
  const midWeight = 1 - Math.abs(lum - 0.5) * 2
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.35 * midWeight)
  g = clamp(g + (gray - g) * 0.35 * midWeight)
  b = clamp(b + (gray - b) * 0.35 * midWeight)

  // Blue-steel tint
  r = clamp(r - 4)
  g = clamp(g - 2)
  b = clamp(b + 8)

  // High contrast for metallic sheen
  const contrast = 1.3
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  // Push whites brighter
  const hlWeight = Math.max(0, (lum - 0.7) * 3)
  r = clamp(r + hlWeight * 12)
  g = clamp(g + hlWeight * 12)
  b = clamp(b + hlWeight * 14)

  // Deep blacks
  const shWeight = Math.max(0, (0.2 - lum) * 5)
  r = clamp(r - shWeight * 10)
  g = clamp(g - shWeight * 10)
  b = clamp(b - shWeight * 10)

  return [r, g, b]
}

/**
 * Matte — matte/flat look. Very lifted blacks (floor ~40), reduced highlights,
 * flat contrast, slightly warm.
 */
function matte(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Very lifted blacks — floor around 40
  r = clamp(r * 0.78 + 55)
  g = clamp(g * 0.78 + 52)
  b = clamp(b * 0.78 + 48)

  // Reduce highlights — pull down bright areas
  const hlWeight = Math.max(0, (lum - 0.6) * 2.5)
  r = clamp(r - hlWeight * 15)
  g = clamp(g - hlWeight * 15)
  b = clamp(b - hlWeight * 15)

  // Slightly warm
  r = clamp(r + 5)
  g = clamp(g + 1)
  b = clamp(b - 4)

  // Flat contrast
  const contrast = 0.82
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  return [r, g, b]
}

/**
 * Infrared — false color infrared. Swaps green channel toward red tones,
 * pushes reds to white, blues stay dark, surreal color shift.
 */
function infrared(r: number, g: number, b: number): RGBTuple {
  // Swap/remap channels for false color
  const origR = r
  const origG = g
  const origB = b

  // Green channel maps to red (foliage goes bright)
  r = clamp(origG * 1.2 + origR * 0.1)
  // Red channel pushes toward white
  g = clamp(origR * 0.6 + origG * 0.3 + 20)
  // Blue stays dark and muted
  b = clamp(origB * 0.5 + origR * 0.15)

  // Push high-red areas toward white
  const redWeight = Math.max(0, (origR / 255 - 0.5) * 2)
  r = clamp(r + redWeight * 30)
  g = clamp(g + redWeight * 25)
  b = clamp(b + redWeight * 10)

  // Keep blues dark
  const blueWeight = Math.max(0, (origB / 255 - 0.4) * 2)
  b = clamp(b - blueWeight * 15)

  // High contrast for surreal effect
  const contrast = 1.18
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)

  return [r, g, b]
}

/**
 * Moody — dark atmospheric. Deep shadows, teal midtones, desaturated.
 */
function moody(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.25)
  g = clamp(g + (gray - g) * 0.25)
  b = clamp(b + (gray - b) * 0.25)
  const shW = Math.max(0, (0.35 - lum) * 3)
  r = clamp(r - shW * 15)
  g = clamp(g - shW * 10)
  b = clamp(b - shW * 5)
  r = clamp(r - 5)
  g = clamp(g + 3)
  b = clamp(b + 8)
  const contrast = 1.18
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)
  return [r, g, b]
}

/**
 * Golden — warm golden glow everywhere.
 */
function golden(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  r = clamp(r + 15)
  g = clamp(g + 8)
  b = clamp(b - 12)
  r = clamp(r * 0.9 + 25)
  g = clamp(g * 0.9 + 18)
  b = clamp(b * 0.9 + 8)
  const hlW = Math.max(0, (lum - 0.5) * 2)
  r = clamp(r + hlW * 15)
  g = clamp(g + hlW * 8)
  const contrast = 0.95
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)
  return [r, g, b]
}

/**
 * Faded — heavily faded vintage. Crushed whites, lifted blacks.
 */
function faded(r: number, g: number, b: number): RGBTuple {
  r = clamp(r * 0.82 + 45)
  g = clamp(g * 0.82 + 42)
  b = clamp(b * 0.82 + 38)
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.15)
  g = clamp(g + (gray - g) * 0.15)
  b = clamp(b + (gray - b) * 0.15)
  r = clamp(r + 5)
  b = clamp(b - 3)
  const contrast = 0.8
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)
  return [r, g, b]
}

/**
 * Neon — vivid neon colors, high saturation, bright.
 */
function neon(r: number, g: number, b: number): RGBTuple {
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (r - gray) * 0.45)
  g = clamp(g + (g - gray) * 0.45)
  b = clamp(b + (b - gray) * 0.45)
  r = clamp(r + 10)
  g = clamp(g + 5)
  b = clamp(b + 10)
  const contrast = 1.15
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)
  return [r, g, b]
}

/**
 * Cinematic — teal-orange color grade, Hollywood blockbuster look.
 */
function cinematic(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const hlW = Math.max(0, (lum - 0.45) * 2)
  r = clamp(r + hlW * 20)
  g = clamp(g + hlW * 8)
  b = clamp(b - hlW * 5)
  const shW = Math.max(0, (0.4 - lum) * 2.5)
  r = clamp(r - shW * 10)
  g = clamp(g + shW * 5)
  b = clamp(b + shW * 15)
  const contrast = 1.12
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)
  r = clamp(r * 0.95 + 12)
  g = clamp(g * 0.95 + 10)
  b = clamp(b * 0.95 + 10)
  return [r, g, b]
}

/**
 * Polaroid — instant camera feel. Warm, slightly green cast, lifted blacks.
 */
function polaroid(r: number, g: number, b: number): RGBTuple {
  r = clamp(r * 0.88 + 30)
  g = clamp(g * 0.88 + 28)
  b = clamp(b * 0.88 + 22)
  r = clamp(r + 6)
  g = clamp(g + 8)
  b = clamp(b - 6)
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.1)
  g = clamp(g + (gray - g) * 0.1)
  b = clamp(b + (gray - b) * 0.1)
  const contrast = 0.92
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)
  return [r, g, b]
}

/**
 * Midnight — deep blue night aesthetic. Cool shadows, muted highlights.
 */
function midnight(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.3)
  g = clamp(g + (gray - g) * 0.3)
  b = clamp(b + (gray - b) * 0.3)
  r = clamp(r - 12)
  g = clamp(g - 6)
  b = clamp(b + 18)
  const shW = Math.max(0, (0.4 - lum) * 2.5)
  b = clamp(b + shW * 12)
  const hlW = Math.max(0, (lum - 0.6) * 2.5)
  r = clamp(r - hlW * 8)
  g = clamp(g - hlW * 8)
  const contrast = 1.15
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)
  return [r, g, b]
}

/**
 * Peach — warm peachy skin-tone-friendly aesthetic.
 */
function peach(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  r = clamp(r * 0.85 + 38)
  g = clamp(g * 0.85 + 30)
  b = clamp(b * 0.85 + 25)
  r = clamp(r + 12)
  g = clamp(g + 4)
  b = clamp(b - 8)
  const hlW = Math.max(0, (lum - 0.5) * 2)
  r = clamp(r + hlW * 10)
  g = clamp(g + hlW * 5)
  const contrast = 0.88
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)
  return [r, g, b]
}

/**
 * Emerald — lush green tones, deep contrast, nature-focused.
 */
function emerald(r: number, g: number, b: number): RGBTuple {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (r - gray) * 0.15)
  g = clamp(g + (g - gray) * 0.25)
  b = clamp(b + (b - gray) * 0.15)
  r = clamp(r - 8)
  g = clamp(g + 10)
  b = clamp(b - 4)
  const midW = 1 - Math.abs(lum - 0.5) * 2
  g = clamp(g + midW * 8)
  const contrast = 1.12
  r = clamp(((r / 255 - 0.5) * contrast + 0.5) * 255)
  g = clamp(((g / 255 - 0.5) * contrast + 0.5) * 255)
  b = clamp(((b / 255 - 0.5) * contrast + 0.5) * 255)
  return [r, g, b]
}

export const FILM_EMULATIONS: FilmEmulation[] = [
  { id: 'koji', name: 'Koji', fn: koji, description: 'Warm cinematic film', category: 'classic' },
  { id: 'tokyo', name: 'Tokyo', fn: tokyo, description: 'Cool urban teal', category: 'classic' },
  { id: 'portra', name: 'Portra', fn: portra, description: 'Soft warm portrait', category: 'classic' },
  { id: 'velvia', name: 'Velvia', fn: velvia, description: 'Vivid saturated', category: 'classic' },
  { id: 'superia', name: 'Superia', fn: superia, description: 'Cool disposable', category: 'classic' },
  { id: 'aura', name: 'Aura', fn: aura, description: 'Dreamy pastel glow', category: 'classic' },
  { id: 'havana', name: 'Havana', fn: havana, description: 'Warm tropical', category: 'trending' },
  { id: 'berlin', name: 'Berlin', fn: berlin, description: 'Cool muted European', category: 'trending' },
  { id: 'seoul', name: 'Seoul', fn: seoul, description: 'Soft K-drama aesthetic', category: 'trending' },
  { id: 'paris', name: 'Paris', fn: paris, description: 'Romantic warm golden', category: 'trending' },
  { id: 'bali', name: 'Bali', fn: bali, description: 'Tropical vibrant', category: 'trending' },
  { id: 'nordic', name: 'Nordic', fn: nordic, description: 'Desaturated cool blue', category: 'trending' },
  { id: 'retroVhs', name: 'Retro VHS', fn: retroVhs, description: 'VHS retro look', category: 'trending' },
  { id: 'disposable', name: 'Disposable', fn: disposable, description: 'Disposable camera', category: 'trending' },
  { id: 'cyberpunk', name: 'Cyberpunk', fn: cyberpunk, description: 'Neon aesthetic', category: 'trending' },
  { id: 'sunsetBlvd', name: 'Sunset Blvd', fn: sunsetBlvd, description: 'Extreme golden hour', category: 'trending' },
  { id: 'filmNoir', name: 'Film Noir', fn: filmNoir, description: 'Classic B&W with warmth', category: 'trending' },
  { id: 'pastelPop', name: 'Pastel Pop', fn: pastelPop, description: 'Pastel aesthetic', category: 'trending' },
  { id: 'chrome', name: 'Chrome', fn: chrome, description: 'Metallic chrome look', category: 'trending' },
  { id: 'matte', name: 'Matte', fn: matte, description: 'Matte flat look', category: 'trending' },
  { id: 'infrared', name: 'Infrared', fn: infrared, description: 'False color infrared', category: 'trending' },
  { id: 'moody', name: 'Moody', fn: moody, description: 'Dark atmospheric', category: 'trending' },
  { id: 'golden', name: 'Golden', fn: golden, description: 'Warm golden glow', category: 'trending' },
  { id: 'faded', name: 'Faded', fn: faded, description: 'Heavily faded vintage', category: 'trending' },
  { id: 'neon', name: 'Neon', fn: neon, description: 'Vivid neon colors', category: 'trending' },
  { id: 'cinematic', name: 'Cinematic', fn: cinematic, description: 'Teal-orange Hollywood', category: 'trending' },
  { id: 'polaroid', name: 'Polaroid', fn: polaroid, description: 'Instant camera feel', category: 'classic' },
  { id: 'midnight', name: 'Midnight', fn: midnight, description: 'Deep blue night', category: 'trending' },
  { id: 'peach', name: 'Peach', fn: peach, description: 'Warm peachy aesthetic', category: 'trending' },
  { id: 'emerald', name: 'Emerald', fn: emerald, description: 'Lush green tones', category: 'trending' },
]

export function applyFilmEmulation(imageData: ImageData, emulationId: string, intensity: number = 1): void {
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
export function addFilmGrain(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number = 0.08): void {
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
