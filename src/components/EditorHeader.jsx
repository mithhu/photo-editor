import { useState, useCallback, useEffect, useRef } from 'react'

function KeyboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

export function EditorHeader({ onUndo, onRedo, canUndo, canRedo, showCompare, onToggleCompare, onAutoEnhance, onNewImage, onDownload, onShare, onBatch, onResetAll, onOpenShortcuts, canvasRef }) {
  const [showMenu, setShowMenu] = useState(false)
  const [sharing, setSharing] = useState(false)
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

  const handleNativeShare = useCallback(async () => {
    const canvas = canvasRef?.current
    if (!canvas) { onShare?.(); return }

    if (!navigator.share || !navigator.canShare) {
      onShare?.()
      return
    }

    setSharing(true)
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      const file = new File([blob], 'photosai-edit.png', { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'PhotosAI Edit' })
      } else {
        onShare?.()
      }
    } catch (err) {
      if (err.name !== 'AbortError') onShare?.()
    } finally {
      setSharing(false)
    }
  }, [canvasRef, onShare])

  return (
    <header className="relative z-50 flex items-center justify-between px-3 py-1.5 lg:px-5 lg:py-2 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
      {/* Left: Logo + Undo/Redo */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-indigo-400">Photos</span><span className="text-zinc-300">AI</span>
        </h1>

        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" /></svg>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor"><path fillRule="evenodd" d="M12.207 2.232a.75.75 0 00.025 1.06l4.146 3.958H6.375a5.375 5.375 0 000 10.75H9.25a.75.75 0 000-1.5H6.375a3.875 3.875 0 010-7.75h10.003l-4.146 3.957a.75.75 0 001.036 1.085l5.5-5.25a.75.75 0 000-1.085l-5.5-5.25a.75.75 0 00-1.06.025z" clipRule="evenodd" /></svg>
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        {/* Desktop actions */}
        <div className="hidden lg:flex items-center gap-1.5">
          <button
            onClick={onToggleCompare}
            title="Compare original vs edited"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${showCompare ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
          >
            Compare
          </button>
          <button
            onClick={onAutoEnhance}
            className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
          >
            Enhance
          </button>
          <button
            onClick={onResetAll}
            className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-colors"
          >
            Reset
          </button>

          <div className="w-px h-5 bg-zinc-800 mx-1" />

          <button
            onClick={onNewImage}
            className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
          >
            New
          </button>
          <button
            onClick={onBatch}
            className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
          >
            Batch
          </button>
          <button
            onClick={handleNativeShare}
            disabled={sharing}
            className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50"
          >
            {sharing ? 'Sharing...' : 'Share'}
          </button>

          <button
            onClick={onOpenShortcuts}
            title="Keyboard shortcuts (?)"
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
          >
            <KeyboardIcon />
          </button>

          <button
            onClick={onDownload}
            className="ml-1 px-4 py-1.5 text-xs font-semibold bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg transition-colors shadow-sm shadow-indigo-500/20"
          >
            Export
          </button>
        </div>

        {/* Mobile: Share button + overflow menu */}
        <div className="lg:hidden flex items-center gap-0.5">
          <button
            onClick={handleNativeShare}
            disabled={sharing}
            title="Share"
            className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50"
          >
            {sharing ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" /><path d="M12 2a10 10 0 019.75 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            ) : (
              <ShareIcon />
            )}
          </button>
          <button
            onClick={onDownload}
            title="Export"
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
            >
              <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor"><circle cx="4" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" /></svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 py-1 min-w-[170px] backdrop-blur-xl">
                <button onClick={() => { onToggleCompare?.(); closeMenu() }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-800 ${showCompare ? 'text-indigo-400' : 'text-zinc-300'}`}>
                  {showCompare ? '✓ Compare' : 'Compare'}
                </button>
                <button onClick={() => { onAutoEnhance?.(); closeMenu() }} className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800">
                  Enhance
                </button>
                <button onClick={() => { onResetAll?.(); closeMenu() }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800">
                  Reset All
                </button>
                <div className="h-px bg-zinc-800 my-1" />
                <button onClick={() => { onNewImage(); closeMenu() }} className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800">
                  New Image
                </button>
                <button onClick={() => { onBatch?.(); closeMenu() }} className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800">
                  Edit Multiple
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
