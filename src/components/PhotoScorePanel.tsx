import { useState, useCallback } from 'react'
import { analyzePhotoScore, type PhotoScoreResult } from '../utils/photoScore'

interface PhotoScorePanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

const SUB_SCORE_KEYS = ['composition', 'lighting', 'color', 'sharpness'] as const

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#eab308'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

function scoreTailwind(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

function barBg(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

function gradeStyle(grade: string): string {
  if (grade.startsWith('S')) return 'from-amber-400 to-yellow-500 text-zinc-900'
  if (grade.startsWith('A')) return 'from-green-400 to-emerald-500 text-zinc-900'
  if (grade === 'B+' || grade === 'B') return 'from-blue-400 to-indigo-500 text-white'
  return 'from-zinc-500 to-zinc-600 text-white'
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 54
  const stroke = 8
  const circumference = 2 * Math.PI * radius
  const arc = circumference * 0.75
  const offset = arc - (arc * score) / 100
  const color = scoreColor(score)

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="drop-shadow-lg">
      <circle
        cx="70" cy="70" r={radius}
        fill="none" stroke="#3f3f46" strokeWidth={stroke}
        strokeDasharray={`${arc} ${circumference}`}
        strokeDashoffset="0"
        strokeLinecap="round"
        transform="rotate(135 70 70)"
      />
      <circle
        cx="70" cy="70" r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${arc} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(135 70 70)"
        className="transition-all duration-1000 ease-out"
      />
      <text
        x="70" y="66" textAnchor="middle" dominantBaseline="central"
        className="fill-white text-3xl font-bold" style={{ fontSize: 36 }}
      >
        {score}
      </text>
      <text
        x="70" y="92" textAnchor="middle"
        className="fill-zinc-400 text-xs" style={{ fontSize: 11 }}
      >
        / 100
      </text>
    </svg>
  )
}

function SubScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex-1 min-w-[70px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-zinc-400 uppercase tracking-wide">{label}</span>
        <span className={`text-xs font-semibold ${scoreTailwind(score)}`}>{score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-700 overflow-hidden">
        <div
          className={`h-full rounded-full ${barBg(score)} transition-all duration-700 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

function drawShareCard(result: PhotoScoreResult): HTMLCanvasElement {
  const W = 400
  const H = 520
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!

  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#18181b')
  grad.addColorStop(0.5, '#1e1b4b')
  grad.addColorStop(1, '#18181b')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#a78bfa'
  ctx.font = 'bold 16px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('PhotosAI Photo Score', W / 2, 40)

  ctx.strokeStyle = '#3f3f46'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(40, 55)
  ctx.lineTo(W - 40, 55)
  ctx.stroke()

  const cx = W / 2
  const cy = 150
  const r = 54
  const sw = 8
  const circ = 2 * Math.PI * r
  const arcLen = circ * 0.75

  ctx.lineWidth = sw
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.strokeStyle = '#3f3f46'
  ctx.setLineDash([])
  const startAngle = (135 * Math.PI) / 180
  ctx.arc(cx, cy, r, startAngle, startAngle + (arcLen / r))
  ctx.stroke()

  const fillAngle = startAngle + ((arcLen * result.overall) / 100) / r
  ctx.beginPath()
  ctx.strokeStyle = scoreColor(result.overall)
  ctx.arc(cx, cy, r, startAngle, fillAngle)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 36px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(String(result.overall), cx, cy + 6)

  ctx.fillStyle = '#a1a1aa'
  ctx.font = '11px system-ui, sans-serif'
  ctx.fillText('/ 100', cx, cy + 26)

  const badgeX = cx + 80
  const badgeY = cy - 20
  const bw = 48
  const bh = 28
  const gradient = ctx.createLinearGradient(badgeX - bw / 2, badgeY - bh / 2, badgeX + bw / 2, badgeY + bh / 2)
  if (result.grade.startsWith('S')) {
    gradient.addColorStop(0, '#fbbf24')
    gradient.addColorStop(1, '#eab308')
  } else if (result.grade.startsWith('A')) {
    gradient.addColorStop(0, '#4ade80')
    gradient.addColorStop(1, '#10b981')
  } else {
    gradient.addColorStop(0, '#818cf8')
    gradient.addColorStop(1, '#6366f1')
  }

  ctx.beginPath()
  const br = 6
  ctx.moveTo(badgeX - bw / 2 + br, badgeY - bh / 2)
  ctx.lineTo(badgeX + bw / 2 - br, badgeY - bh / 2)
  ctx.quadraticCurveTo(badgeX + bw / 2, badgeY - bh / 2, badgeX + bw / 2, badgeY - bh / 2 + br)
  ctx.lineTo(badgeX + bw / 2, badgeY + bh / 2 - br)
  ctx.quadraticCurveTo(badgeX + bw / 2, badgeY + bh / 2, badgeX + bw / 2 - br, badgeY + bh / 2)
  ctx.lineTo(badgeX - bw / 2 + br, badgeY + bh / 2)
  ctx.quadraticCurveTo(badgeX - bw / 2, badgeY + bh / 2, badgeX - bw / 2, badgeY + bh / 2 - br)
  ctx.lineTo(badgeX - bw / 2, badgeY - bh / 2 + br)
  ctx.quadraticCurveTo(badgeX - bw / 2, badgeY - bh / 2, badgeX - bw / 2 + br, badgeY - bh / 2)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()

  ctx.fillStyle = result.grade.startsWith('S') || result.grade.startsWith('A') ? '#18181b' : '#ffffff'
  ctx.font = 'bold 14px system-ui, sans-serif'
  ctx.fillText(result.grade, badgeX, badgeY + 5)

  const barY = 240
  const barLabels = ['Composition', 'Lighting', 'Color', 'Sharpness'] as const
  const barValues = [result.composition, result.lighting, result.color, result.sharpness]
  const barW = 300
  const barH = 6
  const barLeft = (W - barW) / 2
  const barSpacing = 40

  barLabels.forEach((label, i) => {
    const y = barY + i * barSpacing
    ctx.fillStyle = '#a1a1aa'
    ctx.font = '11px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(label, barLeft, y)

    ctx.textAlign = 'right'
    ctx.fillStyle = scoreColor(barValues[i])
    ctx.font = 'bold 12px system-ui, sans-serif'
    ctx.fillText(String(barValues[i]), barLeft + barW, y)

    ctx.fillStyle = '#3f3f46'
    ctx.beginPath()
    ctx.roundRect(barLeft, y + 6, barW, barH, 3)
    ctx.fill()

    ctx.fillStyle = scoreColor(barValues[i])
    ctx.beginPath()
    ctx.roundRect(barLeft, y + 6, barW * (barValues[i] / 100), barH, 3)
    ctx.fill()
  })

  const moodY = barY + 4 * barSpacing + 10
  ctx.fillStyle = '#312e81'
  ctx.beginPath()
  const moodW = ctx.measureText(result.mood).width + 24
  ctx.roundRect(cx - moodW / 2, moodY, moodW, 26, 13)
  ctx.fill()
  ctx.fillStyle = '#a78bfa'
  ctx.font = '12px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(result.mood, cx, moodY + 17)

  ctx.fillStyle = '#52525b'
  ctx.font = '10px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('photosai.vercel.app', cx, H - 16)

  return c
}

async function shareScoreCard(result: PhotoScoreResult): Promise<void> {
  const canvas = drawShareCard(result)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  )
  if (!blob) return

  if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
      return
    } catch {
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'photo-score.png'
  a.click()
  URL.revokeObjectURL(url)
}

export function PhotoScorePanel({ canvasRef }: PhotoScorePanelProps) {
  const [result, setResult] = useState<PhotoScoreResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [shared, setShared] = useState(false)

  const handleAnalyze = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    setLoading(true)
    setResult(null)
    requestAnimationFrame(() => {
      const score = analyzePhotoScore(canvas)
      setResult(score)
      setLoading(false)
    })
  }, [canvasRef])

  const handleShare = useCallback(async () => {
    if (!result) return
    setShared(false)
    await shareScoreCard(result)
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }, [result])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-400">Analyzing your photo…</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <button
          onClick={handleAnalyze}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-900/30 active:scale-95"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" />
            <path d="M15 12l.75 2.25L18 15l-2.25.75L15 18l-.75-2.25L12 15l2.25-.75L15 12z" opacity=".6" />
          </svg>
          Rate My Photo
        </button>
        <p className="text-xs text-zinc-500">Get an AI score for your photo</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4 px-2">
      <div className="flex items-center gap-4">
        <ScoreGauge score={result.overall} />
        <div
          className={`px-4 py-2 rounded-lg bg-gradient-to-br font-bold text-lg shadow-md ${gradeStyle(result.grade)}`}
        >
          {result.grade}
        </div>
      </div>

      <div className="flex gap-3 w-full px-1">
        {SUB_SCORE_KEYS.map((key) => (
          <SubScoreBar
            key={key}
            label={key}
            score={result[key]}
          />
        ))}
      </div>

      <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
        {result.mood}
      </span>

      <div className="w-full rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3">
        <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wide">Tip</p>
        <p className="text-sm text-zinc-300">{result.tip}</p>
      </div>

      <div className="flex gap-2 w-full">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          {shared ? (
            <>
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
              Share Score
            </>
          )}
        </button>
        <button
          onClick={handleAnalyze}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Analyze Again
        </button>
      </div>
    </div>
  )
}
