import { useState } from 'react'

const TEMPLATES = [
  {
    id: 'ig-story-clean',
    name: 'Clean Story',
    category: 'story',
    preview: '📱',
    apply: (applyChange) => {
      applyChange((s) => ({
        ...s,
        textOverlays: [
          {
            id: Date.now(),
            text: 'YOUR TITLE',
            x: 0.5,
            y: 0.15,
            fontSize: 48,
            color: '#ffffff',
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            textShadow: true,
          },
          {
            id: Date.now() + 1,
            text: 'Subtitle text here',
            x: 0.5,
            y: 0.85,
            fontSize: 24,
            color: '#ffffff',
            fontFamily: 'sans-serif',
            textShadow: true,
          },
        ],
        vignette: 0.3,
      }))
    },
  },
  {
    id: 'ig-story-bold',
    name: 'Bold Story',
    category: 'story',
    preview: '🔥',
    apply: (applyChange) => {
      applyChange((s) => ({
        ...s,
        textOverlays: [
          {
            id: Date.now(),
            text: 'BIG TITLE',
            x: 0.5,
            y: 0.5,
            fontSize: 72,
            color: '#ff6b35',
            fontFamily: 'Impact',
            fontWeight: 'bold',
            textShadow: true,
          },
        ],
        contrast: 1.2,
        saturation: 1.15,
        vignette: 0.4,
      }))
    },
  },
  {
    id: 'ig-post-minimal',
    name: 'Minimal Post',
    category: 'post',
    preview: '✨',
    apply: (applyChange) => {
      applyChange((s) => ({
        ...s,
        textOverlays: [
          {
            id: Date.now(),
            text: 'Caption here',
            x: 0.5,
            y: 0.92,
            fontSize: 20,
            color: '#ffffff',
            fontFamily: 'serif',
            fontStyle: 'italic',
            textShadow: true,
          },
        ],
        brightness: 0.95,
        contrast: 1.1,
      }))
    },
  },
  {
    id: 'ig-post-vintage',
    name: 'Vintage Post',
    category: 'post',
    preview: '📷',
    apply: (applyChange) => {
      applyChange((s) => ({
        ...s,
        preset: 'vintage',
        textOverlays: [
          {
            id: Date.now(),
            text: '— YOUR TEXT —',
            x: 0.5,
            y: 0.1,
            fontSize: 28,
            color: '#f5e6d3',
            fontFamily: 'serif',
            textShadow: true,
          },
        ],
        vignette: 0.5,
      }))
    },
  },
  {
    id: 'fb-cover-gradient',
    name: 'FB Cover',
    category: 'social',
    preview: '🌅',
    apply: (applyChange) => {
      applyChange((s) => ({
        ...s,
        textOverlays: [
          {
            id: Date.now(),
            text: 'YOUR NAME',
            x: 0.5,
            y: 0.45,
            fontSize: 56,
            color: '#ffffff',
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            textShadow: true,
          },
          {
            id: Date.now() + 1,
            text: 'tagline goes here',
            x: 0.5,
            y: 0.6,
            fontSize: 22,
            color: '#e0e0e0',
            fontFamily: 'sans-serif',
            fontStyle: 'italic',
            textShadow: true,
          },
        ],
        vignette: 0.3,
        brightness: 0.9,
      }))
    },
  },
  {
    id: 'yt-thumb',
    name: 'YT Thumbnail',
    category: 'social',
    preview: '▶️',
    apply: (applyChange) => {
      applyChange((s) => ({
        ...s,
        textOverlays: [
          {
            id: Date.now(),
            text: 'CLICK BAIT!',
            x: 0.5,
            y: 0.5,
            fontSize: 64,
            color: '#ffff00',
            fontFamily: 'Impact',
            fontWeight: 'bold',
            textShadow: true,
            rotation: -5,
          },
        ],
        saturation: 1.3,
        contrast: 1.25,
      }))
    },
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    category: 'style',
    preview: '🎬',
    apply: (applyChange) => {
      applyChange((s) => ({
        ...s,
        preset: 'cinematic',
        vignette: 0.5,
        contrast: 1.15,
        brightness: 0.9,
        splitTone: {
          highlightHue: 0.1,
          highlightSat: 0.3,
          shadowHue: 0.6,
          shadowSat: 0.4,
          balance: 0,
        },
      }))
    },
  },
  {
    id: 'moody',
    name: 'Moody',
    category: 'style',
    preview: '🌙',
    apply: (applyChange) => {
      applyChange((s) => ({
        ...s,
        brightness: 0.85,
        contrast: 1.2,
        saturation: 0.8,
        vignette: 0.6,
        colorGrade: {
          shadows: { r: 0, g: 0, b: 0.3 },
          midtones: { r: 0, g: 0, b: 0 },
          highlights: { r: 0.2, g: 0.1, b: 0 },
        },
      }))
    },
  },
]

export function TemplatePanel({ applyChange }) {
  const [activeCategory, setActiveCategory] = useState('all')

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'story', label: 'Stories' },
    { id: 'post', label: 'Posts' },
    { id: 'social', label: 'Social' },
    { id: 'style', label: 'Styles' },
  ]

  const filtered =
    activeCategory === 'all'
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === activeCategory)

  return (
    <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Templates</h3>

      {/* Category tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-amber-500 text-zinc-900'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 gap-2">
        {filtered.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => template.apply(applyChange)}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-center transition-colors border border-zinc-700 hover:border-amber-500/50"
          >
            <span className="text-2xl block mb-1">{template.preview}</span>
            <span className="text-xs text-zinc-300">{template.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
