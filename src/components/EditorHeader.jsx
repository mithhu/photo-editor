export function EditorHeader({ onUndo, onRedo, canUndo, canRedo, onNewImage, onDownload, onShare }) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
      <h1 className="text-xl font-bold text-amber-500">Photo Editor</h1>
      <div className="flex items-center gap-2">
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
        <button
          onClick={onNewImage}
          className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
        >
          New Image
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
    </header>
  )
}
