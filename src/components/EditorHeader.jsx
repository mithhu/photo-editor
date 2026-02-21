import { useState, useCallback, useEffect, useRef } from 'react'

export function EditorHeader({ onUndo, onRedo, canUndo, canRedo, onCompareStart, onCompareEnd, onAutoEnhance, onNewImage, onDownload, onShare, onBatch, onResetAll }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  const closeMenu = useCallback(() => setShowMenu(false), [])

  useEffect(() => {
    if (!showMenu) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) closeMenu()
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [showMenu, closeMenu])

  return (
    <header className="relative z-50 flex items-center justify-between px-3 py-2 lg:px-4 lg:py-3 border-b border-zinc-800/50 bg-zinc-900/90 backdrop-blur-sm">
      <h1 className="text-lg lg:text-xl font-bold text-amber-500">Photo Editor</h1>

      <div className="flex items-center gap-2">
        {/* Undo / Redo — always visible */}
        <div className="flex rounded-lg overflow-hidden border border-zinc-700">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zinc-700 transition-colors"
          >
            ↶
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zinc-700 transition-colors border-l border-zinc-600"
          >
            ↷
          </button>
        </div>

        {/* Desktop-only buttons */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onMouseDown={onCompareStart}
            onMouseUp={onCompareEnd}
            onMouseLeave={onCompareEnd}
            title="Hold to compare"
            className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
          >
            Compare
          </button>
          <button
            onClick={onResetAll}
            className="px-4 py-2 text-sm bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 rounded-lg transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onAutoEnhance}
            className="px-4 py-2 text-sm bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg transition-colors"
          >
            Auto Enhance
          </button>
          <button
            onClick={onNewImage}
            className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
          >
            New Image
          </button>
          <button
            onClick={onBatch}
            className="px-4 py-2 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors"
          >
            Edit Multiple
          </button>
          <button
            onClick={onShare}
            className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
          >
            Share
          </button>
          <button
            onClick={onDownload}
            className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-400 text-zinc-900 font-medium rounded-lg transition-colors"
          >
            Download
          </button>
        </div>

        {/* Mobile overflow menu */}
        <div className="lg:hidden relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
          >
            ⋯
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
              <button
                onPointerDown={onCompareStart}
                onPointerUp={() => { onCompareEnd?.(); closeMenu() }}
                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                Compare
              </button>
              <button
                onClick={() => { onResetAll?.(); closeMenu() }}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-700"
              >
                Reset All
              </button>
              <button
                onClick={() => { onAutoEnhance?.(); closeMenu() }}
                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                Auto Enhance
              </button>
              <button
                onClick={() => { onNewImage(); closeMenu() }}
                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                New Image
              </button>
              <button
                onClick={() => { onBatch?.(); closeMenu() }}
                className="w-full text-left px-4 py-2 text-sm text-purple-400 hover:bg-zinc-700"
              >
                Edit Multiple
              </button>
              <button
                onClick={() => { onShare(); closeMenu() }}
                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                Share
              </button>
              <button
                onClick={() => { onDownload(); closeMenu() }}
                className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:bg-zinc-700 font-medium"
              >
                Download
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
