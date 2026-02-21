import { useCallback, useEffect } from 'react'

const SHORTCUT_GROUPS = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
    ],
  },
  {
    title: 'Drawing',
    shortcuts: [
      { keys: ['B'], description: 'Brush tool' },
      { keys: ['E'], description: 'Eraser tool' },
      { keys: ['H'], description: 'Heal tool' },
      { keys: ['Escape'], description: 'Exit tool / Cancel' },
      { keys: ['+', '−'], description: 'Brush size (increase / decrease)' },
    ],
  },
  {
    title: 'View',
    shortcuts: [
      { keys: ['?'], description: 'Show shortcuts' },
    ],
  },
]

function KeyBadge({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 text-xs font-mono font-medium bg-zinc-800 border border-zinc-600 rounded text-zinc-300">
      {children}
    </kbd>
  )
}

export function ShortcutsOverlay({ visible, onClose }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (!visible) return
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, handleKeyDown])

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors text-xl leading-none p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map(({ keys, description }) => (
                  <div
                    key={description}
                    className="flex items-center justify-between gap-4 py-2 border-b border-zinc-800/60 last:border-0"
                  >
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {keys.map((key) => (
                        <KeyBadge key={key}>{key}</KeyBadge>
                      ))}
                    </div>
                    <span className="text-zinc-300 text-sm text-right">{description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-zinc-800/40 border-t border-zinc-800 text-xs text-zinc-500">
          Press <KeyBadge>Escape</KeyBadge> or click outside to close
        </div>
      </div>
    </div>
  )
}
