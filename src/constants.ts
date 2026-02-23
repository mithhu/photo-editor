import type { EditState } from './types'

export const INITIAL_EDIT_STATE: EditState = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  exposure: 1,
  highlights: 1,
  shadows: 1,
  warmth: 0,
  tint: 0,
  vibrance: 0,
  clarity: 0,
  dehaze: 0,
  vignette: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  cropRatio: 'original',
  preset: 'none',
  zoom: 1,
  panX: 0,
  panY: 0,
  textOverlays: [],
  shapeOverlays: [],
  layerVisibility: {},
  customCrop: null,
  perspective: { horizontal: 0, vertical: 0, rotation: 0 },
  brushStrokes: [],
  drawingMode: null,
  selectionMask: null,
  wandTolerance: 32,
  healSource: null,
  brushColor: '#ffffff',
  brushSize: 5,
  brushOpacity: 1,
  hsl: {
    red: { h: 0, s: 0, l: 0 },
    orange: { h: 0, s: 0, l: 0 },
    yellow: { h: 0, s: 0, l: 0 },
    green: { h: 0, s: 0, l: 0 },
    cyan: { h: 0, s: 0, l: 0 },
    blue: { h: 0, s: 0, l: 0 },
    purple: { h: 0, s: 0, l: 0 },
    magenta: { h: 0, s: 0, l: 0 },
  },
  curves: {
    rgb: [[0, 0], [1, 1]],
    red: [[0, 0], [1, 1]],
    green: [[0, 0], [1, 1]],
    blue: [[0, 0], [1, 1]],
  },
  colorGrade: {
    shadows: { r: 0, g: 0, b: 0 },
    midtones: { r: 0, g: 0, b: 0 },
    highlights: { r: 0, g: 0, b: 0 },
  },
  splitTone: {
    highlightHue: 0,
    highlightSat: 0,
    shadowHue: 0,
    shadowSat: 0,
    balance: 0,
  },
  masks: [],
  filmEmulation: null,
  filmIntensity: 1,
  filmGrain: 0,
  tiltShift: { mode: 'linear', position: 50, size: 30, blur: 0 },
  frame: { type: 'none', color: '#ffffff', width: 0 },
  pickedColor: null,
  grain: { amount: 0, size: 1 },
  selectiveColor: { enabled: false, hue: 0, range: 30 },
  lightLeak: { type: 'none', intensity: 0.5 },
  lut: null,
  lutName: null,
  resize: { width: 0, height: 0, lockAspect: true },
  gradientMap: { enabled: false, shadows: '#1a1a2e', highlights: '#e8d5b7', intensity: 0.7 },
  chromaticAberration: 0,
  sharpen: 0,
  glitch: 0,
  oilPaint: 0,
  posterize: 0,
  solarize: 0,
  emboss: 0,
  channelMixer: {
    red: { r: 100, g: 0, b: 0 },
    green: { r: 0, g: 100, b: 0 },
    blue: { r: 0, g: 0, b: 100 },
  },
  beauty: { smooth: 0, blemish: 0, evenness: 0, brightenEyes: 0, teethWhiten: 0 },
  faceReshape: { slimFace: 0, biggerEyes: 0, noseSlim: 0, jawline: 0 },
  makeup: {
    lipstick: { color: '#cc3355', opacity: 0 },
    blush: { color: '#e88899', opacity: 0 },
    eyeliner: { color: '#222222', opacity: 0 },
    eyeshadow: { color: '#886699', opacity: 0 },
  },
  emotion: { type: 'none' as const, intensity: 70 },
  ageTransform: { offset: 0, intensity: 70 },
  effectOverlay: { type: 'none', intensity: 50, seed: 42 },
}

export interface FontOption {
  value: string
  label: string
}

/** Font options for text overlays. Defaults: fontFamily 'sans-serif', fontWeight 'normal', fontStyle 'normal', textShadow false, opacity 1, rotation 0 */
export const TEXT_OVERLAY_FONTS: FontOption[] = [
  { value: 'sans-serif', label: 'Sans Serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'cursive', label: 'Cursive' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' },
]

export interface FilterOp {
  type: string
  value: number
}

export interface FilterPresetConfig {
  id: string
  name: string
  category: string
  ops: FilterOp[]
}

export const FILTER_PRESETS: FilterPresetConfig[] = [
  { id: 'none', name: 'None', category: 'all', ops: [] },

  // ── Popular ──
  { id: 'vivid', name: 'Vivid', category: 'popular', ops: [{ type: 'saturate', value: 1.4 }, { type: 'contrast', value: 1.1 }] },
  { id: 'warm', name: 'Warm', category: 'popular', ops: [{ type: 'sepia', value: 0.2 }, { type: 'saturate', value: 1.2 }, { type: 'brightness', value: 1.05 }] },
  { id: 'cool', name: 'Cool', category: 'popular', ops: [{ type: 'saturate', value: 0.9 }, { type: 'hue-rotate', value: -10 }] },
  { id: 'bw', name: 'B&W', category: 'popular', ops: [{ type: 'grayscale', value: 1 }, { type: 'contrast', value: 1.1 }] },
  { id: 'dramatic', name: 'Dramatic', category: 'popular', ops: [{ type: 'contrast', value: 1.3 }, { type: 'saturate', value: 1.2 }] },
  { id: 'golden-hour', name: 'Golden Hour', category: 'popular', ops: [{ type: 'sepia', value: 0.3 }, { type: 'saturate', value: 1.2 }, { type: 'brightness', value: 1.1 }, { type: 'contrast', value: 1.05 }] },
  { id: 'pop', name: 'Pop', category: 'popular', ops: [{ type: 'saturate', value: 1.55 }, { type: 'contrast', value: 1.15 }, { type: 'brightness', value: 1.03 }] },
  { id: 'fresh', name: 'Fresh', category: 'popular', ops: [{ type: 'brightness', value: 1.08 }, { type: 'saturate', value: 1.2 }, { type: 'contrast', value: 1.05 }] },
  { id: 'natural', name: 'Natural', category: 'popular', ops: [{ type: 'saturate', value: 1.1 }, { type: 'brightness', value: 1.04 }, { type: 'contrast', value: 1.02 }] },
  { id: 'crisp', name: 'Crisp', category: 'popular', ops: [{ type: 'contrast', value: 1.2 }, { type: 'saturate', value: 1.05 }, { type: 'brightness', value: 1.02 }] },

  // ── Mood ──
  { id: 'cinematic', name: 'Cinematic', category: 'mood', ops: [{ type: 'contrast', value: 1.2 }, { type: 'saturate', value: 0.8 }, { type: 'brightness', value: 0.95 }] },
  { id: 'vintage', name: 'Vintage', category: 'mood', ops: [{ type: 'sepia', value: 0.5 }, { type: 'contrast', value: 1.1 }, { type: 'saturate', value: 0.9 }] },
  { id: 'moody', name: 'Moody', category: 'mood', ops: [{ type: 'contrast', value: 1.25 }, { type: 'saturate', value: 0.85 }, { type: 'brightness', value: 0.9 }] },
  { id: 'dreamy', name: 'Dreamy', category: 'mood', ops: [{ type: 'contrast', value: 0.9 }, { type: 'saturate', value: 0.85 }, { type: 'brightness', value: 1.08 }] },
  { id: 'fade', name: 'Fade', category: 'mood', ops: [{ type: 'contrast', value: 0.9 }, { type: 'saturate', value: 0.85 }] },
  { id: 'noir', name: 'Noir', category: 'mood', ops: [{ type: 'grayscale', value: 1 }, { type: 'contrast', value: 1.35 }, { type: 'brightness', value: 0.9 }] },
  { id: 'melancholy', name: 'Melancholy', category: 'mood', ops: [{ type: 'saturate', value: 0.6 }, { type: 'brightness', value: 0.92 }, { type: 'contrast', value: 1.1 }, { type: 'hue-rotate', value: -5 }] },
  { id: 'dark-romance', name: 'Dark Romance', category: 'mood', ops: [{ type: 'contrast', value: 1.3 }, { type: 'saturate', value: 0.7 }, { type: 'brightness', value: 0.85 }, { type: 'sepia', value: 0.1 }] },
  { id: 'hazy', name: 'Hazy', category: 'mood', ops: [{ type: 'contrast', value: 0.82 }, { type: 'brightness', value: 1.1 }, { type: 'saturate', value: 0.8 }] },
  { id: 'twilight', name: 'Twilight', category: 'mood', ops: [{ type: 'brightness', value: 0.88 }, { type: 'contrast', value: 1.15 }, { type: 'saturate', value: 0.75 }, { type: 'hue-rotate', value: 10 }] },
  { id: 'ethereal', name: 'Ethereal', category: 'mood', ops: [{ type: 'brightness', value: 1.12 }, { type: 'contrast', value: 0.85 }, { type: 'saturate', value: 0.7 }, { type: 'sepia', value: 0.05 }] },

  // ── Style ──
  { id: 'clarendon', name: 'Clarendon', category: 'style', ops: [{ type: 'contrast', value: 1.2 }, { type: 'saturate', value: 1.35 }] },
  { id: 'juno', name: 'Juno', category: 'style', ops: [{ type: 'sepia', value: 0.15 }, { type: 'contrast', value: 1.15 }, { type: 'saturate', value: 1.25 }, { type: 'brightness', value: 1.05 }] },
  { id: 'teal-orange', name: 'Teal & Orange', category: 'style', ops: [{ type: 'sepia', value: 0.25 }, { type: 'hue-rotate', value: -10 }, { type: 'contrast', value: 1.15 }, { type: 'saturate', value: 1.1 }] },
  { id: 'y2k', name: 'Y2K', category: 'style', ops: [{ type: 'contrast', value: 1.2 }, { type: 'saturate', value: 1.5 }, { type: 'brightness', value: 1.02 }] },
  { id: 'vhs', name: 'VHS / Retro', category: 'style', ops: [{ type: 'saturate', value: 0.6 }, { type: 'contrast', value: 1.1 }, { type: 'brightness', value: 0.95 }, { type: 'hue-rotate', value: -5 }] },
  { id: 'latte', name: 'Latte', category: 'style', ops: [{ type: 'sepia', value: 0.22 }, { type: 'brightness', value: 1.06 }, { type: 'contrast', value: 0.95 }, { type: 'saturate', value: 0.9 }] },
  { id: 'arctic', name: 'Arctic', category: 'style', ops: [{ type: 'hue-rotate', value: -15 }, { type: 'saturate', value: 0.75 }, { type: 'brightness', value: 1.1 }, { type: 'contrast', value: 1.05 }] },
  { id: 'autumn', name: 'Autumn', category: 'style', ops: [{ type: 'sepia', value: 0.35 }, { type: 'saturate', value: 1.25 }, { type: 'contrast', value: 1.1 }, { type: 'brightness', value: 1.02 }] },
  { id: 'ocean', name: 'Ocean', category: 'style', ops: [{ type: 'hue-rotate', value: -20 }, { type: 'saturate', value: 1.15 }, { type: 'brightness', value: 1.02 }, { type: 'contrast', value: 1.08 }] },
  { id: 'desert', name: 'Desert', category: 'style', ops: [{ type: 'sepia', value: 0.28 }, { type: 'saturate', value: 0.9 }, { type: 'brightness', value: 1.08 }, { type: 'contrast', value: 1.05 }] },
  { id: 'midnight', name: 'Midnight', category: 'style', ops: [{ type: 'brightness', value: 0.82 }, { type: 'contrast', value: 1.25 }, { type: 'saturate', value: 0.85 }, { type: 'hue-rotate', value: 8 }] },

  // ── Aesthetic ──
  { id: 'soft-glow', name: 'Soft Glow', category: 'aesthetic', ops: [{ type: 'brightness', value: 1.06 }, { type: 'contrast', value: 0.92 }, { type: 'saturate', value: 0.9 }, { type: 'sepia', value: 0.08 }] },
  { id: 'pastel-dream', name: 'Pastel Dream', category: 'aesthetic', ops: [{ type: 'contrast', value: 0.85 }, { type: 'saturate', value: 0.75 }, { type: 'brightness', value: 1.12 }, { type: 'sepia', value: 0.1 }] },
  { id: 'rose-gold', name: 'Rose Gold', category: 'aesthetic', ops: [{ type: 'sepia', value: 0.2 }, { type: 'saturate', value: 1.1 }, { type: 'brightness', value: 1.05 }, { type: 'hue-rotate', value: 5 }] },
  { id: 'honey', name: 'Honey', category: 'aesthetic', ops: [{ type: 'sepia', value: 0.25 }, { type: 'saturate', value: 1.15 }, { type: 'brightness', value: 1.08 }, { type: 'contrast', value: 1.05 }] },
  { id: 'lavender-haze', name: 'Lavender Haze', category: 'aesthetic', ops: [{ type: 'saturate', value: 0.85 }, { type: 'brightness', value: 1.04 }, { type: 'hue-rotate', value: 15 }, { type: 'contrast', value: 0.95 }] },
  { id: 'peach-fuzz', name: 'Peach Fuzz', category: 'aesthetic', ops: [{ type: 'sepia', value: 0.15 }, { type: 'saturate', value: 1.05 }, { type: 'brightness', value: 1.06 }, { type: 'hue-rotate', value: 3 }] },
  { id: 'blush', name: 'Blush', category: 'aesthetic', ops: [{ type: 'sepia', value: 0.1 }, { type: 'saturate', value: 1.15 }, { type: 'brightness', value: 1.08 }, { type: 'hue-rotate', value: 8 }] },
  { id: 'vanilla', name: 'Vanilla', category: 'aesthetic', ops: [{ type: 'sepia', value: 0.12 }, { type: 'brightness', value: 1.1 }, { type: 'contrast', value: 0.9 }, { type: 'saturate', value: 0.85 }] },
  { id: 'cotton-candy', name: 'Cotton Candy', category: 'aesthetic', ops: [{ type: 'brightness', value: 1.1 }, { type: 'contrast', value: 0.88 }, { type: 'saturate', value: 0.8 }, { type: 'hue-rotate', value: 12 }] },
  { id: 'cherry-blossom', name: 'Cherry Blossom', category: 'aesthetic', ops: [{ type: 'sepia', value: 0.08 }, { type: 'saturate', value: 1.1 }, { type: 'brightness', value: 1.06 }, { type: 'hue-rotate', value: 6 }, { type: 'contrast', value: 0.95 }] },
  { id: 'angel', name: 'Angel', category: 'aesthetic', ops: [{ type: 'brightness', value: 1.14 }, { type: 'contrast', value: 0.82 }, { type: 'saturate', value: 0.7 }, { type: 'sepia', value: 0.06 }] },
  { id: 'cloud9', name: 'Cloud 9', category: 'aesthetic', ops: [{ type: 'brightness', value: 1.12 }, { type: 'contrast', value: 0.88 }, { type: 'saturate', value: 0.75 }, { type: 'hue-rotate', value: 5 }] },
  { id: 'fairy', name: 'Fairy', category: 'aesthetic', ops: [{ type: 'brightness', value: 1.1 }, { type: 'saturate', value: 1.2 }, { type: 'contrast', value: 0.9 }, { type: 'hue-rotate', value: 10 }] },

  // ── Trending ──
  { id: 'disposable-cam', name: 'Disposable Cam', category: 'trending', ops: [{ type: 'contrast', value: 0.88 }, { type: 'saturate', value: 0.7 }, { type: 'brightness', value: 1.1 }, { type: 'sepia', value: 0.12 }, { type: 'hue-rotate', value: 8 }] },
  { id: '90s-cam', name: '90s Cam', category: 'trending', ops: [{ type: 'sepia', value: 0.18 }, { type: 'contrast', value: 1.1 }, { type: 'saturate', value: 0.8 }, { type: 'brightness', value: 0.98 }] },
  { id: 'polaroid-filter', name: 'Polaroid', category: 'trending', ops: [{ type: 'sepia', value: 0.15 }, { type: 'brightness', value: 1.08 }, { type: 'contrast', value: 0.95 }, { type: 'saturate', value: 1.1 }] },
  { id: 'lo-fi', name: 'Lo-Fi', category: 'trending', ops: [{ type: 'contrast', value: 1.3 }, { type: 'saturate', value: 1.4 }, { type: 'brightness', value: 0.95 }] },
  { id: 'indie-kid', name: 'Indie Kid', category: 'trending', ops: [{ type: 'sepia', value: 0.1 }, { type: 'saturate', value: 0.9 }, { type: 'contrast', value: 1.05 }, { type: 'brightness', value: 1.02 }, { type: 'hue-rotate', value: -8 }] },
  { id: 'clean-girl', name: 'Clean Girl', category: 'trending', ops: [{ type: 'brightness', value: 1.06 }, { type: 'contrast', value: 1.08 }, { type: 'saturate', value: 0.92 }] },
  { id: 'that-girl', name: 'That Girl', category: 'trending', ops: [{ type: 'brightness', value: 1.08 }, { type: 'contrast', value: 1.05 }, { type: 'saturate', value: 1.1 }, { type: 'sepia', value: 0.05 }] },
  { id: 'old-money', name: 'Old Money', category: 'trending', ops: [{ type: 'contrast', value: 1.12 }, { type: 'saturate', value: 0.7 }, { type: 'sepia', value: 0.15 }, { type: 'brightness', value: 1.02 }] },
  { id: 'coquette', name: 'Coquette', category: 'trending', ops: [{ type: 'brightness', value: 1.1 }, { type: 'contrast', value: 0.9 }, { type: 'saturate', value: 0.85 }, { type: 'sepia', value: 0.08 }, { type: 'hue-rotate', value: 5 }] },
  { id: 'mob-wife', name: 'Mob Wife', category: 'trending', ops: [{ type: 'contrast', value: 1.25 }, { type: 'saturate', value: 0.75 }, { type: 'brightness', value: 0.9 }, { type: 'sepia', value: 0.12 }] },
  { id: 'coastal-gran', name: 'Coastal Gran', category: 'trending', ops: [{ type: 'brightness', value: 1.1 }, { type: 'saturate', value: 0.85 }, { type: 'contrast', value: 1.0 }, { type: 'hue-rotate', value: -5 }] },
  { id: 'quiet-luxury', name: 'Quiet Luxury', category: 'trending', ops: [{ type: 'contrast', value: 1.08 }, { type: 'saturate', value: 0.8 }, { type: 'brightness', value: 1.04 }, { type: 'sepia', value: 0.1 }] },
  { id: 'tomato-girl', name: 'Tomato Girl', category: 'trending', ops: [{ type: 'sepia', value: 0.2 }, { type: 'saturate', value: 1.35 }, { type: 'brightness', value: 1.06 }, { type: 'contrast', value: 1.08 }] },
  { id: 'soft-life', name: 'Soft Life', category: 'trending', ops: [{ type: 'brightness', value: 1.1 }, { type: 'contrast', value: 0.88 }, { type: 'saturate', value: 0.9 }, { type: 'sepia', value: 0.06 }] },
  { id: 'dark-academia', name: 'Dark Academia', category: 'trending', ops: [{ type: 'sepia', value: 0.25 }, { type: 'contrast', value: 1.15 }, { type: 'saturate', value: 0.7 }, { type: 'brightness', value: 0.88 }] },
  { id: 'light-academia', name: 'Light Academia', category: 'trending', ops: [{ type: 'sepia', value: 0.18 }, { type: 'brightness', value: 1.1 }, { type: 'contrast', value: 1.05 }, { type: 'saturate', value: 0.85 }] },

  // ── Portrait ──
  { id: 'selfie-glow', name: 'Selfie Glow', category: 'portrait', ops: [{ type: 'brightness', value: 1.1 }, { type: 'contrast', value: 0.95 }, { type: 'saturate', value: 1.1 }] },
  { id: 'studio-light', name: 'Studio Light', category: 'portrait', ops: [{ type: 'brightness', value: 1.12 }, { type: 'contrast', value: 1.1 }, { type: 'saturate', value: 1.05 }] },
  { id: 'skin-tone', name: 'Skin Tone', category: 'portrait', ops: [{ type: 'sepia', value: 0.1 }, { type: 'saturate', value: 1.15 }, { type: 'brightness', value: 1.05 }, { type: 'contrast', value: 1.02 }] },
  { id: 'soft-portrait', name: 'Soft Portrait', category: 'portrait', ops: [{ type: 'contrast', value: 0.88 }, { type: 'brightness', value: 1.08 }, { type: 'saturate', value: 0.95 }] },
  { id: 'magazine', name: 'Magazine', category: 'portrait', ops: [{ type: 'contrast', value: 1.18 }, { type: 'saturate', value: 1.1 }, { type: 'brightness', value: 1.04 }] },
  { id: 'beauty-dish', name: 'Beauty Dish', category: 'portrait', ops: [{ type: 'brightness', value: 1.15 }, { type: 'contrast', value: 1.05 }, { type: 'saturate', value: 0.9 }] },
  { id: 'runway', name: 'Runway', category: 'portrait', ops: [{ type: 'contrast', value: 1.22 }, { type: 'saturate', value: 0.85 }, { type: 'brightness', value: 1.02 }] },
  { id: 'porcelain', name: 'Porcelain', category: 'portrait', ops: [{ type: 'brightness', value: 1.1 }, { type: 'contrast', value: 0.85 }, { type: 'saturate', value: 0.75 }, { type: 'sepia', value: 0.04 }] },
  { id: 'sun-kissed', name: 'Sun Kissed', category: 'portrait', ops: [{ type: 'sepia', value: 0.15 }, { type: 'brightness', value: 1.1 }, { type: 'saturate', value: 1.2 }, { type: 'contrast', value: 1.05 }] },
  { id: 'candlelight', name: 'Candlelight', category: 'portrait', ops: [{ type: 'sepia', value: 0.3 }, { type: 'brightness', value: 1.05 }, { type: 'saturate', value: 1.1 }, { type: 'contrast', value: 0.95 }] },

  // ── Film ──
  { id: 'kodak-gold', name: 'Kodak Gold', category: 'film', ops: [{ type: 'sepia', value: 0.2 }, { type: 'saturate', value: 1.3 }, { type: 'contrast', value: 1.08 }, { type: 'brightness', value: 1.04 }] },
  { id: 'fuji-superia', name: 'Fuji Superia', category: 'film', ops: [{ type: 'saturate', value: 1.2 }, { type: 'hue-rotate', value: -5 }, { type: 'contrast', value: 1.1 }, { type: 'brightness', value: 1.02 }] },
  { id: 'ilford-hp5', name: 'Ilford HP5', category: 'film', ops: [{ type: 'grayscale', value: 1 }, { type: 'contrast', value: 1.2 }, { type: 'brightness', value: 1.05 }] },
  { id: 'cinestill', name: 'CineStill 800T', category: 'film', ops: [{ type: 'hue-rotate', value: -8 }, { type: 'saturate', value: 1.15 }, { type: 'contrast', value: 1.12 }, { type: 'brightness', value: 0.95 }] },
  { id: 'portra-160', name: 'Portra 160', category: 'film', ops: [{ type: 'sepia', value: 0.08 }, { type: 'saturate', value: 0.9 }, { type: 'brightness', value: 1.06 }, { type: 'contrast', value: 0.95 }] },
  { id: 'portra-400', name: 'Portra 400', category: 'film', ops: [{ type: 'sepia', value: 0.12 }, { type: 'saturate', value: 1.05 }, { type: 'brightness', value: 1.05 }, { type: 'contrast', value: 1.02 }] },
  { id: 'portra-800', name: 'Portra 800', category: 'film', ops: [{ type: 'sepia', value: 0.15 }, { type: 'saturate', value: 1.1 }, { type: 'brightness', value: 1.02 }, { type: 'contrast', value: 1.05 }] },
  { id: 'ektar-100', name: 'Ektar 100', category: 'film', ops: [{ type: 'saturate', value: 1.45 }, { type: 'contrast', value: 1.15 }, { type: 'brightness', value: 1.02 }] },
  { id: 'tri-x', name: 'Tri-X 400', category: 'film', ops: [{ type: 'grayscale', value: 1 }, { type: 'contrast', value: 1.3 }, { type: 'brightness', value: 0.95 }] },
  { id: 'velvia', name: 'Velvia 50', category: 'film', ops: [{ type: 'saturate', value: 1.6 }, { type: 'contrast', value: 1.2 }, { type: 'brightness', value: 0.98 }] },
  { id: 'provia', name: 'Provia 100F', category: 'film', ops: [{ type: 'saturate', value: 1.15 }, { type: 'contrast', value: 1.08 }, { type: 'brightness', value: 1.02 }] },
  { id: 'supergold', name: 'Supergold 400', category: 'film', ops: [{ type: 'sepia', value: 0.18 }, { type: 'saturate', value: 1.2 }, { type: 'brightness', value: 1.06 }, { type: 'contrast', value: 1.02 }] },

  // ── Retro ──
  { id: '70s', name: '70s', category: 'retro', ops: [{ type: 'sepia', value: 0.35 }, { type: 'saturate', value: 1.1 }, { type: 'contrast', value: 1.05 }, { type: 'brightness', value: 1.02 }] },
  { id: '80s', name: '80s', category: 'retro', ops: [{ type: 'saturate', value: 1.4 }, { type: 'contrast', value: 1.15 }, { type: 'hue-rotate', value: -8 }, { type: 'brightness', value: 1.02 }] },
  { id: '2000s', name: '2000s', category: 'retro', ops: [{ type: 'contrast', value: 1.1 }, { type: 'saturate', value: 1.3 }, { type: 'brightness', value: 1.05 }] },
  { id: 'analog', name: 'Analog', category: 'retro', ops: [{ type: 'sepia', value: 0.12 }, { type: 'contrast', value: 0.92 }, { type: 'saturate', value: 0.85 }, { type: 'brightness', value: 1.05 }] },
  { id: 'faded-print', name: 'Faded Print', category: 'retro', ops: [{ type: 'contrast', value: 0.85 }, { type: 'saturate', value: 0.7 }, { type: 'brightness', value: 1.08 }, { type: 'sepia', value: 0.15 }] },
  { id: 'daguerreotype', name: 'Daguerreotype', category: 'retro', ops: [{ type: 'sepia', value: 0.6 }, { type: 'contrast', value: 1.2 }, { type: 'saturate', value: 0.5 }, { type: 'brightness', value: 0.95 }] },
  { id: 'technicolor', name: 'Technicolor', category: 'retro', ops: [{ type: 'saturate', value: 1.5 }, { type: 'contrast', value: 1.18 }, { type: 'sepia', value: 0.08 }] },
  { id: 'cross-process', name: 'Cross Process', category: 'retro', ops: [{ type: 'hue-rotate', value: 20 }, { type: 'saturate', value: 1.3 }, { type: 'contrast', value: 1.15 }, { type: 'brightness', value: 1.02 }] },

  // ── Creative ──
  { id: 'neon-nights', name: 'Neon Nights', category: 'creative', ops: [{ type: 'contrast', value: 1.35 }, { type: 'saturate', value: 1.6 }, { type: 'brightness', value: 0.92 }, { type: 'hue-rotate', value: -15 }] },
  { id: 'silver', name: 'Silver', category: 'creative', ops: [{ type: 'grayscale', value: 0.7 }, { type: 'contrast', value: 1.15 }, { type: 'brightness', value: 1.02 }] },
  { id: 'coral', name: 'Coral', category: 'creative', ops: [{ type: 'sepia', value: 0.12 }, { type: 'saturate', value: 1.3 }, { type: 'brightness', value: 1.04 }, { type: 'hue-rotate', value: -5 }] },
  { id: 'cyberpunk', name: 'Cyberpunk', category: 'creative', ops: [{ type: 'contrast', value: 1.4 }, { type: 'saturate', value: 1.5 }, { type: 'hue-rotate', value: -20 }, { type: 'brightness', value: 0.9 }] },
  { id: 'infrared', name: 'Infrared', category: 'creative', ops: [{ type: 'hue-rotate', value: 180 }, { type: 'saturate', value: 1.2 }, { type: 'contrast', value: 1.1 }] },
  { id: 'blueprint', name: 'Blueprint', category: 'creative', ops: [{ type: 'grayscale', value: 0.8 }, { type: 'hue-rotate', value: -30 }, { type: 'contrast', value: 1.2 }, { type: 'brightness', value: 0.95 }] },
  { id: 'aurora', name: 'Aurora', category: 'creative', ops: [{ type: 'hue-rotate', value: 30 }, { type: 'saturate', value: 1.4 }, { type: 'contrast', value: 1.1 }, { type: 'brightness', value: 1.02 }] },
  { id: 'candy', name: 'Candy', category: 'creative', ops: [{ type: 'saturate', value: 1.5 }, { type: 'brightness', value: 1.08 }, { type: 'contrast', value: 1.05 }, { type: 'hue-rotate', value: 15 }] },
  { id: 'matrix', name: 'Matrix', category: 'creative', ops: [{ type: 'hue-rotate', value: 90 }, { type: 'saturate', value: 1.3 }, { type: 'contrast', value: 1.2 }, { type: 'brightness', value: 0.9 }] },
  { id: 'duotone-blue', name: 'Duotone Blue', category: 'creative', ops: [{ type: 'grayscale', value: 1 }, { type: 'sepia', value: 1 }, { type: 'hue-rotate', value: -40 }, { type: 'saturate', value: 1.5 }] },
  { id: 'duotone-purple', name: 'Duotone Purple', category: 'creative', ops: [{ type: 'grayscale', value: 1 }, { type: 'sepia', value: 1 }, { type: 'hue-rotate', value: -60 }, { type: 'saturate', value: 1.3 }] },
  { id: 'radioactive', name: 'Radioactive', category: 'creative', ops: [{ type: 'hue-rotate', value: 60 }, { type: 'saturate', value: 1.6 }, { type: 'contrast', value: 1.3 }, { type: 'brightness', value: 0.95 }] },

  // ── Glow ──
  { id: 'glow-aura', name: 'Aura Glow', category: 'glow', ops: [{ type: 'brightness', value: 1.12 }, { type: 'contrast', value: 0.88 }, { type: 'sepia', value: 0.12 }, { type: 'saturate', value: 1.05 }] },
  { id: 'glow-neon-aura', name: 'Neon Aura', category: 'glow', ops: [{ type: 'saturate', value: 1.4 }, { type: 'brightness', value: 1.1 }, { type: 'hue-rotate', value: 15 }, { type: 'contrast', value: 1.05 }] },
  { id: 'glow-soft', name: 'Soft Glow', category: 'glow', ops: [{ type: 'contrast', value: 0.8 }, { type: 'brightness', value: 1.15 }, { type: 'saturate', value: 0.85 }, { type: 'sepia', value: 0.06 }] },
  { id: 'glow-angel-light', name: 'Angel Light', category: 'glow', ops: [{ type: 'brightness', value: 1.2 }, { type: 'contrast', value: 0.78 }, { type: 'sepia', value: 0.1 }, { type: 'saturate', value: 0.9 }] },
  { id: 'glow-halo', name: 'Halo', category: 'glow', ops: [{ type: 'brightness', value: 1.1 }, { type: 'contrast', value: 0.9 }, { type: 'sepia', value: 0.08 }, { type: 'saturate', value: 0.95 }] },
  { id: 'glow-luminous', name: 'Luminous', category: 'glow', ops: [{ type: 'brightness', value: 1.08 }, { type: 'saturate', value: 1.15 }, { type: 'contrast', value: 0.9 }, { type: 'sepia', value: 0.05 }] },
  { id: 'glow-fairy-dust', name: 'Fairy Dust', category: 'glow', ops: [{ type: 'brightness', value: 1.12 }, { type: 'hue-rotate', value: 10 }, { type: 'contrast', value: 0.88 }, { type: 'saturate', value: 1.05 }] },
  { id: 'glow-radiance', name: 'Radiance', category: 'glow', ops: [{ type: 'brightness', value: 1.1 }, { type: 'sepia', value: 0.12 }, { type: 'saturate', value: 1.15 }, { type: 'contrast', value: 0.95 }] },

  // ── Y2K ──
  { id: 'y2k-cyber-pink', name: 'Cyber Pink', category: 'y2k', ops: [{ type: 'hue-rotate', value: 20 }, { type: 'saturate', value: 1.55 }, { type: 'brightness', value: 1.08 }, { type: 'contrast', value: 1.1 }] },
  { id: 'y2k-digital-lavender', name: 'Digital Lavender', category: 'y2k', ops: [{ type: 'hue-rotate', value: -25 }, { type: 'saturate', value: 1.4 }, { type: 'brightness', value: 1.06 }, { type: 'contrast', value: 1.05 }] },
  { id: 'y2k-bubblegum', name: 'Bubblegum', category: 'y2k', ops: [{ type: 'hue-rotate', value: 12 }, { type: 'saturate', value: 1.5 }, { type: 'brightness', value: 1.1 }, { type: 'contrast', value: 0.92 }] },
  { id: 'y2k-chrome', name: 'Chrome', category: 'y2k', ops: [{ type: 'contrast', value: 1.35 }, { type: 'saturate', value: 0.75 }, { type: 'brightness', value: 1.08 }, { type: 'sepia', value: 0.05 }] },
  { id: 'y2k-pixel-pop', name: 'Pixel Pop', category: 'y2k', ops: [{ type: 'saturate', value: 1.65 }, { type: 'contrast', value: 1.3 }, { type: 'brightness', value: 1.02 }] },
  { id: 'y2k-electric-blue', name: 'Electric Blue', category: 'y2k', ops: [{ type: 'hue-rotate', value: -30 }, { type: 'saturate', value: 1.45 }, { type: 'contrast', value: 1.2 }, { type: 'brightness', value: 1.03 }] },
  { id: 'y2k-candy', name: 'Candy', category: 'y2k', ops: [{ type: 'saturate', value: 1.5 }, { type: 'brightness', value: 1.08 }, { type: 'hue-rotate', value: 8 }, { type: 'contrast', value: 1.08 }] },
  { id: 'y2k-holographic', name: 'Holographic', category: 'y2k', ops: [{ type: 'saturate', value: 1.45 }, { type: 'hue-rotate', value: 25 }, { type: 'brightness', value: 1.05 }, { type: 'contrast', value: 1.1 }] },

  // ── Film Analog ──
  { id: 'film-analog-kodak-gold', name: 'Kodak Gold', category: 'film-analog', ops: [{ type: 'sepia', value: 0.22 }, { type: 'saturate', value: 0.88 }, { type: 'brightness', value: 1.08 }, { type: 'contrast', value: 1.02 }] },
  { id: 'film-analog-fuji-superia', name: 'Fuji Superia', category: 'film-analog', ops: [{ type: 'hue-rotate', value: 12 }, { type: 'saturate', value: 1.1 }, { type: 'contrast', value: 0.95 }, { type: 'brightness', value: 1.04 }] },
  { id: 'film-analog-disposable', name: 'Disposable', category: 'film-analog', ops: [{ type: 'contrast', value: 0.85 }, { type: 'sepia', value: 0.15 }, { type: 'saturate', value: 0.82 }, { type: 'brightness', value: 1.06 }] },
  { id: 'film-analog-expired', name: 'Expired Film', category: 'film-analog', ops: [{ type: 'contrast', value: 0.78 }, { type: 'sepia', value: 0.35 }, { type: 'saturate', value: 0.65 }, { type: 'brightness', value: 1.05 }] },
  { id: 'film-analog-polaroid-fade', name: 'Polaroid Fade', category: 'film-analog', ops: [{ type: 'contrast', value: 0.82 }, { type: 'sepia', value: 0.18 }, { type: 'brightness', value: 1.12 }, { type: 'saturate', value: 0.85 }] },
  { id: 'film-analog-cinestill', name: 'CineStill', category: 'film-analog', ops: [{ type: 'hue-rotate', value: 8 }, { type: 'sepia', value: 0.12 }, { type: 'brightness', value: 0.9 }, { type: 'contrast', value: 1.25 }, { type: 'saturate', value: 1.1 }] },
  { id: 'film-analog-tri-x-400', name: 'Tri-X 400', category: 'film-analog', ops: [{ type: 'grayscale', value: 1 }, { type: 'contrast', value: 1.35 }, { type: 'brightness', value: 0.98 }] },
  { id: 'film-analog-ektachrome', name: 'Ektachrome', category: 'film-analog', ops: [{ type: 'saturate', value: 1.5 }, { type: 'hue-rotate', value: -12 }, { type: 'contrast', value: 1.2 }, { type: 'brightness', value: 1.02 }] },

  // ── Selfie ──
  { id: 'selfie-glass-skin', name: 'Glass Skin', category: 'selfie', ops: [{ type: 'brightness', value: 1.12 }, { type: 'contrast', value: 0.85 }, { type: 'sepia', value: 0.08 }, { type: 'saturate', value: 0.95 }] },
  { id: 'selfie-soft-focus', name: 'Soft Focus', category: 'selfie', ops: [{ type: 'contrast', value: 0.78 }, { type: 'brightness', value: 1.15 }, { type: 'saturate', value: 0.88 }] },
  { id: 'selfie-peach-glow', name: 'Peach Glow', category: 'selfie', ops: [{ type: 'sepia', value: 0.12 }, { type: 'brightness', value: 1.1 }, { type: 'saturate', value: 1.12 }, { type: 'contrast', value: 0.95 }] },
  { id: 'selfie-rose-tint', name: 'Rose Tint', category: 'selfie', ops: [{ type: 'hue-rotate', value: 5 }, { type: 'saturate', value: 1.15 }, { type: 'brightness', value: 1.08 }, { type: 'contrast', value: 0.98 }] },
  { id: 'selfie-sun-kissed', name: 'Sun Kissed', category: 'selfie', ops: [{ type: 'sepia', value: 0.18 }, { type: 'brightness', value: 1.1 }, { type: 'saturate', value: 1.18 }, { type: 'contrast', value: 1.02 }] },
  { id: 'selfie-porcelain', name: 'Porcelain', category: 'selfie', ops: [{ type: 'brightness', value: 1.14 }, { type: 'contrast', value: 0.8 }, { type: 'saturate', value: 0.8 }, { type: 'sepia', value: 0.04 }] },
  { id: 'selfie-honey', name: 'Honey', category: 'selfie', ops: [{ type: 'sepia', value: 0.2 }, { type: 'saturate', value: 1.2 }, { type: 'contrast', value: 1.08 }, { type: 'brightness', value: 1.06 }] },
  { id: 'selfie-dewy', name: 'Dewy', category: 'selfie', ops: [{ type: 'brightness', value: 1.1 }, { type: 'contrast', value: 0.88 }, { type: 'sepia', value: 0.06 }, { type: 'saturate', value: 1.1 }] },

  // ── Viral ──
  { id: 'viral-that-girl', name: 'That Girl', category: 'viral', ops: [{ type: 'brightness', value: 1.1 }, { type: 'sepia', value: 0.06 }, { type: 'saturate', value: 1.08 }, { type: 'contrast', value: 1.05 }] },
  { id: 'viral-coquette', name: 'Coquette', category: 'viral', ops: [{ type: 'hue-rotate', value: 6 }, { type: 'contrast', value: 0.88 }, { type: 'brightness', value: 1.12 }, { type: 'saturate', value: 0.92 }] },
  { id: 'viral-mob-wife', name: 'Mob Wife', category: 'viral', ops: [{ type: 'brightness', value: 0.88 }, { type: 'contrast', value: 1.3 }, { type: 'saturate', value: 0.78 }, { type: 'sepia', value: 0.15 }] },
  { id: 'viral-vanilla-girl', name: 'Vanilla Girl', category: 'viral', ops: [{ type: 'brightness', value: 1.18 }, { type: 'contrast', value: 0.82 }, { type: 'sepia', value: 0.1 }, { type: 'saturate', value: 0.8 }] },
  { id: 'viral-old-money', name: 'Old Money', category: 'viral', ops: [{ type: 'saturate', value: 0.72 }, { type: 'sepia', value: 0.18 }, { type: 'contrast', value: 1.12 }, { type: 'brightness', value: 1.02 }] },
  { id: 'viral-clean-girl', name: 'Clean Girl', category: 'viral', ops: [{ type: 'brightness', value: 1.08 }, { type: 'contrast', value: 1.12 }, { type: 'saturate', value: 0.95 }] },
  { id: 'viral-coastal-cowgirl', name: 'Coastal Cowgirl', category: 'viral', ops: [{ type: 'sepia', value: 0.12 }, { type: 'brightness', value: 1.08 }, { type: 'saturate', value: 1.15 }, { type: 'contrast', value: 1.02 }] },
  { id: 'viral-tomato-girl', name: 'Tomato Girl', category: 'viral', ops: [{ type: 'hue-rotate', value: -8 }, { type: 'saturate', value: 1.4 }, { type: 'brightness', value: 1.08 }, { type: 'contrast', value: 1.05 }] },
  { id: 'viral-quiet-luxury', name: 'Quiet Luxury', category: 'viral', ops: [{ type: 'saturate', value: 0.75 }, { type: 'hue-rotate', value: -8 }, { type: 'contrast', value: 1.1 }, { type: 'brightness', value: 1.04 }] },
  { id: 'viral-dark-feminine', name: 'Dark Feminine', category: 'viral', ops: [{ type: 'brightness', value: 0.85 }, { type: 'contrast', value: 1.28 }, { type: 'saturate', value: 0.82 }, { type: 'sepia', value: 0.14 }] },
]

export interface FramePresetConfig {
  id: string
  name: string
}

export const FRAME_PRESETS: FramePresetConfig[] = [
  { id: 'none', name: 'None' },
  { id: 'simple', name: 'Simple' },
  { id: 'rounded', name: 'Rounded' },
  { id: 'shadow', name: 'Shadow' },
  { id: 'polaroid', name: 'Polaroid' },
  { id: 'film', name: 'Film Strip' },
  { id: 'vintage', name: 'Vintage' },
  { id: 'gradient', name: 'Gradient' },
]

export interface LightLeakPresetConfig {
  id: string
  name: string
}

export const LIGHT_LEAK_PRESETS: LightLeakPresetConfig[] = [
  { id: 'none', name: 'None' },
  { id: 'warm', name: 'Warm' },
  { id: 'cool', name: 'Cool' },
  { id: 'rainbow', name: 'Rainbow' },
  { id: 'flare', name: 'Flare' },
  { id: 'bokeh', name: 'Bokeh' },
]

export interface StickerCategory {
  id: string
  label: string
  emojis: string[]
}

/** Sticker categories and emoji characters for the sticker library */
export const STICKER_CATEGORIES: StickerCategory[] = [
  { id: 'popular', label: 'Popular', emojis: ['😍', '🔥', '✨', '💯', '❤️', '🌟', '💪', '🎉', '👑', '🦋'] },
  { id: 'emoji', label: 'Emoji', emojis: ['😂', '🥺', '😎', '🤩', '🥳', '😜', '🤗', '😱', '🤯', '😤'] },
  { id: 'arrows', label: 'Arrows', emojis: ['➡️', '⬆️', '⬇️', '↗️', '↘️', '↩️', '🔄', '➕', '✖️', '⭕'] },
  { id: 'badges', label: 'Badges', emojis: ['⭐', '🏆', '🎯', '💎', '🔮', '🎁', '🎭', '🎪', '🎨', '🧩'] },
  { id: 'decorative', label: 'Decorative', emojis: ['🌈', '🌸', '🍀', '🌙', '⚡', '🔥', '❄️', '💫', '🌊', '🎶'] },
]

/** Default sticker dimensions when added to canvas */
export const STICKER_DEFAULT_SIZE: number = 60
