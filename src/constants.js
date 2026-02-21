export const INITIAL_EDIT_STATE = {
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
  layerVisibility: {}, // { [layerId]: boolean } — defaults to true if not present
  customCrop: null, // { x, y, w, h } in 0-1 coords or null for preset crop
  perspective: { horizontal: 0, vertical: 0, rotation: 0 }, // transform: skew ±45°, fine rotation ±180°
  brushStrokes: [],
  drawingMode: null, // 'brush' | 'eraser' | 'heal' | 'wand' | 'blur' | null
  selectionMask: null, // Uint8Array or null
  wandTolerance: 32,
  healSource: null, // { x, y } in 0-1 canvas coords — set on first click in heal mode
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
  filmEmulation: null, // film emulation preset id (e.g. 'koji', 'portra')
  filmIntensity: 1, // 0-1 blend strength
  filmGrain: 0, // 0-1 grain amount
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
  chromaticAberration: 0, // 0-20 pixel shift
  sharpen: 0, // 0-100 sharpen amount
  glitch: 0, // 0-100 glitch intensity
  oilPaint: 0, // 0-10 oil paint radius
  posterize: 0, // 0 = off, 2-20 = number of color levels
  solarize: 0, // 0 = off, 1-255 = threshold
  emboss: 0, // 0-100 emboss intensity
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
}

/** Font options for text overlays. Defaults: fontFamily 'sans-serif', fontWeight 'normal', fontStyle 'normal', textShadow false, opacity 1, rotation 0 */
export const TEXT_OVERLAY_FONTS = [
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

export const FILTER_PRESETS = [
  { id: 'none', name: 'None', category: 'all', ops: [] },
  { id: 'vivid', name: 'Vivid', category: 'popular', ops: [{ type: 'saturate', value: 1.4 }, { type: 'contrast', value: 1.1 }] },
  { id: 'warm', name: 'Warm', category: 'popular', ops: [{ type: 'sepia', value: 0.2 }, { type: 'saturate', value: 1.2 }, { type: 'brightness', value: 1.05 }] },
  { id: 'cool', name: 'Cool', category: 'popular', ops: [{ type: 'saturate', value: 0.9 }, { type: 'hue-rotate', value: -10 }] },
  { id: 'bw', name: 'B&W', category: 'popular', ops: [{ type: 'grayscale', value: 1 }, { type: 'contrast', value: 1.1 }] },
  { id: 'dramatic', name: 'Dramatic', category: 'popular', ops: [{ type: 'contrast', value: 1.3 }, { type: 'saturate', value: 1.2 }] },
  { id: 'golden-hour', name: 'Golden Hour', category: 'popular', ops: [{ type: 'sepia', value: 0.3 }, { type: 'saturate', value: 1.2 }, { type: 'brightness', value: 1.1 }, { type: 'contrast', value: 1.05 }] },
  { id: 'cinematic', name: 'Cinematic', category: 'mood', ops: [{ type: 'contrast', value: 1.2 }, { type: 'saturate', value: 0.8 }, { type: 'brightness', value: 0.95 }] },
  { id: 'vintage', name: 'Vintage', category: 'mood', ops: [{ type: 'sepia', value: 0.5 }, { type: 'contrast', value: 1.1 }, { type: 'saturate', value: 0.9 }] },
  { id: 'moody', name: 'Moody', category: 'mood', ops: [{ type: 'contrast', value: 1.25 }, { type: 'saturate', value: 0.85 }, { type: 'brightness', value: 0.9 }] },
  { id: 'dreamy', name: 'Dreamy', category: 'mood', ops: [{ type: 'contrast', value: 0.9 }, { type: 'saturate', value: 0.85 }, { type: 'brightness', value: 1.08 }] },
  { id: 'fade', name: 'Fade', category: 'mood', ops: [{ type: 'contrast', value: 0.9 }, { type: 'saturate', value: 0.85 }] },
  { id: 'noir', name: 'Noir', category: 'mood', ops: [{ type: 'grayscale', value: 1 }, { type: 'contrast', value: 1.35 }, { type: 'brightness', value: 0.9 }] },
  { id: 'clarendon', name: 'Clarendon', category: 'style', ops: [{ type: 'contrast', value: 1.2 }, { type: 'saturate', value: 1.35 }] },
  { id: 'juno', name: 'Juno', category: 'style', ops: [{ type: 'sepia', value: 0.15 }, { type: 'contrast', value: 1.15 }, { type: 'saturate', value: 1.25 }, { type: 'brightness', value: 1.05 }] },
  { id: 'teal-orange', name: 'Teal & Orange', category: 'style', ops: [{ type: 'sepia', value: 0.25 }, { type: 'hue-rotate', value: -10 }, { type: 'contrast', value: 1.15 }, { type: 'saturate', value: 1.1 }] },
  { id: 'y2k', name: 'Y2K', category: 'style', ops: [{ type: 'contrast', value: 1.2 }, { type: 'saturate', value: 1.5 }, { type: 'brightness', value: 1.02 }] },
  { id: 'vhs', name: 'VHS / Retro', category: 'style', ops: [{ type: 'saturate', value: 0.6 }, { type: 'contrast', value: 1.1 }, { type: 'brightness', value: 0.95 }, { type: 'hue-rotate', value: -5 }] },
  { id: 'soft-glow', name: 'Soft Glow', category: 'aesthetic', ops: [{ type: 'brightness', value: 1.06 }, { type: 'contrast', value: 0.92 }, { type: 'saturate', value: 0.9 }, { type: 'sepia', value: 0.08 }] },
  { id: 'pastel-dream', name: 'Pastel Dream', category: 'aesthetic', ops: [{ type: 'contrast', value: 0.85 }, { type: 'saturate', value: 0.75 }, { type: 'brightness', value: 1.12 }, { type: 'sepia', value: 0.1 }] },
  { id: 'rose-gold', name: 'Rose Gold', category: 'aesthetic', ops: [{ type: 'sepia', value: 0.2 }, { type: 'saturate', value: 1.1 }, { type: 'brightness', value: 1.05 }, { type: 'hue-rotate', value: 5 }] },
  { id: 'honey', name: 'Honey', category: 'aesthetic', ops: [{ type: 'sepia', value: 0.25 }, { type: 'saturate', value: 1.15 }, { type: 'brightness', value: 1.08 }, { type: 'contrast', value: 1.05 }] },
  { id: 'lavender-haze', name: 'Lavender Haze', category: 'aesthetic', ops: [{ type: 'saturate', value: 0.85 }, { type: 'brightness', value: 1.04 }, { type: 'hue-rotate', value: 15 }, { type: 'contrast', value: 0.95 }] },
  { id: 'peach-fuzz', name: 'Peach Fuzz', category: 'aesthetic', ops: [{ type: 'sepia', value: 0.15 }, { type: 'saturate', value: 1.05 }, { type: 'brightness', value: 1.06 }, { type: 'hue-rotate', value: 3 }] },
  { id: 'disposable-cam', name: 'Disposable Cam', category: 'trending', ops: [{ type: 'contrast', value: 0.88 }, { type: 'saturate', value: 0.7 }, { type: 'brightness', value: 1.1 }, { type: 'sepia', value: 0.12 }, { type: 'hue-rotate', value: 8 }] },
  { id: '90s-cam', name: '90s Cam', category: 'trending', ops: [{ type: 'sepia', value: 0.18 }, { type: 'contrast', value: 1.1 }, { type: 'saturate', value: 0.8 }, { type: 'brightness', value: 0.98 }] },
  { id: 'polaroid-filter', name: 'Polaroid', category: 'trending', ops: [{ type: 'sepia', value: 0.15 }, { type: 'brightness', value: 1.08 }, { type: 'contrast', value: 0.95 }, { type: 'saturate', value: 1.1 }] },
  { id: 'lo-fi', name: 'Lo-Fi', category: 'trending', ops: [{ type: 'contrast', value: 1.3 }, { type: 'saturate', value: 1.4 }, { type: 'brightness', value: 0.95 }] },
  { id: 'indie-kid', name: 'Indie Kid', category: 'trending', ops: [{ type: 'sepia', value: 0.1 }, { type: 'saturate', value: 0.9 }, { type: 'contrast', value: 1.05 }, { type: 'brightness', value: 1.02 }, { type: 'hue-rotate', value: -8 }] },
  { id: 'clean-girl', name: 'Clean Girl', category: 'trending', ops: [{ type: 'brightness', value: 1.06 }, { type: 'contrast', value: 1.08 }, { type: 'saturate', value: 0.92 }] },
  { id: 'neon-nights', name: 'Neon Nights', category: 'creative', ops: [{ type: 'contrast', value: 1.35 }, { type: 'saturate', value: 1.6 }, { type: 'brightness', value: 0.92 }, { type: 'hue-rotate', value: -15 }] },
  { id: 'silver', name: 'Silver', category: 'creative', ops: [{ type: 'grayscale', value: 0.7 }, { type: 'contrast', value: 1.15 }, { type: 'brightness', value: 1.02 }] },
  { id: 'coral', name: 'Coral', category: 'creative', ops: [{ type: 'sepia', value: 0.12 }, { type: 'saturate', value: 1.3 }, { type: 'brightness', value: 1.04 }, { type: 'hue-rotate', value: -5 }] },
]

export const FRAME_PRESETS = [
  { id: 'none', name: 'None' },
  { id: 'simple', name: 'Simple' },
  { id: 'rounded', name: 'Rounded' },
  { id: 'shadow', name: 'Shadow' },
  { id: 'polaroid', name: 'Polaroid' },
  { id: 'film', name: 'Film Strip' },
  { id: 'vintage', name: 'Vintage' },
  { id: 'gradient', name: 'Gradient' },
]

export const LIGHT_LEAK_PRESETS = [
  { id: 'none', name: 'None' },
  { id: 'warm', name: 'Warm' },
  { id: 'cool', name: 'Cool' },
  { id: 'rainbow', name: 'Rainbow' },
  { id: 'flare', name: 'Flare' },
  { id: 'bokeh', name: 'Bokeh' },
]

/** Sticker categories and emoji characters for the sticker library */
export const STICKER_CATEGORIES = [
  { id: 'popular', label: 'Popular', emojis: ['😍', '🔥', '✨', '💯', '❤️', '🌟', '💪', '🎉', '👑', '🦋'] },
  { id: 'emoji', label: 'Emoji', emojis: ['😂', '🥺', '😎', '🤩', '🥳', '😜', '🤗', '😱', '🤯', '😤'] },
  { id: 'arrows', label: 'Arrows', emojis: ['➡️', '⬆️', '⬇️', '↗️', '↘️', '↩️', '🔄', '➕', '✖️', '⭕'] },
  { id: 'badges', label: 'Badges', emojis: ['⭐', '🏆', '🎯', '💎', '🔮', '🎁', '🎭', '🎪', '🎨', '🧩'] },
  { id: 'decorative', label: 'Decorative', emojis: ['🌈', '🌸', '🍀', '🌙', '⚡', '🔥', '❄️', '💫', '🌊', '🎶'] },
]

/** Default sticker dimensions when added to canvas */
export const STICKER_DEFAULT_SIZE = 60
