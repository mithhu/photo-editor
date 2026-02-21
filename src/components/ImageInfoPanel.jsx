import { useState, useEffect, useMemo } from 'react'

export function ImageInfoPanel({ imageSrc }) {
  const [collapsed, setCollapsed] = useState(true)
  const [dims, setDims] = useState(null)

  useEffect(() => {
    if (!imageSrc) return
    let cancelled = false
    const img = new Image()
    img.onload = () => { if (!cancelled) setDims({ w: img.naturalWidth, h: img.naturalHeight }) }
    img.src = imageSrc
    return () => { cancelled = true }
  }, [imageSrc])

  const info = useMemo(() => {
    if (!imageSrc || !dims) return null

    let fileType = 'Unknown'
    if (imageSrc.startsWith('data:image/png')) fileType = 'PNG'
    else if (imageSrc.startsWith('data:image/jpeg') || imageSrc.startsWith('data:image/jpg')) fileType = 'JPEG'
    else if (imageSrc.startsWith('data:image/webp')) fileType = 'WebP'
    else if (imageSrc.startsWith('data:image/gif')) fileType = 'GIF'
    else if (imageSrc.startsWith('data:image/svg')) fileType = 'SVG'
    else if (imageSrc.startsWith('data:')) fileType = 'Image'

    const base64Index = imageSrc.indexOf(',')
    const base64Length = base64Index >= 0 ? imageSrc.length - base64Index - 1 : imageSrc.length
    const estimatedBytes = Math.round(base64Length * 3 / 4)

    let sizeLabel
    if (estimatedBytes >= 1024 * 1024) {
      sizeLabel = (estimatedBytes / (1024 * 1024)).toFixed(1) + ' MB'
    } else if (estimatedBytes >= 1024) {
      sizeLabel = Math.round(estimatedBytes / 1024) + ' KB'
    } else {
      sizeLabel = estimatedBytes + ' B'
    }

    const megapixels = ((dims.w * dims.h) / 1_000_000).toFixed(1)

    return { fileType, sizeLabel, megapixels }
  }, [imageSrc, dims])

  if (!imageSrc || !info) return null

  return (
    <div className="bg-zinc-900/80 rounded-xl border border-zinc-800">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-zinc-300">Image Info</span>
        <span className="text-xs text-zinc-500">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Dimensions</span>
            <span className="text-zinc-300 font-medium">{dims.w} × {dims.h}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Megapixels</span>
            <span className="text-zinc-300 font-medium">{info.megapixels} MP</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Type</span>
            <span className="text-zinc-300 font-medium">{info.fileType}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Est. Size</span>
            <span className="text-zinc-300 font-medium">{info.sizeLabel}</span>
          </div>
        </div>
      )}
    </div>
  )
}
