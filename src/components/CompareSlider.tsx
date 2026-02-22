import React, { useState, useRef, useCallback, useEffect } from 'react'

interface CompareSliderProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  imageSrc: string
  visible: boolean
  onClose: () => void
}

export function CompareSlider({ canvasRef, imageSrc, visible, onClose }: CompareSliderProps) {
  const [position, setPosition] = useState<number>(50)
  const [snapshot, setSnapshot] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef<boolean>(false)

  useEffect(() => {
    if (!visible) return
    requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (canvas) setSnapshot(canvas.toDataURL('image/png'))
    })
    return () => { setSnapshot(null); setPosition(50) }
  }, [visible, canvasRef])

  const getPosition = useCallback((clientX: number): number => {
    const container = containerRef.current
    if (!container) return 50
    const rect = container.getBoundingClientRect()
    const x = clientX - rect.left
    return Math.min(100, Math.max(0, (x / rect.width) * 100))
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    isDragging.current = true
    setPosition(getPosition(e.clientX))
    containerRef.current?.setPointerCapture(e.pointerId)
  }, [getPosition])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    setPosition(getPosition(e.clientX))
  }, [getPosition])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  useEffect(() => {
    if (!visible) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, onClose])

  if (!visible || !snapshot) return null

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        ref={containerRef}
        className="relative select-none overflow-hidden rounded-lg shadow-2xl"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          src={snapshot}
          alt="Edited"
          draggable={false}
          className="block max-h-[70vh] max-w-[90vw] lg:max-h-[80vh] lg:max-w-[70vw]"
        />

        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${position}%` }}
        >
          <img
            src={imageSrc}
            alt="Original"
            draggable={false}
            className="block max-h-[70vh] max-w-[90vw] lg:max-h-[80vh] lg:max-w-[70vw]"
            style={{ minWidth: '100%', objectFit: 'cover', objectPosition: 'left' }}
          />
        </div>

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/90 pointer-events-none"
          style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center pointer-events-none">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-zinc-700">
              <path d="M7 4L3 10L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 4L17 10L13 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium pointer-events-none">
          Original
        </div>
        <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium pointer-events-none">
          Edited
        </div>
      </div>

      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-lg"
        title="Close (Esc)"
      >
        ×
      </button>
    </div>
  )
}
