import { useState, useEffect, useCallback, useRef } from 'react'

interface OnboardingTourProps {
  active: boolean
  onComplete: () => void
}

interface TourStep {
  target: string
  title: string
  description: string
}

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'filters',
    title: 'Apply Filters',
    description:
      'Browse 165+ filters across 14 categories — from trending TikTok looks to classic film emulations.',
  },
  {
    target: 'beauty',
    title: 'AI Beauty',
    description:
      'Smooth skin, reshape features, and apply virtual makeup — all powered by AI running in your browser.',
  },
  {
    target: 'funai',
    title: 'Fun AI',
    description:
      'Transform emotions, find your celebrity lookalike, or see yourself younger or older.',
  },
  {
    target: 'ai',
    title: 'AI Tools',
    description:
      'Remove backgrounds, upscale images, transfer artistic styles, and more — no cloud needed.',
  },
  {
    target: 'share',
    title: 'Share',
    description:
      'Export your creation or share a branded Before/After card on social media.',
  },
]

const STORAGE_KEY = 'photosai-tour-completed'
const SPOTLIGHT_PADDING = 8
const TOOLTIP_GAP = 14

function getVisibleRect(target: string): TargetRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return null
  if (r.bottom < 0 || r.top > window.innerHeight) return null
  if (r.right < 0 || r.left > window.innerWidth) return null
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

function isMobileLayout(): boolean {
  return window.innerWidth < 1024
}

export function OnboardingTour({ active, onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<TargetRect | null>(null)
  const [fading, setFading] = useState(false)
  const [ready, setReady] = useState(false)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number>(0)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch { /* storage unavailable */ }
    onComplete()
  }, [onComplete])

  const advanceStep = useCallback((from: number) => {
    let next = from + 1
    while (next < TOUR_STEPS.length) {
      const el = document.querySelector(`[data-tour="${TOUR_STEPS[next].target}"]`)
      if (el) return next
      next++
    }
    return -1
  }, [])

  const handleNext = useCallback(() => {
    if (step >= TOUR_STEPS.length - 1) {
      finish()
      return
    }
    const nextStep = advanceStep(step)
    if (nextStep < 0) {
      finish()
      return
    }
    setFading(true)
    setReady(false)
    setTimeout(() => {
      setStep(nextStep)
      setFading(false)
    }, 200)
  }, [step, finish, advanceStep])

  const measureTarget = useCallback(() => {
    if (!active) return
    const current = TOUR_STEPS[step]
    if (!current) return

    const el = document.querySelector(`[data-tour="${current.target}"]`)
    if (!el) {
      const nextStep = advanceStep(step)
      if (nextStep >= 0) setStep(nextStep)
      else finish()
      return
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })

    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      rafRef.current = requestAnimationFrame(() => {
        const measured = getVisibleRect(current.target)
        setRect(measured)
        setReady(!!measured)
      })
    }, 350)
  }, [active, step, advanceStep, finish])

  useEffect(() => {
    if (!active) return

    setReady(false)
    measureTarget()

    const handleResize = () => measureTarget()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)

    const observer = new ResizeObserver(handleResize)
    observer.observe(document.body)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
      observer.disconnect()
      cancelAnimationFrame(rafRef.current)
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  }, [active, measureTarget])

  useEffect(() => {
    if (!active) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [active, finish, handleNext])

  if (!active || !ready) return null

  const currentStep = TOUR_STEPS[step]
  if (!currentStep || !rect) return null

  const isLast = step === TOUR_STEPS.length - 1
  const mobile = typeof window !== 'undefined' && isMobileLayout()

  const spotStyle: React.CSSProperties = {
    position: 'fixed',
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
    borderRadius: 12,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
    pointerEvents: 'none',
    zIndex: 71,
    transition: 'all 0.3s ease',
  }

  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 72,
    maxWidth: 340,
    transition: 'opacity 0.2s ease, transform 0.2s ease',
    opacity: fading ? 0 : 1,
    transform: fading ? 'translateY(6px)' : 'translateY(0)',
  }

  let arrowPosition: 'top' | 'bottom' = 'top'

  const targetCenterX = rect.left + rect.width / 2
  const tooltipWidth = 340
  let tooltipLeft = targetCenterX - tooltipWidth / 2
  tooltipLeft = Math.max(12, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - 12))

  if (mobile) {
    const tooltipTop = rect.top - SPOTLIGHT_PADDING - TOOLTIP_GAP - 10
    tooltipStyle = {
      ...tooltipStyle,
      left: tooltipLeft,
      bottom: window.innerHeight - tooltipTop,
    }
    arrowPosition = 'bottom'
  } else {
    const spaceBelow = window.innerHeight - (rect.top + rect.height + SPOTLIGHT_PADDING)
    if (spaceBelow > 200) {
      tooltipStyle = {
        ...tooltipStyle,
        left: tooltipLeft,
        top: rect.top + rect.height + SPOTLIGHT_PADDING + TOOLTIP_GAP,
      }
      arrowPosition = 'top'
    } else {
      tooltipStyle = {
        ...tooltipStyle,
        left: tooltipLeft,
        bottom: window.innerHeight - rect.top + SPOTLIGHT_PADDING + TOOLTIP_GAP,
      }
      arrowPosition = 'bottom'
    }
  }

  const arrowLeft = Math.max(
    20,
    Math.min(
      rect.left + rect.width / 2 - (parseFloat(String(tooltipStyle.left)) || 0),
      320
    )
  )

  return (
    <>
      {/* Overlay backdrop — blocks interaction but does NOT dismiss */}
      <div
        className="fixed inset-0 z-[70]"
        onClick={(e) => e.stopPropagation()}
        aria-hidden
      />

      {/* Spotlight cutout */}
      <div style={spotStyle} aria-hidden />

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5 w-[340px]"
        role="dialog"
        aria-label={currentStep.title}
      >
        {/* Arrow */}
        {arrowPosition === 'top' && (
          <div
            className="absolute -top-2 w-4 h-4 bg-zinc-900 border-l border-t border-zinc-700 rotate-45"
            style={{ left: arrowLeft }}
          />
        )}
        {arrowPosition === 'bottom' && (
          <div
            className="absolute -bottom-2 w-4 h-4 bg-zinc-900 border-r border-b border-zinc-700 rotate-45"
            style={{ left: arrowLeft }}
          />
        )}

        {/* Step indicator dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-5 bg-purple-500'
                  : i < step
                    ? 'w-1.5 bg-purple-500/50'
                    : 'w-1.5 bg-zinc-600'
              }`}
            />
          ))}
          <span className="ml-auto text-xs text-zinc-500 tabular-nums">
            {step + 1}/{TOUR_STEPS.length}
          </span>
        </div>

        <h3 className="text-base font-semibold text-white mb-1.5">
          {currentStep.title}
        </h3>
        <p className="text-sm text-zinc-400 leading-relaxed mb-5">
          {currentStep.description}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="px-5 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            {isLast ? 'Get Started!' : 'Next'}
          </button>
        </div>
      </div>
    </>
  )
}
