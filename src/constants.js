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
  brushStrokes: [],
  drawingMode: null, // 'brush' | 'eraser' | null
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
  { id: 'none', name: 'None', ops: [] },
  { id: 'vivid', name: 'Vivid', ops: [{ type: 'saturate', value: 1.4 }, { type: 'contrast', value: 1.1 }] },
  { id: 'warm', name: 'Warm', ops: [{ type: 'sepia', value: 0.2 }, { type: 'saturate', value: 1.2 }, { type: 'brightness', value: 1.05 }] },
  { id: 'cool', name: 'Cool', ops: [{ type: 'saturate', value: 0.9 }, { type: 'hue-rotate', value: -10 }] },
  { id: 'bw', name: 'B&W', ops: [{ type: 'grayscale', value: 1 }, { type: 'contrast', value: 1.1 }] },
  { id: 'dramatic', name: 'Dramatic', ops: [{ type: 'contrast', value: 1.3 }, { type: 'saturate', value: 1.2 }] },
  { id: 'golden-hour', name: 'Golden Hour', ops: [{ type: 'sepia', value: 0.3 }, { type: 'saturate', value: 1.2 }, { type: 'brightness', value: 1.1 }, { type: 'contrast', value: 1.05 }] },
  { id: 'cinematic', name: 'Cinematic', ops: [{ type: 'contrast', value: 1.2 }, { type: 'saturate', value: 0.8 }, { type: 'brightness', value: 0.95 }] },
  { id: 'vintage', name: 'Vintage', ops: [{ type: 'sepia', value: 0.5 }, { type: 'contrast', value: 1.1 }, { type: 'saturate', value: 0.9 }] },
  { id: 'moody', name: 'Moody', ops: [{ type: 'contrast', value: 1.25 }, { type: 'saturate', value: 0.85 }, { type: 'brightness', value: 0.9 }] },
  { id: 'dreamy', name: 'Dreamy', ops: [{ type: 'contrast', value: 0.9 }, { type: 'saturate', value: 0.85 }, { type: 'brightness', value: 1.08 }] },
  { id: 'clarendon', name: 'Clarendon', ops: [{ type: 'contrast', value: 1.2 }, { type: 'saturate', value: 1.35 }] },
  { id: 'juno', name: 'Juno', ops: [{ type: 'sepia', value: 0.15 }, { type: 'contrast', value: 1.15 }, { type: 'saturate', value: 1.25 }, { type: 'brightness', value: 1.05 }] },
  { id: 'fade', name: 'Fade', ops: [{ type: 'contrast', value: 0.9 }, { type: 'saturate', value: 0.85 }] },
  { id: 'noir', name: 'Noir', ops: [{ type: 'grayscale', value: 1 }, { type: 'contrast', value: 1.35 }, { type: 'brightness', value: 0.9 }] },
  { id: 'teal-orange', name: 'Teal & Orange', ops: [{ type: 'sepia', value: 0.25 }, { type: 'hue-rotate', value: -10 }, { type: 'contrast', value: 1.15 }, { type: 'saturate', value: 1.1 }] },
  { id: 'y2k', name: 'Y2K', ops: [{ type: 'contrast', value: 1.2 }, { type: 'saturate', value: 1.5 }, { type: 'brightness', value: 1.02 }] },
  { id: 'vhs', name: 'VHS / Retro', ops: [{ type: 'saturate', value: 0.6 }, { type: 'contrast', value: 1.1 }, { type: 'brightness', value: 0.95 }, { type: 'hue-rotate', value: -5 }] },
]
