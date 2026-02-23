import { useState, useRef, useMemo, useCallback, type RefObject, type ChangeEvent } from 'react'
import { removeBackground } from '../utils/backgroundRemoval'
import {
  SOLID_COLORS, GRADIENT_PRESETS, SCENE_PRESETS,
  replaceBackgroundSolid, replaceBackgroundGradient, replaceBackgroundScene, replaceBackgroundBlur,
  type GradientConfig,
} from '../utils/backgroundReplace'
import { detectSubjects, computeSmartCrop } from '../utils/smartCrop'
import { usePortraitCrop } from '../hooks/usePortraitCrop'
import { applyStyleTransfer, STYLE_PRESETS } from '../utils/styleTransfer'
import { suggestFilters } from '../utils/filterSuggestions'
import { getStyleImages } from '../utils/styleImages'
import { upscaleImage } from '../utils/upscale'
import { denoiseFromSrc } from '../utils/denoise'
import type { EditState } from '../types'

interface BgProgress {
  key: string
  percent: number
}

interface FilterSuggestion {
  filter: string
  reason: string
  confidence: number
  preset: string
}

interface AIToolsPanelProps {
  imageSrc: string | null
  onImageReplace: (dataUrl: string) => void
  canvasRef?: RefObject<HTMLCanvasElement | null>
  onApplyChange?: (updater: ((prev: EditState) => EditState) | Partial<EditState>) => void
}

export function AIToolsPanel({ imageSrc, onImageReplace, canvasRef, onApplyChange }: AIToolsPanelProps): React.JSX.Element {
  const [bgLoading, setBgLoading] = useState<boolean>(false)
  const [bgProgress, setBgProgress] = useState<BgProgress | null>(null)
  const [bgError, setBgError] = useState<string | null>(null)

  const [smartCropLoading, setSmartCropLoading] = useState<boolean>(false)
  const [smartCropError, setSmartCropError] = useState<string | null>(null)
  const [detectedCount, setDetectedCount] = useState<number | null>(null)

  const {
    handlePortraitCrop,
    loading: portraitCropLoading,
    error: portraitCropError,
    faceCount: portraitFaceCount,
  } = usePortraitCrop(imageSrc, onApplyChange!)

  const [styleLoading, setStyleLoading] = useState<boolean>(false)
  const [styleStatus, setStyleStatus] = useState<string | null>(null)
  const [styleError, setStyleError] = useState<string | null>(null)
  const [styleStrength, setStyleStrength] = useState<number>(0.8)

  const [suggestions, setSuggestions] = useState<FilterSuggestion[] | null>(null)
  const [suggestLoading, setSuggestLoading] = useState<boolean>(false)

  const [upscaleLoading, setUpscaleLoading] = useState<boolean>(false)
  const [upscaleStatus, setUpscaleStatus] = useState<string | null>(null)
  const [upscaleError, setUpscaleError] = useState<string | null>(null)

  const [denoiseLoading, setDenoiseLoading] = useState<boolean>(false)
  const [denoiseStrength, setDenoiseStrength] = useState<number>(0.5)
  const [denoiseError, setDenoiseError] = useState<string | null>(null)

  const [bgRemovedUrl, setBgRemovedUrl] = useState<string | null>(null)
  const [bgReplaceTab, setBgReplaceTab] = useState<'solid' | 'gradient' | 'scene' | 'blur'>('solid')
  const [bgReplaceLoading, setBgReplaceLoading] = useState<boolean>(false)
  const [blurAmount, setBlurAmount] = useState<number>(20)
  const [customColor, setCustomColor] = useState<string>('#3b82f6')
  const originalSrcRef = useRef<string | null>(imageSrc)

  const styleFileRef = useRef<HTMLInputElement>(null)
  const styleImages = useMemo(() => getStyleImages(), [])

  const handleRemoveBackground = async (): Promise<void> => {
    if (!imageSrc) return
    originalSrcRef.current = imageSrc
    setBgLoading(true)
    setBgError(null)
    setBgProgress({ key: 'loading', percent: 0 })
    try {
      const resultUrl = await removeBackground(imageSrc, (progress) => {
        setBgProgress(progress)
      })
      setBgRemovedUrl(resultUrl)
      onImageReplace(resultUrl)
    } catch (err: unknown) {
      setBgError(err instanceof Error ? err.message : 'Background removal failed')
    } finally {
      setBgLoading(false)
      setBgProgress(null)
    }
  }

  const applyBgReplace = useCallback(async (type: string, value: string | GradientConfig | { id: string; name: string; colors: string[]; angle: number }) => {
    if (!bgRemovedUrl) return
    setBgReplaceLoading(true)
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = bgRemovedUrl })
      const fgCanvas = document.createElement('canvas')
      fgCanvas.width = img.naturalWidth
      fgCanvas.height = img.naturalHeight
      fgCanvas.getContext('2d')!.drawImage(img, 0, 0)

      let result: string
      if (type === 'solid') {
        result = replaceBackgroundSolid(fgCanvas, value as string)
      } else if (type === 'gradient') {
        result = replaceBackgroundGradient(fgCanvas, value as GradientConfig)
      } else if (type === 'scene') {
        result = replaceBackgroundScene(fgCanvas, value as { id: string; name: string; colors: string[]; angle: number })
      } else {
        result = await replaceBackgroundBlur(fgCanvas, originalSrcRef.current || '', blurAmount)
      }
      onImageReplace(result)
    } catch {
      setBgError('Background replacement failed')
    } finally {
      setBgReplaceLoading(false)
    }
  }, [bgRemovedUrl, blurAmount, onImageReplace])

  const handleSmartCrop = async (): Promise<void> => {
    if (!imageSrc) return
    setSmartCropLoading(true)
    setSmartCropError(null)
    setDetectedCount(null)
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = imageSrc
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image for detection'))
      })
      const predictions = await detectSubjects(img)
      if (predictions.length === 0) {
        setSmartCropError('No subjects detected')
        return
      }
      setDetectedCount(predictions.length)
      const crop = computeSmartCrop(predictions, img.naturalWidth, img.naturalHeight)
      if (crop) {
        onApplyChange?.((s) => ({ ...s, customCrop: crop, cropRatio: 'custom' }))
      }
    } catch (err: unknown) {
      setSmartCropError(err instanceof Error ? err.message : 'Detection failed')
    } finally {
      setSmartCropLoading(false)
    }
  }

  const handleStyleTransfer = async (styleUrl: string): Promise<void> => {
    if (!canvasRef?.current) return
    setStyleLoading(true)
    setStyleError(null)
    setStyleStatus('Starting...')
    try {
      const resultUrl = await applyStyleTransfer(
        canvasRef.current,
        styleUrl,
        styleStrength,
        (status: string) => setStyleStatus(status)
      )
      onImageReplace(resultUrl)
    } catch (err: unknown) {
      setStyleError(err instanceof Error ? err.message : 'Style transfer failed')
    } finally {
      setStyleLoading(false)
      setStyleStatus(null)
    }
  }

  const handleCustomStyleUpload = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    handleStyleTransfer(url)
  }

  const handleUpscale = async (): Promise<void> => {
    if (!imageSrc) return
    setUpscaleLoading(true)
    setUpscaleError(null)
    setUpscaleStatus('Preparing...')
    try {
      const result = await upscaleImage(imageSrc, setUpscaleStatus)
      onImageReplace(result)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upscaling failed'
      if (msg.includes('array length') || msg.includes('memory') || msg.includes('OOM')) {
        setUpscaleError('Image too large to upscale. Try cropping or resizing first.')
      } else {
        setUpscaleError(msg)
      }
      setUpscaleStatus(null)
    } finally {
      setUpscaleLoading(false)
    }
  }

  const handleDenoise = async (): Promise<void> => {
    if (!imageSrc) return
    setDenoiseLoading(true)
    setDenoiseError(null)
    try {
      const result = await denoiseFromSrc(imageSrc, denoiseStrength, () => {})
      onImageReplace(result)
    } catch (e: unknown) {
      setDenoiseError(e instanceof Error ? e.message : 'Denoise failed')
    } finally {
      setDenoiseLoading(false)
    }
  }

  const handleSuggestFilters = (): void => {
    if (!canvasRef?.current) return
    setSuggestLoading(true)
    setTimeout(() => {
      try {
        const results = suggestFilters(canvasRef.current!)
        setSuggestions(results)
      } catch {
        setSuggestions(null)
      } finally {
        setSuggestLoading(false)
      }
    }, 50)
  }

  return (
    <div className="space-y-4">
      {/* Background Removal */}
      <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
        <h3 data-tour="ai" className="text-sm font-semibold text-zinc-300 mb-2">AI Tools</h3>
        <p className="text-[10px] text-zinc-500 mb-3">
          AI features run entirely in your browser. First use downloads models (~10-50 MB).
        </p>

        <div className="space-y-3">
          <button
            onClick={handleRemoveBackground}
            disabled={bgLoading || !imageSrc}
            className="w-full py-2.5 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bgLoading ? 'Processing...' : 'Remove Background'}
          </button>

          {bgProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">{bgProgress.key}</span>
                <span className="text-zinc-300">{bgProgress.percent}%</span>
              </div>
              <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${bgProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          {bgError && (
            <div className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
              {bgError}
            </div>
          )}
        </div>
      </div>

      {/* Background Replacement */}
      {bgRemovedUrl && (
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">Replace Background</h3>
          <p className="text-[10px] text-zinc-500 mb-3">Choose a new background for your image.</p>

          <div className="flex gap-1 mb-3">
            {([
              { id: 'solid' as const, label: 'Solid' },
              { id: 'gradient' as const, label: 'Gradient' },
              { id: 'scene' as const, label: 'Scene' },
              { id: 'blur' as const, label: 'Blur' },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setBgReplaceTab(tab.id)}
                className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  bgReplaceTab === tab.id ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {bgReplaceLoading && (
            <div className="flex items-center justify-center py-3 text-xs text-purple-400 animate-pulse">Applying...</div>
          )}

          {bgReplaceTab === 'solid' && (
            <div className="space-y-2">
              <div className="grid grid-cols-8 gap-1.5">
                {SOLID_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => applyBgReplace('solid', c.color)}
                    disabled={bgReplaceLoading}
                    title={c.name}
                    className="w-full aspect-square rounded-lg border-2 border-zinc-700 hover:border-purple-500 transition-colors disabled:opacity-50"
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                />
                <button
                  onClick={() => applyBgReplace('solid', customColor)}
                  disabled={bgReplaceLoading}
                  className="flex-1 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  Apply Custom Color
                </button>
              </div>
            </div>
          )}

          {bgReplaceTab === 'gradient' && (
            <div className="grid grid-cols-4 gap-2">
              {GRADIENT_PRESETS.map((g) => {
                const angle = g.config.angle
                const bgStyle = `linear-gradient(${angle}deg, ${g.config.color1}, ${g.config.color2})`
                return (
                  <button
                    key={g.id}
                    onClick={() => applyBgReplace('gradient', g.config)}
                    disabled={bgReplaceLoading}
                    title={g.name}
                    className="flex flex-col items-center gap-1 group disabled:opacity-50"
                  >
                    <div
                      className="w-full aspect-square rounded-lg border-2 border-zinc-700 group-hover:border-purple-500 transition-colors"
                      style={{ background: bgStyle }}
                    />
                    <span className="text-[9px] text-zinc-500 group-hover:text-zinc-300">{g.name}</span>
                  </button>
                )
              })}
            </div>
          )}

          {bgReplaceTab === 'scene' && (
            <div className="grid grid-cols-4 gap-2">
              {SCENE_PRESETS.map((s) => {
                const stops = s.colors.map((c, i) => `${c} ${(i / Math.max(1, s.colors.length - 1)) * 100}%`).join(', ')
                const bgStyle = `linear-gradient(${s.angle}deg, ${stops})`
                return (
                  <button
                    key={s.id}
                    onClick={() => applyBgReplace('scene', s)}
                    disabled={bgReplaceLoading}
                    title={s.name}
                    className="flex flex-col items-center gap-1 group disabled:opacity-50"
                  >
                    <div
                      className="w-full aspect-square rounded-lg border-2 border-zinc-700 group-hover:border-purple-500 transition-colors"
                      style={{ background: bgStyle }}
                    />
                    <span className="text-[9px] text-zinc-500 group-hover:text-zinc-300">{s.name}</span>
                  </button>
                )
              })}
            </div>
          )}

          {bgReplaceTab === 'blur' && (
            <div className="space-y-3">
              <p className="text-[10px] text-zinc-500">Blur the original background behind the subject.</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Blur Amount</span>
                  <span className="text-zinc-300">{blurAmount}px</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={1}
                  value={blurAmount}
                  onChange={(e) => setBlurAmount(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none accent-purple-500 cursor-pointer"
                />
              </div>
              <button
                onClick={() => applyBgReplace('blur', '')}
                disabled={bgReplaceLoading}
                className="w-full py-2 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors disabled:opacity-50"
              >
                {bgReplaceLoading ? 'Applying...' : 'Apply Blurred Background'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Smart Auto-Crop */}
      <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Smart Crop</h3>
        <p className="text-[10px] text-zinc-500 mb-3">
          Uses object detection to find subjects and crop around them.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleSmartCrop}
            disabled={smartCropLoading || !imageSrc}
            className="w-full py-2.5 text-sm bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {smartCropLoading ? 'Detecting subjects...' : 'Smart Crop'}
          </button>

          {detectedCount !== null && (
            <p className="text-xs text-emerald-400">
              {detectedCount} subject{detectedCount !== 1 ? 's' : ''} detected — crop applied
            </p>
          )}

          {smartCropError && (
            <div className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
              {smartCropError}
            </div>
          )}

          <button
            onClick={handlePortraitCrop}
            disabled={portraitCropLoading || !imageSrc}
            className="w-full py-2.5 text-sm bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {portraitCropLoading ? 'Detecting faces...' : 'Portrait Crop'}
          </button>

          {portraitFaceCount !== null && (
            <p className="text-xs text-emerald-400">
              {portraitFaceCount} face{portraitFaceCount !== 1 ? 's' : ''} detected — crop applied
            </p>
          )}

          {portraitCropError && (
            <div className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
              {portraitCropError}
            </div>
          )}
        </div>
      </div>

      {/* Style Transfer */}
      <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Style Transfer</h3>
        <p className="text-[10px] text-zinc-500 mb-3">
          Apply the visual style of famous paintings to your photo. First use downloads ~12 MB of models.
        </p>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400">Strength</span>
              <span className="text-zinc-300">{Math.round(styleStrength * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={styleStrength}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStyleStrength(Number(e.target.value))}
              className="w-full accent-indigo-500"
              disabled={styleLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleStyleTransfer(styleImages[preset.id])}
                disabled={styleLoading || !imageSrc}
                className="group relative overflow-hidden rounded-lg border border-zinc-700 hover:border-indigo-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img
                  src={styleImages[preset.id]}
                  alt={preset.name}
                  className="w-full h-12 object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 text-[10px] text-zinc-200 font-medium">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>

          <div>
            <input
              ref={styleFileRef}
              type="file"
              accept="image/*"
              onChange={handleCustomStyleUpload}
              className="hidden"
            />
            <button
              onClick={() => styleFileRef.current?.click()}
              disabled={styleLoading || !imageSrc}
              className="w-full py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload Custom Style
            </button>
          </div>

          {styleStatus && (
            <div className="flex items-center gap-2 bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20">
              <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="text-xs text-indigo-400">{styleStatus}</span>
            </div>
          )}

          {styleError && (
            <div className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
              {styleError}
            </div>
          )}
        </div>
      </div>

      {/* Upscale */}
      <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Upscale (2x)</h3>
        <p className="text-[10px] text-zinc-500 mb-3">
          Double your image resolution using AI. First use downloads a model (~5 MB).
        </p>
        <button
          onClick={handleUpscale}
          disabled={upscaleLoading || !imageSrc}
          className="w-full py-2.5 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {upscaleLoading ? 'Upscaling...' : 'Upscale 2x'}
        </button>
        {upscaleStatus && (
          <div className="mt-2 flex items-center gap-2 bg-blue-500/10 rounded-lg p-2 border border-blue-500/20">
            {upscaleLoading && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />}
            <span className="text-xs text-blue-400">{upscaleStatus}</span>
          </div>
        )}
        {upscaleError && (
          <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-2 border border-red-500/20">{upscaleError}</div>
        )}
      </div>

      {/* Denoise */}
      <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Denoise</h3>
        <p className="text-[10px] text-zinc-500 mb-3">
          Reduce noise from low-light or high-ISO photos.
        </p>
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-400">Strength</span>
            <span className="text-zinc-300">{Math.round(denoiseStrength * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={denoiseStrength}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDenoiseStrength(Number(e.target.value))}
            className="w-full accent-cyan-500"
            disabled={denoiseLoading}
          />
        </div>
        <button
          onClick={handleDenoise}
          disabled={denoiseLoading || !imageSrc}
          className="w-full py-2.5 text-sm bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {denoiseLoading ? 'Processing...' : 'Reduce Noise'}
        </button>
        {denoiseError && (
          <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-2 border border-red-500/20">{denoiseError}</div>
        )}
      </div>

      {/* Filter Suggestions */}
      <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
        <h4 className="text-xs text-zinc-400 font-medium mb-2">Filter Suggestions</h4>
        <button
          onClick={handleSuggestFilters}
          disabled={suggestLoading}
          className="w-full py-2 text-sm bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors disabled:opacity-50"
        >
          {suggestLoading ? 'Analyzing...' : 'Analyze Image'}
        </button>
        {suggestions && (
          <div className="mt-2 space-y-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onApplyChange?.((state) => ({ ...state, preset: s.preset }))}
                className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-left"
              >
                <span className="text-xs text-zinc-200 font-medium capitalize">{s.filter}</span>
                <span className="text-xs text-zinc-500 flex-1">{s.reason}</span>
                <span className="text-xs text-emerald-400">{Math.round(s.confidence * 100)}%</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
