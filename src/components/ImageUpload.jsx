import { useState, useRef } from 'react'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB
const MAX_DIMENSION = 8192
const SUPPORTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml']

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ImageUpload({ onImageLoad, loading, onLoadingChange }) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFile = (file) => {
    setError(null)

    if (!file) return

    if (!SUPPORTED_TYPES.some((t) => file.type === t) && !file.type.startsWith('image/')) {
      setError(`Unsupported file type: ${file.type || 'unknown'}. Use PNG, JPG, or WebP.`)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${formatSize(file.size)}). Maximum is ${formatSize(MAX_FILE_SIZE)}.`)
      return
    }

    onLoadingChange?.(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        if (img.naturalWidth > MAX_DIMENSION || img.naturalHeight > MAX_DIMENSION) {
          setError(`Image dimensions (${img.naturalWidth}×${img.naturalHeight}) exceed ${MAX_DIMENSION}px limit.`)
          onLoadingChange?.(false)
          return
        }
        onImageLoad(e.target.result)
        onLoadingChange?.(false)
      }
      img.onerror = () => {
        setError('Failed to decode image. The file may be corrupted.')
        onLoadingChange?.(false)
      }
      img.src = e.target.result
    }
    reader.onerror = () => {
      setError('Failed to read file. Please try again.')
      onLoadingChange?.(false)
    }
    reader.readAsDataURL(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const onDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  return (
    <div className="space-y-3">
      <div
        className="relative border-2 border-dashed border-zinc-600 rounded-xl p-12 text-center cursor-pointer transition-colors hover:border-indigo-500/50 hover:bg-zinc-800/30"
        style={{ borderColor: isDragging ? 'rgba(245,158,11,0.5)' : undefined, backgroundColor: isDragging ? 'rgba(39,39,42,0.5)' : undefined }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !loading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files[0])
            e.target.value = ''
          }}
        />
        {loading ? (
          <>
            <div className="text-zinc-400 text-4xl mb-3 animate-pulse">⏳</div>
            <p className="text-zinc-300 text-lg">Loading image...</p>
            <div className="mt-4 h-1.5 bg-zinc-700 rounded-full overflow-hidden max-w-xs mx-auto">
              <div className="h-full bg-indigo-500 rounded-full animate-pulse w-2/3" />
            </div>
          </>
        ) : (
          <>
            <div className="text-zinc-400 text-4xl mb-3">📷</div>
            <p className="text-zinc-300 text-lg">Drop an image here or click to upload</p>
            <p className="text-zinc-500 text-sm mt-1">PNG, JPG, WebP — max {formatSize(MAX_FILE_SIZE)}, {MAX_DIMENSION}px</p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <span className="text-red-400 text-sm shrink-0 mt-0.5">⚠</span>
          <div className="flex-1">
            <p className="text-red-300 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400/70 hover:text-red-300 text-xs mt-1 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
