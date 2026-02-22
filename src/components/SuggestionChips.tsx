import React from 'react'
import type { EditState } from '../types'

interface Suggestion {
  label: string
  description: string
  changes: Partial<EditState>
}

interface SuggestionChipsProps {
  suggestions: Suggestion[]
  loading: boolean
  onAnalyze: () => void
  onApply: (changes: Partial<EditState>) => void
}

export function SuggestionChips({ suggestions, loading, onAnalyze, onApply }: SuggestionChipsProps) {
  if (!suggestions.length && !loading) {
    return (
      <button
        onClick={onAnalyze}
        className="w-full py-1.5 text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg transition-colors"
      >
        Analyze Exposure
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2">
        <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
        <span className="text-xs text-zinc-400">Analyzing...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onApply(s.changes)}
          title={s.description}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/25 rounded-full transition-colors"
        >
          <span className="font-medium">{s.label}</span>
        </button>
      ))}
    </div>
  )
}
