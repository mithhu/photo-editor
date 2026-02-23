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

const DESKTOP_STEPS: TourStep[] = [
  {
    target: 'ai',
    title: 'AI Tools',
    description:
      'Remove backgrounds, upscale images, transfer artistic styles, and more — no cloud needed.',
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
    target: 'filters',
    title: 'Apply Filters',
    description:
      'Browse 165+ filters across 14 categories — from trending TikTok looks to classic film emulations.',
  },
  {
    target: 'share',
    title: 'Share & Export',
    description:
      'Export your creation or share a branded Before/After card on social media.',
  },
]

const MOBILE_STEPS: TourStep[] = [
  {
    target: 'filters',
    title: 'Filters',
    description:
      'Browse 165+ filters across 14 categories — from trending TikTok looks to classic film emulations.',
  },
  {
    target: 'beauty',
    title: 'AI Beauty',
    description:
      'Smooth skin, reshape features, and apply virtual makeup — all powered by AI.',
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
      'Remove backgrounds, upscale images, transfer styles — no cloud needed.',
  },
  {
    target: 'share',
    title: 'Share',
    description:
      'Export your creation or share on social media.',
  },
]

const STORAGE_KEY = 'photosai-tour-completed'
const PAD = 8
const GAP = 14

function isMobile(): boolean {
  return window.innerWidth < 1024
}

function getSteps(): TourStep[] {
  return isMobile() ? MOBILE_STEPS : DESKTOP_STEPS
}

function findElement(target: string): Element | null {
  return document.querySelector(`[data-tour="${target}"]`)
}

function getScrollableParent(el: Element): Element | null {
  let p = el.parentElement
  while (p) {
    const s = getComputedStyle(p)
    if (/(auto|scroll)/.test(s.overflow + s.overflowY + s.overflowX)) return p
    p = p.parentElement
  }
  return null
}

export function OnboardingTour({ active, onComplete }: OnboardingTourProps) {
  const [stepIdx, setStepIdx] = useState(0)
  const [spotRect, setSpotRect] = useState<DOMRect | null>(null)
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const steps = active ? getSteps() : []

  const done = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    try { localStorage.setItem(STORAGE_KEY, 'true') } catch { /* */ }
    setShow(false)
    onComplete()
  }, [onComplete])

  const locateAndShow = useCallback((idx: number, retries = 0) => {
    const s = getSteps()
    if (idx >= s.length) { done(); return }

    const el = findElement(s[idx].target)
    if (!el) {
      if (idx + 1 < s.length) locateAndShow(idx + 1, 0)
      else done()
      return
    }

    const scrollParent = getScrollableParent(el)
    if (scrollParent) {
      const parentRect = scrollParent.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const scrollOffset = elRect.top - parentRect.top + scrollParent.scrollTop
      scrollParent.scrollTo({ top: Math.max(0, scrollOffset - 30), behavior: 'smooth' })
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })

    timerRef.current = setTimeout(() => {
      const r = el.getBoundingClientRect()
      const inView =
        r.width > 0 &&
        r.height > 0 &&
        r.top < window.innerHeight &&
        r.bottom > 0 &&
        r.left < window.innerWidth &&
        r.right > 0

      if (inView) {
        setSpotRect(r)
        setStepIdx(idx)
        setShow(true)
      } else if (retries < 10) {
        timerRef.current = setTimeout(() => locateAndShow(idx, retries + 1), 300)
      } else {
        if (idx + 1 < s.length) locateAndShow(idx + 1, 0)
        else done()
      }
    }, 400)
  }, [done])

  useEffect(() => {
    if (!active) { setShow(false); return }
    setShow(false)
    setStepIdx(0)
    timerRef.current = setTimeout(() => locateAndShow(0, 0), 200)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [active, locateAndShow])

  const next = useCallback(() => {
    setShow(false)
    timerRef.current = setTimeout(() => locateAndShow(stepIdx + 1, 0), 100)
  }, [stepIdx, locateAndShow])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') done()
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (stepIdx >= steps.length - 1) done()
        else next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, done, next, stepIdx, steps.length])

  useEffect(() => {
    if (!active || !show) return
    const refresh = () => {
      const s = getSteps()
      if (stepIdx >= s.length) return
      const el = findElement(s[stepIdx].target)
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setSpotRect(r)
    }
    window.addEventListener('resize', refresh)
    window.addEventListener('scroll', refresh, true)
    return () => {
      window.removeEventListener('resize', refresh)
      window.removeEventListener('scroll', refresh, true)
    }
  }, [active, show, stepIdx])

  if (!active || !show || !spotRect || stepIdx >= steps.length) return null

  const currentStep = steps[stepIdx]
  const isLast = stepIdx === steps.length - 1
  const mobile = isMobile()

  const spot: React.CSSProperties = {
    position: 'fixed',
    top: spotRect.top - PAD,
    left: spotRect.left - PAD,
    width: spotRect.width + PAD * 2,
    height: spotRect.height + PAD * 2,
    borderRadius: 12,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
    pointerEvents: 'none',
    zIndex: 71,
    transition: 'all 0.3s ease',
  }

  const tw = 340
  const cx = spotRect.left + spotRect.width / 2
  let tLeft = Math.max(12, Math.min(cx - tw / 2, window.innerWidth - tw - 12))

  let tip: React.CSSProperties = { position: 'fixed', zIndex: 72, maxWidth: tw, width: tw }
  let arrow: 'top' | 'bottom' = 'top'

  if (mobile) {
    tip.left = tLeft
    tip.bottom = window.innerHeight - (spotRect.top - PAD - GAP - 10)
    arrow = 'bottom'
  } else {
    const below = window.innerHeight - (spotRect.bottom + PAD)
    if (below > 220) {
      tip.left = tLeft
      tip.top = spotRect.bottom + PAD + GAP
      arrow = 'top'
    } else {
      tip.left = tLeft
      tip.bottom = window.innerHeight - (spotRect.top - PAD) + GAP
      arrow = 'bottom'
    }
  }

  const arrowX = Math.max(20, Math.min(cx - tLeft, tw - 20))

  return (
    <>
      <div className="fixed inset-0 z-[70]" onClick={(e) => e.stopPropagation()} aria-hidden />
      <div style={spot} aria-hidden />
      <div
        ref={el => { /* noop ref */ }}
        style={tip}
        className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5"
        role="dialog"
        aria-label={currentStep.title}
      >
        {arrow === 'top' && (
          <div
            className="absolute -top-2 w-4 h-4 bg-zinc-900 border-l border-t border-zinc-700 rotate-45"
            style={{ left: arrowX }}
          />
        )}
        {arrow === 'bottom' && (
          <div
            className="absolute -bottom-2 w-4 h-4 bg-zinc-900 border-r border-b border-zinc-700 rotate-45"
            style={{ left: arrowX }}
          />
        )}

        <div className="flex items-center gap-1.5 mb-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === stepIdx
                  ? 'w-5 bg-purple-500'
                  : i < stepIdx
                    ? 'w-1.5 bg-purple-500/50'
                    : 'w-1.5 bg-zinc-600'
              }`}
            />
          ))}
          <span className="ml-auto text-xs text-zinc-500 tabular-nums">
            {stepIdx + 1}/{steps.length}
          </span>
        </div>

        <h3 className="text-base font-semibold text-white mb-1.5">{currentStep.title}</h3>
        <p className="text-sm text-zinc-400 leading-relaxed mb-5">{currentStep.description}</p>

        <div className="flex items-center justify-between">
          <button onClick={done} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Skip
          </button>
          <button
            onClick={isLast ? done : next}
            className="px-5 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            {isLast ? 'Get Started!' : 'Next'}
          </button>
        </div>
      </div>
    </>
  )
}
