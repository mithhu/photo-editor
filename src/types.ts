export interface HSLChannel {
  h: number
  s: number
  l: number
}

export interface CurvePoints {
  rgb: [number, number][]
  red: [number, number][]
  green: [number, number][]
  blue: [number, number][]
}

export interface ColorGradeZone {
  r: number
  g: number
  b: number
}

export interface SplitTone {
  highlightHue: number
  highlightSat: number
  shadowHue: number
  shadowSat: number
  balance: number
}

export interface TiltShift {
  mode: string
  position: number
  size: number
  blur: number
}

export interface Frame {
  type: string
  color: string
  width: number
}

export interface Grain {
  amount: number
  size: number
}

export interface SelectiveColor {
  enabled: boolean
  hue: number
  range: number
}

export interface LightLeak {
  type: string
  intensity: number
}

export interface Resize {
  width: number
  height: number
  lockAspect: boolean
}

export interface GradientMap {
  enabled: boolean
  shadows: string
  highlights: string
  intensity: number
}

export interface ChannelMixerChannel {
  r: number
  g: number
  b: number
}

export interface ChannelMixer {
  red: ChannelMixerChannel
  green: ChannelMixerChannel
  blue: ChannelMixerChannel
}

export interface Perspective {
  horizontal: number
  vertical: number
  rotation: number
}

export interface BeautySettings {
  smooth: number
  blemish: number
  evenness: number
  brightenEyes: number
  teethWhiten: number
}

export interface ReshapeSettings {
  slimFace: number
  biggerEyes: number
  noseSlim: number
  jawline: number
}

export interface MakeupItem {
  color: string
  opacity: number
}

export interface MakeupSettings {
  lipstick: MakeupItem
  blush: MakeupItem
  eyeliner: MakeupItem
  eyeshadow: MakeupItem
}

export interface TextOverlay {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  fontFamily: string
  fontWeight: string
  fontStyle: string
  textShadow: boolean
  opacity: number
  rotation: number
  blendMode?: string
  [key: string]: unknown
}

export interface ShapeOverlay {
  id: string | number
  type: string
  x: number
  y: number
  size: number
  color: string
  rotation?: number
  opacity?: number
  blendMode?: string
  emoji?: string
  [key: string]: unknown
}

export interface BrushStroke {
  tool: string
  color: string
  size: number
  opacity: number
  points: { x: number; y: number }[]
}

export interface EditState {
  brightness: number
  contrast: number
  saturation: number
  exposure: number
  highlights: number
  shadows: number
  warmth: number
  tint: number
  vibrance: number
  clarity: number
  dehaze: number
  vignette: number
  rotation: number
  flipH: boolean
  flipV: boolean
  cropRatio: string
  preset: string
  zoom: number
  panX: number
  panY: number
  textOverlays: TextOverlay[]
  shapeOverlays: ShapeOverlay[]
  layerVisibility: Record<string, boolean>
  customCrop: { x: number; y: number; w: number; h: number } | null
  perspective: Perspective
  brushStrokes: BrushStroke[]
  drawingMode: 'brush' | 'eraser' | 'heal' | 'wand' | 'blur' | 'picker' | null
  selectionMask: Uint8Array | null
  wandTolerance: number
  healSource: { x: number; y: number } | null
  brushColor: string
  brushSize: number
  brushOpacity: number
  hsl: Record<string, HSLChannel>
  curves: CurvePoints
  colorGrade: {
    shadows: ColorGradeZone
    midtones: ColorGradeZone
    highlights: ColorGradeZone
  }
  splitTone: SplitTone
  masks: unknown[]
  filmEmulation: string | null
  filmIntensity: number
  filmGrain: number
  tiltShift: TiltShift
  frame: Frame
  pickedColor: string | null
  grain: Grain
  selectiveColor: SelectiveColor
  lightLeak: LightLeak
  lut: unknown
  lutName: string | null
  resize: Resize
  gradientMap: GradientMap
  chromaticAberration: number
  sharpen: number
  glitch: number
  oilPaint: number
  posterize: number
  solarize: number
  emboss: number
  channelMixer: ChannelMixer
  beauty: BeautySettings
  faceReshape: ReshapeSettings
  makeup: MakeupSettings
}

export interface FaceKeypoint {
  x: number
  y: number
  z?: number
  name?: string
}

export interface DetectedFace {
  keypoints: FaceKeypoint[]
}

export interface FilterPreset {
  id: string
  name: string
  category?: string
  settings: Partial<EditState>
}

export interface FramePreset {
  id: string
  name: string
  type: string
  color: string
  width: number
}
