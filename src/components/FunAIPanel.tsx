import React, { useState, useCallback } from 'react'
import { Slider } from './Slider'
import type { EditState, EmotionType, EmotionSettings, AgeTransformSettings, CelebrityMatch, FaceKeypoint } from '../types'

interface FunAIPanelProps {
  emotion: EmotionSettings
  ageTransform: AgeTransformSettings
  onUpdate: (changes: Partial<EditState>) => void
  onSliderUpdate?: (updater: ((prev: EditState) => EditState) | Partial<EditState>) => void
  processing: boolean
  faceKeypoints: FaceKeypoint[] | null
}

type FunTab = 'emotions' | 'celebrity' | 'age'

interface EmotionOption {
  type: EmotionType
  label: string
  icon: string
}

const EMOTIONS: EmotionOption[] = [
  { type: 'none', label: 'None', icon: '🚫' },
  { type: 'laugh', label: 'Laugh', icon: '😄' },
  { type: 'cry', label: 'Cry', icon: '😢' },
  { type: 'angry', label: 'Angry', icon: '😠' },
  { type: 'surprised', label: 'Surprised', icon: '😲' },
  { type: 'sad', label: 'Sad', icon: '😔' },
]

export function FunAIPanel({ emotion, ageTransform, onUpdate, onSliderUpdate, processing, faceKeypoints }: FunAIPanelProps) {
  const [activeTab, setActiveTab] = useState<FunTab>('emotions')
  const [celebrityResults, setCelebrityResults] = useState<CelebrityMatch[] | null>(null)
  const [celebrityLoading, setCelebrityLoading] = useState(false)

  const handleEmotionSelect = useCallback((type: EmotionType) => {
    onUpdate({ emotion: { ...emotion, type } })
  }, [emotion, onUpdate])

  const handleEmotionIntensity = useCallback((val: number) => {
    const update = (prev: EditState) => ({
      ...prev,
      emotion: { ...prev.emotion, intensity: val }
    })
    onSliderUpdate ? onSliderUpdate(update) : onUpdate({ emotion: { ...emotion, intensity: val } })
  }, [emotion, onUpdate, onSliderUpdate])

  const handleAgeOffset = useCallback((val: number) => {
    const update = (prev: EditState) => ({
      ...prev,
      ageTransform: { ...prev.ageTransform, offset: val }
    })
    onSliderUpdate ? onSliderUpdate(update) : onUpdate({ ageTransform: { ...ageTransform, offset: val } })
  }, [ageTransform, onUpdate, onSliderUpdate])

  const handleAgeIntensity = useCallback((val: number) => {
    const update = (prev: EditState) => ({
      ...prev,
      ageTransform: { ...prev.ageTransform, intensity: val }
    })
    onSliderUpdate ? onSliderUpdate(update) : onUpdate({ ageTransform: { ...ageTransform, intensity: val } })
  }, [ageTransform, onUpdate, onSliderUpdate])

  const handleCelebrityAnalyze = useCallback(async () => {
    if (!faceKeypoints || faceKeypoints.length < 468) {
      setCelebrityResults([])
      return
    }
    setCelebrityLoading(true)
    try {
      const { extractFaceMetrics, findCelebrityMatches } = await import('../utils/faceAnalysis')
      const metrics = extractFaceMetrics(faceKeypoints)
      if (!metrics) {
        setCelebrityResults([])
        return
      }
      const matches = findCelebrityMatches(metrics, 5)
      setCelebrityResults(matches)
    } catch {
      setCelebrityResults([])
    } finally {
      setCelebrityLoading(false)
    }
  }, [faceKeypoints])

  const handleResetEmotion = useCallback(() => {
    onUpdate({ emotion: { type: 'none', intensity: 70 } })
  }, [onUpdate])

  const handleResetAge = useCallback(() => {
    onUpdate({ ageTransform: { offset: 0, intensity: 70 } })
  }, [onUpdate])

  const tabs: { id: FunTab; label: string; icon: string }[] = [
    { id: 'emotions', label: 'Emotions', icon: '😄' },
    { id: 'celebrity', label: 'Celebrity', icon: '⭐' },
    { id: 'age', label: 'Age', icon: '⏳' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300">Fun AI</h3>
        {processing && (
          <span className="text-xs text-purple-400 animate-pulse">Processing...</span>
        )}
      </div>

      <div className="flex gap-1 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'emotions' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {EMOTIONS.map(em => (
              <button
                key={em.type}
                onClick={() => handleEmotionSelect(em.type)}
                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-xs transition-all ${
                  emotion.type === em.type
                    ? 'bg-purple-600/30 border border-purple-500 text-white'
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <span className="text-lg">{em.icon}</span>
                <span>{em.label}</span>
              </button>
            ))}
          </div>

          {emotion.type !== 'none' && (
            <>
              <Slider
                label="Intensity"
                value={emotion.intensity}
                min={0}
                max={100}
                step={1}
                onChange={handleEmotionIntensity}
                unit="%"
              />
              <button
                onClick={handleResetEmotion}
                className="w-full py-1.5 text-xs text-zinc-400 hover:text-white transition-colors rounded-lg bg-zinc-800 hover:bg-zinc-700"
              >
                Reset Emotion
              </button>
            </>
          )}
        </div>
      )}

      {activeTab === 'celebrity' && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-400">Analyze your face to find celebrity lookalikes based on facial geometry.</p>

          <button
            onClick={handleCelebrityAnalyze}
            disabled={celebrityLoading || !faceKeypoints}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
              celebrityLoading
                ? 'bg-purple-600/50 text-purple-300 cursor-wait'
                : !faceKeypoints
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            {celebrityLoading ? 'Analyzing...' : !faceKeypoints ? 'Upload a face photo first' : 'Find My Celebrity Match'}
          </button>

          {celebrityResults && celebrityResults.length > 0 && (
            <div className="space-y-2">
              {celebrityResults.map((match, i) => (
                <div
                  key={match.name}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                    i === 0
                      ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/50'
                      : 'bg-zinc-800/50 border-zinc-700'
                  }`}
                >
                  <span className="text-lg font-bold text-purple-400 w-6 text-center">
                    {i === 0 ? '🏆' : `#${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{match.name}</div>
                    <div className="text-xs text-zinc-400">{match.bestFeature}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${
                      match.matchPercent >= 80 ? 'text-green-400' :
                      match.matchPercent >= 60 ? 'text-yellow-400' : 'text-zinc-400'
                    }`}>
                      {match.matchPercent}%
                    </div>
                    <div className="text-[10px] text-zinc-500">match</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {celebrityResults && celebrityResults.length === 0 && (
            <div className="text-center py-4 text-zinc-500 text-xs">
              No face detected. Please upload a clear face photo.
            </div>
          )}
        </div>
      )}

      {activeTab === 'age' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Younger</span>
            <span>Current</span>
            <span>Older</span>
          </div>
          <Slider
            label="Age Offset"
            value={ageTransform.offset}
            min={-20}
            max={40}
            step={1}
            defaultValue={0}
            onChange={handleAgeOffset}
            unit="raw"
          />
          <Slider
            label="Intensity"
            value={ageTransform.intensity}
            min={0}
            max={100}
            step={1}
            onChange={handleAgeIntensity}
            unit="%"
          />

          <div className="flex gap-2">
            <button
              onClick={() => onUpdate({ ageTransform: { offset: -15, intensity: 80 } })}
              className="flex-1 py-2 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
            >
              10 Years Younger
            </button>
            <button
              onClick={() => onUpdate({ ageTransform: { offset: 25, intensity: 80 } })}
              className="flex-1 py-2 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
            >
              20 Years Older
            </button>
          </div>

          <button
            onClick={handleResetAge}
            className="w-full py-1.5 text-xs text-zinc-400 hover:text-white transition-colors rounded-lg bg-zinc-800 hover:bg-zinc-700"
          >
            Reset Age
          </button>
        </div>
      )}
    </div>
  )
}
