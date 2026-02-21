import { useState, useRef } from 'react'

export function ImageUpload({ onImageLoad }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (file) => {
    if (!file?.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => onImageLoad(e.target.result)
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
    <div
      className="border-2 border-dashed border-zinc-600 rounded-xl p-12 text-center cursor-pointer transition-colors hover:border-amber-500/50 hover:bg-zinc-800/30"
      style={{ borderColor: isDragging ? 'rgba(245,158,11,0.5)' : undefined, backgroundColor: isDragging ? 'rgba(39,39,42,0.5)' : undefined }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <div className="text-zinc-400 text-4xl mb-3">📷</div>
      <p className="text-zinc-300 text-lg">Drop an image here or click to upload</p>
      <p className="text-zinc-500 text-sm mt-1">PNG, JPG, WebP</p>
    </div>
  )
}
