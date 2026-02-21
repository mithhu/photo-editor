import { useState, useRef, useMemo } from 'react'
import { removeBackground } from '../utils/backgroundRemoval'
import { detectSubjects, computeSmartCrop } from '../utils/smartCrop'
import { applyStyleTransfer, STYLE_PRESETS } from '../utils/styleTransfer'
import { suggestFilters } from '../utils/filterSuggestions'
import { getStyleImages } from '../utils/styleImages'
import { upscaleImage } from '../utils/upscale'
import { denoiseFromSrc } from '../utils/denoise'

export function AIToolsPanel({ imageSrc, onImageReplace, canvasRef, onApplyChange }) {
  const [bgLoading, setBgLoading] = useState(false)
  const [bgProgress, setBgProgress] = useState(null)
  const [bgError, setBgError] = useState(null)

  const [smartCropLoading, setSmartCropLoading] = useState(false)
  const [smartCropError, setSmartCropError] = useState(null)
  const [detectedCount, setDetectedCount] = useState(null)

  const [styleLoading, setStyleLoading] = useState(false)
  const [styleStatus, setStyleStatus] = useState(null)
  const [styleError, setStyleError] = useState(null)
  const [styleStrength, setStyleStrength] = useState(0.8)

  const [suggestions, setSuggestions] = useState(null)
  const [suggestLoading, setSuggestLoading] = useState(false)

  const [upscaleLoading, setUpscaleLoading] = useState(false)
  const [upscaleStatus, setUpscaleStatus] = useState(null)
  const [upscaleError, setUpscaleError] = useState(null)

  const [denoiseLoading, setDenoiseLoading] = useState(false)
  const [denoiseStrength, setDenoiseStrength] = useState(0.5)
  const [denoiseError, setDenoiseError] = useState(null)

  const styleFileRef = useRef(null)
  const styleImages = useMemo(() => getStyleImages(), [])

  const handleRemoveBackground = async () => {
    if (!imageSrc) return
    setBgLoading(true)
    setBgError(null)
    setBgProgress({ key: 'loading', percent: 0 })
    try {
      const resultUrl = await removeBackground(imageSrc, (progress) => {
        setBgProgress(progress)
      })
      onImageReplace(resultUrl)
    } catch (err) {
      setBgError(err.message || 'Background removal failed')
    } finally {
      setBgLoading(false)
      setBgProgress(null)
    }
  }

  const handleSmartCrop = async () => {
    if (!imageSrc) return
    setSmartCropLoading(true)
    setSmartCropError(null)
    setDetectedCount(null)
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = imageSrc
      await new Promise((resolve, reject) => {
        img.onload = resolve
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
        onApplyChange((s) => ({ ...s, customCrop: crop, cropRatio: 'custom' }))
      }
    } catch (err) {
      setSmartCropError(err.message || 'Detection failed')
    } finally {
      setSmartCropLoading(false)
    }
  }

  const handleStyleTransfer = async (styleUrl) => {
    if (!canvasRef?.current) return
    setStyleLoading(true)
    setStyleError(null)
    setStyleStatus('Starting...')
    try {
      const resultUrl = await applyStyleTransfer(
        canvasRef.current,
        styleUrl,
        styleStrength,
        (status) => setStyleStatus(status)
      )
      onImageReplace(resultUrl)
    } catch (err) {
      setStyleError(err.message || 'Style transfer failed')
    } finally {
      setStyleLoading(false)
      setStyleStatus(null)
    }
  }

  const handleCustomStyleUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    handleStyleTransfer(url)
  }

  const handleUpscale = async () => {
    if (!imageSrc) return
    setUpscaleLoading(true)
    setUpscaleError(null)
    setUpscaleStatus(null)
    try {
      const result = await upscaleImage(imageSrc, setUpscaleStatus)
      onImageReplace(result)
      setUpscaleStatus('Done! Image upscaled 2x.')
    } catch (e) {
      setUpscaleError(e.message || 'Upscaling failed')
    } finally {
      setUpscaleLoading(false)
    }
  }

  const handleDenoise = async () => {
    if (!imageSrc) return
    setDenoiseLoading(true)
    setDenoiseError(null)
    try {
      const result = await denoiseFromSrc(imageSrc, denoiseStrength, () => {})
      onImageReplace(result)
    } catch (e) {
      setDenoiseError(e.message || 'Denoise failed')
    } finally {
      setDenoiseLoading(false)
    }
  }

  const handleSuggestFilters = () => {
    if (!canvasRef?.current) return
    setSuggestLoading(true)
    setTimeout(() => {
      try {
        const results = suggestFilters(canvasRef.current)
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
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">AI Tools</h3>
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
            className="w-full py-2.5 text-sm bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              onChange={(e) => setStyleStrength(Number(e.target.value))}
              className="w-full accent-amber-500"
              disabled={styleLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleStyleTransfer(styleImages[preset.id])}
                disabled={styleLoading || !imageSrc}
                className="group relative overflow-hidden rounded-lg border border-zinc-700 hover:border-amber-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="flex items-center gap-2 bg-amber-500/10 rounded-lg p-2 border border-amber-500/20">
              <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="text-xs text-amber-400">{styleStatus}</span>
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
            onChange={(e) => setDenoiseStrength(Number(e.target.value))}
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
