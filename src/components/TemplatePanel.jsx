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

const CUSTOM_TEMPLATES_KEY = 'photo-editor-custom-templates'

export function TemplatePanel({ applyChange, editState }) {
  const [activeCategory, setActiveCategory] = useState('all')
  const [customTemplates, setCustomTemplates] = useState(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const saveTemplate = () => {
    if (!templateName.trim() || !editState) return
    const {
      preset,
      brightness,
      contrast,
      saturation,
      exposure,
      highlights,
      shadows,
      warmth,
      tint,
      vibrance,
      clarity,
      dehaze,
      vignette,
      colorGrade,
      splitTone,
      hsl,
      curves,
      masks,
      textOverlays,
      shapeOverlays,
    } = editState

    const newTemplate = {
      id: `custom-${Date.now()}`,
      name: templateName.trim(),
      category: 'custom',
      state: {
        preset,
        brightness,
        contrast,
        saturation,
        exposure,
        highlights,
        shadows,
        warmth,
        tint,
        vibrance,
        clarity,
        dehaze,
        vignette,
        colorGrade,
        splitTone,
        hsl,
        curves,
        masks,
        textOverlays,
        shapeOverlays,
      },
      createdAt: Date.now(),
    }

    const updated = [newTemplate, ...customTemplates]
    setCustomTemplates(updated)
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(updated))
    setTemplateName('')
    setShowSaveForm(false)
  }

  const deleteCustomTemplate = (id) => {
    const updated = customTemplates.filter((t) => t.id !== id)
    setCustomTemplates(updated)
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(updated))
  }

  const applyCustomTemplate = (template) => {
    applyChange((s) => ({ ...s, ...template.state }))
  }

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

      {/* Save as Template */}
      <div className="mb-3">
        {!showSaveForm ? (
          <button
            type="button"
            onClick={() => setShowSaveForm(true)}
            className="w-full py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-dashed border-zinc-600 hover:border-amber-500/50 transition-colors"
          >
            + Save Current as Template
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name..."
              className="flex-1 bg-zinc-800 text-sm text-zinc-200 rounded-lg px-3 py-2 border border-zinc-700 focus:border-amber-500 outline-none"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && saveTemplate()}
            />
            <button
              type="button"
              onClick={saveTemplate}
              className="px-3 py-2 bg-amber-500 text-zinc-900 rounded-lg text-xs font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowSaveForm(false)}
              className="px-2 py-2 bg-zinc-700 text-zinc-300 rounded-lg text-xs"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* My Templates */}
      {customTemplates.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-zinc-500 font-medium mb-2">My Templates</h4>
          <div className="grid grid-cols-2 gap-2">
            {customTemplates.map((t) => (
              <div key={t.id} className="relative group">
                <button
                  type="button"
                  onClick={() => applyCustomTemplate(t)}
                  className="w-full p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-center transition-colors border border-zinc-700 hover:border-amber-500/50"
                >
                  <span className="text-2xl block mb-1">🎨</span>
                  <span className="text-xs text-zinc-300 truncate block">{t.name}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteCustomTemplate(t.id)
                  }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
