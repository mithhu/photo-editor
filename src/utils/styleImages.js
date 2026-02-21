/**
 * Generates style reference images as canvas data URLs.
 * Avoids external image dependencies (no CORS, no rate-limiting).
 * Each image uses the color palette of its namesake painting.
 */

function createStyleCanvas(width, height, drawFn) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  drawFn(ctx, width, height)
  return canvas.toDataURL('image/png')
}

function starryNight(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, '#1a237e')
  grad.addColorStop(0.3, '#283593')
  grad.addColorStop(0.5, '#ffb300')
  grad.addColorStop(0.7, '#1565c0')
  grad.addColorStop(1, '#0d47a1')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * w
    const y = Math.random() * h * 0.6
    const r = 2 + Math.random() * 6
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 235, 59, ${0.3 + Math.random() * 0.7})`
    ctx.fill()
  }
  for (let x = 0; x < w; x += 4) {
    for (let y = 0; y < h; y += 4) {
      const swirl = Math.sin(x * 0.05 + y * 0.03) * 20
      if (Math.abs(swirl) > 15) {
        ctx.fillStyle = `rgba(255, 193, 7, ${0.15})`
        ctx.fillRect(x, y, 3, 3)
      }
    }
  }
}

function greatWave(ctx, w, h) {
  ctx.fillStyle = '#e8d8b8'
  ctx.fillRect(0, 0, w, h)
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#1565c0')
  grad.addColorStop(0.4, '#1976d2')
  grad.addColorStop(0.7, '#e8d8b8')
  grad.addColorStop(1, '#d7ccc8')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.moveTo(0, h * 0.3 + i * 15)
    for (let x = 0; x <= w; x += 10) {
      const y = h * 0.3 + i * 15 + Math.sin(x * 0.04 + i) * 25
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fillStyle = `rgba(21, 101, 192, ${0.15 + i * 0.05})`
    ctx.fill()
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * w
    const y = h * 0.2 + Math.random() * h * 0.4
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.fillRect(x, y, 2, 1)
  }
}

function theScream(ctx, w, h) {
  const grad = ctx.createRadialGradient(w / 2, h * 0.3, 10, w / 2, h / 2, w)
  grad.addColorStop(0, '#ff6f00')
  grad.addColorStop(0.3, '#e65100')
  grad.addColorStop(0.5, '#bf360c')
  grad.addColorStop(0.7, '#4a148c')
  grad.addColorStop(1, '#1a237e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  for (let y = 0; y < h; y += 3) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= w; x += 5) {
      ctx.lineTo(x, y + Math.sin(x * 0.08 + y * 0.02) * 4)
    }
    ctx.strokeStyle = `rgba(255, 87, 34, ${0.08})`
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function mosaic(ctx, w, h) {
  const colors = ['#8d6e63', '#a1887f', '#d7ccc8', '#795548', '#5d4037', '#efebe9', '#4e342e', '#bcaaa4', '#c62828', '#1565c0', '#2e7d32', '#f9a825']
  const tileSize = 8
  for (let x = 0; x < w; x += tileSize) {
    for (let y = 0; y < h; y += tileSize) {
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
      ctx.fillRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1)
    }
  }
  ctx.fillStyle = 'rgba(139, 119, 101, 0.15)'
  ctx.fillRect(0, 0, w, h)
}

let _cache = null

export function getStyleImages() {
  if (_cache) return _cache
  _cache = {
    'starry-night': createStyleCanvas(256, 256, starryNight),
    'great-wave': createStyleCanvas(256, 256, greatWave),
    'scream': createStyleCanvas(256, 256, theScream),
    'mosaic': createStyleCanvas(256, 256, mosaic),
  }
  return _cache
}
