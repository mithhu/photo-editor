import { useState, useCallback, useRef, type RefObject } from 'react'
import { detectImageMood, type MoodResult } from '../utils/moodDetector'
import { MOOD_QUOTES, MOOD_LABELS, ALL_MOODS, getQuotesByMood, type MoodCategory, type MoodQuote } from '../data/moodQuotes'
import type { FaceKeypoint, EditState, TextOverlay } from '../types'

interface MoodQuotesPanelProps {
  canvasRef: RefObject<HTMLCanvasElement | null>
  faceKeypoints: FaceKeypoint[] | null
  onUpdate: (changes: Partial<EditState>) => void
  textOverlays: TextOverlay[]
}

const QUOTE_STYLES: { id: string; label: string; font: string; weight: string; color: string; shadow: boolean; size: number }[] = [
  { id: 'bold-white', label: 'Bold White', font: 'sans-serif', weight: 'bold', color: '#ffffff', shadow: true, size: 28 },
  { id: 'elegant', label: 'Elegant', font: 'Georgia, serif', weight: 'normal', color: '#f5f0e8', shadow: true, size: 26 },
  { id: 'neon-pink', label: 'Neon Pink', font: 'sans-serif', weight: 'bold', color: '#ff6eb4', shadow: true, size: 28 },
  { id: 'minimal', label: 'Minimal', font: 'Helvetica, Arial, sans-serif', weight: 'normal', color: '#e0e0e0', shadow: false, size: 22 },
  { id: 'retro', label: 'Retro', font: 'Courier New, monospace', weight: 'bold', color: '#ffd700', shadow: true, size: 24 },
  { id: 'dark', label: 'Dark', font: 'sans-serif', weight: 'bold', color: '#1a1a1a', shadow: false, size: 28 },
]

export function MoodQuotesPanel({ canvasRef, faceKeypoints, onUpdate, textOverlays }: MoodQuotesPanelProps) {
  const [moodResult, setMoodResult] = useState<MoodResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedMood, setSelectedMood] = useState<MoodCategory | null>(null)
  const [selectedStyle, setSelectedStyle] = useState(QUOTE_STYLES[0].id)
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const activeMood = selectedMood ?? moodResult?.primary ?? null
  const quotes = activeMood ? getQuotesByMood(activeMood) : []

  const analyzeMood = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    setAnalyzing(true)
    if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current)
    analyzeTimerRef.current = setTimeout(() => {
      const result = detectImageMood(canvas, faceKeypoints)
      setMoodResult(result)
      setSelectedMood(null)
      setAnalyzing(false)
    }, 100)
  }, [canvasRef, faceKeypoints])

  const applyQuote = useCallback((quote: MoodQuote) => {
    const style = QUOTE_STYLES.find((s) => s.id === selectedStyle) ?? QUOTE_STYLES[0]
    const text = quote.author ? `"${quote.text}"\n— ${quote.author}` : `"${quote.text}"`
    const overlay: TextOverlay = {
      id: `quote-${Date.now()}`,
      text,
      x: 0.5,
      y: 0.85,
      fontSize: style.size,
      color: style.color,
      fontFamily: style.font,
      fontWeight: style.weight,
      fontStyle: 'normal',
      textShadow: style.shadow,
      opacity: 1,
      rotation: 0,
    }
    onUpdate({ textOverlays: [...textOverlays, overlay] })
  }, [onUpdate, textOverlays, selectedStyle])

  const shuffleQuote = useCallback(() => {
    if (!quotes.length) return
    const random = quotes[Math.floor(Math.random() * quotes.length)]
    applyQuote(random)
  }, [quotes, applyQuote])

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-300">Mood Quotes</h3>
      <p className="text-[10px] text-zinc-500 leading-relaxed">
        Detect your photo's vibe and get matching quotes to share.
      </p>

      {/* Analyze button */}
      <button
        onClick={analyzeMood}
        disabled={analyzing}
        className="w-full py-2.5 rounded-lg font-medium text-sm transition-colors bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
      >
        {analyzing ? 'Analyzing vibe...' : moodResult ? 'Re-analyze Vibe' : 'Detect Photo Vibe'}
      </button>

      {/* Mood result */}
      {moodResult && (
        <div className="bg-zinc-800/60 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{MOOD_LABELS[moodResult.primary].emoji}</span>
            <div>
              <p className="text-sm font-semibold text-white">
                {MOOD_LABELS[moodResult.primary].label} vibe
              </p>
              <p className="text-[10px] text-zinc-400">
                Expression: {moodResult.expression} · Also: {MOOD_LABELS[moodResult.secondary].label}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mood selector */}
      <div>
        <p className="text-[10px] text-zinc-500 mb-1.5">
          {moodResult ? 'Or pick a mood:' : 'Choose a mood:'}
        </p>
        <div className="flex gap-1 flex-wrap">
          {ALL_MOODS.map((mood) => {
            const info = MOOD_LABELS[mood]
            const isActive = activeMood === mood
            return (
              <button
                key={mood}
                onClick={() => setSelectedMood(mood)}
                className={`px-2 py-1 text-[10px] rounded-md transition-colors flex items-center gap-0.5 ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>{info.emoji}</span>
                <span>{info.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Style selector */}
      {activeMood && (
        <div>
          <p className="text-[10px] text-zinc-500 mb-1.5">Quote style:</p>
          <div className="flex gap-1 flex-wrap">
            {QUOTE_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`px-2 py-1 text-[10px] rounded-md transition-colors ${
                  selectedStyle === style.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quotes list */}
      {activeMood && quotes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-zinc-500">
              {MOOD_LABELS[activeMood].emoji} {quotes.length} quotes
            </p>
            <button
              onClick={shuffleQuote}
              className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
            >
              🎲 Random
            </button>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {quotes.map((quote, i) => (
              <button
                key={i}
                onClick={() => applyQuote(quote)}
                className="w-full text-left bg-zinc-800/40 hover:bg-zinc-700/60 rounded-lg p-2.5 transition-colors group"
              >
                <p className="text-[11px] text-zinc-300 leading-relaxed group-hover:text-white transition-colors">
                  "{quote.text}"
                </p>
                {quote.author && (
                  <p className="text-[9px] text-zinc-500 mt-0.5">— {quote.author}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
