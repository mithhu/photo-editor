import { useState, useCallback, useEffect, useRef } from 'react'

const HANDLE_SIZE = 8
const MIN_DIMENSION = 0.05

const HANDLES = [
  { id: 'nw', row: 0, col: 0, cursor: 'nwse-resize' },
  { id: 'ne', row: 0, col: 1, cursor: 'nesw-resize' },
  { id: 'sw', row: 1, col: 0, cursor: 'nesw-resize' },
  { id: 'se', row: 1, col: 1, cursor: 'nwse-resize' },
  { id: 'n', row: 0, col: 0.5, cursor: 'ns-resize' },
  { id: 's', row: 1, col: 0.5, cursor: 'ns-resize' },
  { id: 'w', row: 0.5, col: 0, cursor: 'ew-resize' },
  { id: 'e', row: 0.5, col: 1, cursor: 'ew-resize' },
]

function getAspectRatio(cropRatio) {
  const ratios = {
    '1:1': 1,
    '4:5': 4 / 5,
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '3:4': 3 / 4,
    '2:3': 2 / 3,
  }
  return ratios[cropRatio] ?? null
}

export function CropOverlay({ cropRegion, onCropChange, isActive, cropRatio }) {
  const overlayRef = useRef(null)
  const dragRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragType, setDragType] = useState(null)

  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))

  const handlePointerDown = useCallback((e, handleId) => {
    e.stopPropagation()
    e.preventDefault()
    const overlay = overlayRef.current
    if (!overlay) return
    const rect = overlay.getBoundingClientRect()

    const type = handleId ? 'resize' : 'move'
    dragRef.current = {
      type,
      handle: handleId,
      startX: e.clientX,
      startY: e.clientY,
      overlayW: rect.width,
      overlayH: rect.height,
      initialRegion: { ...cropRegion },
    }
    setIsDragging(true)
    setDragType(type)
  }, [cropRegion])

  const handlePointerMove = useCallback((e) => {
    const drag = dragRef.current
    if (!drag) return

    const dx = (e.clientX - drag.startX) / drag.overlayW
    const dy = (e.clientY - drag.startY) / drag.overlayH
    const { x, y, w, h } = drag.initialRegion
    const aspect = getAspectRatio(cropRatio)

    if (drag.type === 'move') {
      const maxX = 1 - w
      const maxY = 1 - h
      onCropChange({
        x: clamp(x + dx, 0, maxX),
        y: clamp(y + dy, 0, maxY),
        w,
        h,
      })
      return
    }

    const handle = drag.handle
    let nx = x, ny = y, nw = w, nh = h

    const resizeFromLeft = (d) => {
      const maxD = w - MIN_DIMENSION
      const clamped = clamp(d, -x, maxD)
      nx = x + clamped
      nw = w - clamped
    }
    const resizeFromRight = (d) => {
      nw = clamp(w + d, MIN_DIMENSION, 1 - x)
    }
    const resizeFromTop = (d) => {
      const maxD = h - MIN_DIMENSION
      const clamped = clamp(d, -y, maxD)
      ny = y + clamped
      nh = h - clamped
    }
    const resizeFromBottom = (d) => {
      nh = clamp(h + d, MIN_DIMENSION, 1 - y)
    }

    if (aspect) {
      // Aspect-ratio-constrained resize
      // Use the dominant axis based on handle type
      const isHorizontalEdge = handle === 'w' || handle === 'e'
      const isVerticalEdge = handle === 'n' || handle === 's'

      if (isHorizontalEdge) {
        if (handle === 'w') resizeFromLeft(dx)
        else resizeFromRight(dx)
        // Derive height from width, keeping vertical center stable
        const desiredH = (nw * drag.overlayW) / (aspect * drag.overlayH)
        const clampedH = clamp(desiredH, MIN_DIMENSION, 1)
        const centerY = ny + nh / 2
        nh = clampedH
        ny = clamp(centerY - nh / 2, 0, 1 - nh)
      } else if (isVerticalEdge) {
        if (handle === 'n') resizeFromTop(dy)
        else resizeFromBottom(dy)
        const desiredW = (nh * aspect * drag.overlayH) / drag.overlayW
        const clampedW = clamp(desiredW, MIN_DIMENSION, 1)
        const centerX = nx + nw / 2
        nw = clampedW
        nx = clamp(centerX - nw / 2, 0, 1 - nw)
      } else {
        // Corner handles: use the axis with larger movement
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)
        const useWidth = absDx >= absDy

        if (useWidth) {
          if (handle.includes('w')) resizeFromLeft(dx)
          else resizeFromRight(dx)
          const desiredH = (nw * drag.overlayW) / (aspect * drag.overlayH)
          nh = clamp(desiredH, MIN_DIMENSION, 1)
          if (handle.includes('n')) {
            ny = clamp(y + h - nh, 0, 1 - nh)
          } else {
            ny = clamp(y, 0, 1 - nh)
          }
        } else {
          if (handle.includes('n')) resizeFromTop(dy)
          else resizeFromBottom(dy)
          const desiredW = (nh * aspect * drag.overlayH) / drag.overlayW
          nw = clamp(desiredW, MIN_DIMENSION, 1)
          if (handle.includes('w')) {
            nx = clamp(x + w - nw, 0, 1 - nw)
          } else {
            nx = clamp(x, 0, 1 - nw)
          }
        }
      }
    } else {
      // Free-form resize
      if (handle.includes('w')) resizeFromLeft(dx)
      if (handle.includes('e')) resizeFromRight(dx)
      if (handle.includes('n')) resizeFromTop(dy)
      if (handle.includes('s')) resizeFromBottom(dy)
    }

    onCropChange({ x: nx, y: ny, w: nw, h: nh })
  }, [cropRatio, onCropChange])

  const handlePointerUp = useCallback(() => {
    if (dragRef.current) {
      dragRef.current = null
      setIsDragging(false)
      setDragType(null)
    }
  }, [])

  useEffect(() => {
    if (!isDragging) return
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, handlePointerMove, handlePointerUp])

  if (!isActive || !cropRegion) return null

  const { x, y, w, h } = cropRegion
  const pct = (v) => `${v * 100}%`

  return (
    <div ref={overlayRef} className="absolute inset-0 z-10">
      {/* Darkened regions outside crop */}
      <div className="absolute bg-black/50" style={{ top: 0, left: 0, right: 0, height: pct(y) }} />
      <div className="absolute bg-black/50" style={{ top: pct(y + h), left: 0, right: 0, bottom: 0 }} />
      <div className="absolute bg-black/50" style={{ top: pct(y), left: 0, width: pct(x), height: pct(h) }} />
      <div className="absolute bg-black/50" style={{ top: pct(y), left: pct(x + w), right: 0, height: pct(h) }} />

      {/* Crop area (draggable) */}
      <div
        className="absolute border border-white/70"
        style={{
          top: pct(y),
          left: pct(x),
          width: pct(w),
          height: pct(h),
          cursor: dragType === 'move' ? 'grabbing' : 'grab',
        }}
        onPointerDown={(e) => handlePointerDown(e, null)}
      >
        {/* Rule-of-thirds grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
        </div>
      </div>

      {/* Resize handles */}
      {HANDLES.map(({ id, row, col, cursor }) => {
        const hx = x + w * col
        const hy = y + h * row
        return (
          <div
            key={id}
            className="absolute w-2 h-2 bg-white border border-zinc-800 z-20"
            style={{
              left: `calc(${pct(hx)} - ${HANDLE_SIZE / 2}px)`,
              top: `calc(${pct(hy)} - ${HANDLE_SIZE / 2}px)`,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              cursor,
            }}
            onPointerDown={(e) => handlePointerDown(e, id)}
          />
        )
      })}
    </div>
  )
}
