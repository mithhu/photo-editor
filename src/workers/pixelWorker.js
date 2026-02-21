/**
 * Web Worker for heavy pixel processing.
 * Runs adjustments, color grading, film emulation, etc. off the main thread.
 */

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v))

function applyBrightness(r, g, b, f) { return [clamp(r * f), clamp(g * f), clamp(b * f)] }
function applyContrast(r, g, b, f) {
  return [clamp(((r / 255 - 0.5) * f + 0.5) * 255), clamp(((g / 255 - 0.5) * f + 0.5) * 255), clamp(((b / 255 - 0.5) * f + 0.5) * 255)]
}
function applySaturate(r, g, b, f) {
  const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return [clamp(gray + (r - gray) * f), clamp(gray + (g - gray) * f), clamp(gray + (b - gray) * f)]
}
function applySepia(r, g, b, a) {
  const sr = 0.393 * r + 0.769 * g + 0.189 * b, sg = 0.349 * r + 0.686 * g + 0.168 * b, sb = 0.272 * r + 0.534 * g + 0.131 * b
  return [clamp(r + (sr - r) * a), clamp(g + (sg - g) * a), clamp(b + (sb - b) * a)]
}
function applyGrayscale(r, g, b, a) {
  const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return [clamp(r + (gray - r) * a), clamp(g + (gray - g) * a), clamp(b + (gray - b) * a)]
}
function applyHueRotate(r, g, b, deg) {
  const rad = (deg * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad)
  return [
    clamp(r * (0.213 + cos * 0.787 - sin * 0.213) + g * (0.715 - cos * 0.715 - sin * 0.715) + b * (0.072 - cos * 0.072 + sin * 0.928)),
    clamp(r * (0.213 - cos * 0.213 + sin * 0.143) + g * (0.715 + cos * 0.285 + sin * 0.140) + b * (0.072 - cos * 0.072 - sin * 0.283)),
    clamp(r * (0.213 - cos * 0.213 - sin * 0.787) + g * (0.715 - cos * 0.715 + sin * 0.715) + b * (0.072 + cos * 0.928 + sin * 0.072)),
  ]
}

function applyBaseFilters(d, ops) {
  if (!ops?.length) return
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2]
    for (let j = 0; j < ops.length; j++) {
      const { type, value } = ops[j]
      switch (type) {
        case 'brightness': [r, g, b] = applyBrightness(r, g, b, value); break
        case 'contrast': [r, g, b] = applyContrast(r, g, b, value); break
        case 'saturate': [r, g, b] = applySaturate(r, g, b, value); break
        case 'sepia': [r, g, b] = applySepia(r, g, b, value); break
        case 'grayscale': [r, g, b] = applyGrayscale(r, g, b, value); break
        case 'hue-rotate': [r, g, b] = applyHueRotate(r, g, b, value); break
      }
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b
  }
}

// Monotone cubic spline LUT builder (same as curvesUtils.js)
function buildCurveLUT(points) {
  if (!points || points.length < 2) {
    const lut = new Uint8Array(256)
    for (let i = 0; i < 256; i++) lut[i] = i
    return lut
  }
  const sorted = [...points].sort((a, b) => a[0] - b[0])
  const xs = sorted.map(p => p[0])
  const ys = sorted.map(p => p[1])
  const n = xs.length
  const lut = new Uint8Array(256)

  if (n === 2) {
    for (let i = 0; i < 256; i++) {
      const t = i / 255
      const frac = xs[1] === xs[0] ? 0 : (t - xs[0]) / (xs[1] - xs[0])
      lut[i] = clamp((ys[0] + (ys[1] - ys[0]) * Math.max(0, Math.min(1, frac))) * 255)
    }
    return lut
  }

  const h = [], delta = [], m = new Float64Array(n)
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1] - xs[i])
    delta.push(h[i] === 0 ? 0 : (ys[i + 1] - ys[i]) / h[i])
  }
  m[0] = delta[0]; m[n - 1] = delta[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) { m[i] = 0 } else {
      m[i] = (delta[i - 1] + delta[i]) / 2
      if (Math.abs(m[i]) > 3 * Math.abs(delta[i - 1])) m[i] = 3 * delta[i - 1]
      if (Math.abs(m[i]) > 3 * Math.abs(delta[i])) m[i] = 3 * delta[i]
    }
  }

  for (let i = 0; i < 256; i++) {
    const t = i / 255
    let seg = 0
    for (let j = 0; j < n - 1; j++) { if (t >= xs[j]) seg = j }
    const segH = h[seg] || 1e-6
    const frac = (t - xs[seg]) / segH
    const frac2 = frac * frac, frac3 = frac2 * frac
    const val = ys[seg] * (2 * frac3 - 3 * frac2 + 1) + m[seg] * segH * (frac3 - 2 * frac2 + frac) +
      ys[seg + 1] * (-2 * frac3 + 3 * frac2) + m[seg + 1] * segH * (frac3 - frac2)
    lut[i] = clamp(val * 255)
  }
  return lut
}

// Film emulation functions
function koji(r, g, b) {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  r = clamp(r * 0.94 + 15); g = clamp(g * 0.94 + 12); b = clamp(b * 0.94 + 10)
  const hlW = Math.max(0, (lum - 0.5) * 2)
  r = clamp(r + hlW * 18); g = clamp(g + hlW * 8); b = clamp(b - hlW * 6)
  const shW = Math.max(0, (0.4 - lum) * 2.5)
  r = clamp(r - shW * 8); g = clamp(g + shW * 4); b = clamp(b + shW * 14)
  const midW = 1 - Math.abs(lum - 0.5) * 2
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  const ds = 0.08 * midW
  r = clamp(r + (gray - r) * ds); g = clamp(g + (gray - g) * ds); b = clamp(b + (gray - b) * ds)
  const c = 1.08
  return [clamp(((r / 255 - 0.5) * c + 0.5) * 255), clamp(((g / 255 - 0.5) * c + 0.5) * 255), clamp(((b / 255 - 0.5) * c + 0.5) * 255)]
}
function tokyo(r, g, b) {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.15); g = clamp(g + (gray - g) * 0.15); b = clamp(b + (gray - b) * 0.15)
  const hlW = Math.max(0, (lum - 0.4) * 2)
  r = clamp(r - hlW * 10); g = clamp(g + hlW * 6); b = clamp(b + hlW * 12)
  const shW = Math.max(0, (0.35 - lum) * 3)
  r = clamp(r + shW * 8); g = clamp(g - shW * 6); b = clamp(b + shW * 10)
  const c = 1.15
  r = clamp(((r / 255 - 0.5) * c + 0.5) * 255); g = clamp(((g / 255 - 0.5) * c + 0.5) * 255); b = clamp(((b / 255 - 0.5) * c + 0.5) * 255)
  return [clamp(r * 0.96 + 10), clamp(g * 0.96 + 10), clamp(b * 0.96 + 12)]
}
function portra(r, g, b) {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  r = clamp(r * 0.9 + 25); g = clamp(g * 0.9 + 22); b = clamp(b * 0.9 + 20)
  r = clamp(r + 6); b = clamp(b - 4)
  const c = 0.95
  r = clamp(((r / 255 - 0.5) * c + 0.5) * 255); g = clamp(((g / 255 - 0.5) * c + 0.5) * 255); b = clamp(((b / 255 - 0.5) * c + 0.5) * 255)
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (gray - r) * 0.1); g = clamp(g + (gray - g) * 0.1); b = clamp(b + (gray - b) * 0.1)
  const hlW = Math.max(0, (lum - 0.55) * 2)
  return [clamp(r + hlW * 8), clamp(g + hlW * 3), b]
}
function velvia(r, g, b) {
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  r = clamp(r + (r - gray) * 0.35); g = clamp(g + (g - gray) * 0.35); b = clamp(b + (b - gray) * 0.35)
  const c = 1.2
  r = clamp(((r / 255 - 0.5) * c + 0.5) * 255); g = clamp(((g / 255 - 0.5) * c + 0.5) * 255); b = clamp(((b / 255 - 0.5) * c + 0.5) * 255)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  if (b > r && b > g) b = clamp(b + 10)
  if (g > r && g > b) g = clamp(g + 8)
  const shW = Math.max(0, (0.2 - lum) * 5)
  return [clamp(r - shW * 5), clamp(g - shW * 5), clamp(b - shW * 5)]
}
function superia(r, g, b) {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const midW = 1 - Math.abs(lum - 0.5) * 2
  g = clamp(g + midW * 8); r = clamp(r - midW * 3)
  const shW = Math.max(0, (0.35 - lum) * 3)
  b = clamp(b + shW * 10); r = clamp(r - shW * 4)
  r = clamp(r * 0.95 + 12); g = clamp(g * 0.95 + 14); b = clamp(b * 0.95 + 16)
  const c = 1.05
  return [clamp(((r / 255 - 0.5) * c + 0.5) * 255), clamp(((g / 255 - 0.5) * c + 0.5) * 255), clamp(((b / 255 - 0.5) * c + 0.5) * 255)]
}
function aura(r, g, b) {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  r = clamp(r * 0.82 + 45); g = clamp(g * 0.82 + 40); b = clamp(b * 0.82 + 42)
  r = clamp(r + 8); g = clamp(g + 2); b = clamp(b - 3)
  const c = 0.88
  r = clamp(((r / 255 - 0.5) * c + 0.5) * 255); g = clamp(((g / 255 - 0.5) * c + 0.5) * 255); b = clamp(((b / 255 - 0.5) * c + 0.5) * 255)
  const hlW = Math.max(0, (lum - 0.6) * 2.5)
  return [clamp(r + hlW * 10), g, clamp(b + hlW * 5)]
}
const FILM_FNS = { koji, tokyo, portra, velvia, superia, aura }

function applyLUT3D(d, lut) {
  if (!lut || !lut.data) return
  const size = lut.size
  const lutData = lut.data
  const sm1 = size - 1

  for (let i = 0; i < d.length; i += 4) {
    const rIdx = (d[i] / 255) * sm1
    const gIdx = (d[i + 1] / 255) * sm1
    const bIdx = (d[i + 2] / 255) * sm1

    const r0 = Math.floor(rIdx), r1 = Math.min(r0 + 1, sm1), rf = rIdx - r0
    const g0 = Math.floor(gIdx), g1 = Math.min(g0 + 1, sm1), gf = gIdx - g0
    const b0 = Math.floor(bIdx), b1 = Math.min(b0 + 1, sm1), bf = bIdx - b0

    const idx = (ri, gi, bi) => (bi * size * size + gi * size + ri) * 3
    const i000 = idx(r0, g0, b0), i100 = idx(r1, g0, b0)
    const i010 = idx(r0, g1, b0), i110 = idx(r1, g1, b0)
    const i001 = idx(r0, g0, b1), i101 = idx(r1, g0, b1)
    const i011 = idx(r0, g1, b1), i111 = idx(r1, g1, b1)

    for (let c = 0; c < 3; c++) {
      const c00 = lutData[i000 + c] * (1 - rf) + lutData[i100 + c] * rf
      const c10 = lutData[i010 + c] * (1 - rf) + lutData[i110 + c] * rf
      const c01 = lutData[i001 + c] * (1 - rf) + lutData[i101 + c] * rf
      const c11 = lutData[i011 + c] * (1 - rf) + lutData[i111 + c] * rf
      const c0 = c00 * (1 - gf) + c10 * gf
      const c1 = c01 * (1 - gf) + c11 * gf
      d[i + c] = clamp((c0 * (1 - bf) + c1 * bf) * 255)
    }
  }
}

// Gradient map / duotone
function applyGradientMap(d, params) {
  if (!params?.enabled) return
  const { shadows, highlights, intensity } = params
  const sR = parseInt(shadows.slice(1, 3), 16)
  const sG = parseInt(shadows.slice(3, 5), 16)
  const sB = parseInt(shadows.slice(5, 7), 16)
  const hR = parseInt(highlights.slice(1, 3), 16)
  const hG = parseInt(highlights.slice(3, 5), 16)
  const hB = parseInt(highlights.slice(5, 7), 16)
  const mix = intensity ?? 1

  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255
    const mr = sR + (hR - sR) * lum
    const mg = sG + (hG - sG) * lum
    const mb = sB + (hB - sB) * lum
    d[i] = clamp(d[i] + (mr - d[i]) * mix)
    d[i + 1] = clamp(d[i + 1] + (mg - d[i + 1]) * mix)
    d[i + 2] = clamp(d[i + 2] + (mb - d[i + 2]) * mix)
  }
}

self.onmessage = function (e) {
  const { type, data, width, height, params } = e.data

  if (type === 'processPixels') {
    const d = new Uint8ClampedArray(data)
    const {
      baseFilterOps, warmth, tint, vibrance, clarity, dehaze,
      hsl, curves, colorGrade, splitTone, selectiveColor,
      filmEmulation, filmIntensity, lut, gradientMap,
      chromaticAberration,
      sharpen,
      glitch,
      oilPaint,
      posterize,
      solarize,
      emboss,
      channelMixer,
    } = params

    // Base filters
    if (baseFilterOps?.length) applyBaseFilters(d, baseFilterOps)

    const warmShift = (warmth || 0) * 30
    const tintShift = (tint || 0) * 30
    const hasHSL = hsl && Object.values(hsl).some(c => c.h !== 0 || c.s !== 0 || c.l !== 0)
    const hasCurves = curves && Object.entries(curves).some(([, pts]) =>
      pts.length > 2 || (pts.length === 2 && (pts[0][0] !== 0 || pts[0][1] !== 0 || pts[1][0] !== 1 || pts[1][1] !== 1))
    )
    const hasColorGrade = colorGrade && (
      (colorGrade.shadows?.r || colorGrade.shadows?.g || colorGrade.shadows?.b) ||
      (colorGrade.midtones?.r || colorGrade.midtones?.g || colorGrade.midtones?.b) ||
      (colorGrade.highlights?.r || colorGrade.highlights?.g || colorGrade.highlights?.b)
    )
    const hasSplitTone = splitTone && ((splitTone.shadowSat || 0) > 0 || (splitTone.highlightSat || 0) > 0)
    const hasSelectiveColor = selectiveColor?.enabled

    let rgbLUT, rLUT, gLUT, bLUT
    if (hasCurves) {
      rgbLUT = buildCurveLUT(curves.rgb)
      rLUT = buildCurveLUT(curves.red)
      gLUT = buildCurveLUT(curves.green)
      bLUT = buildCurveLUT(curves.blue)
    }

    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, Math.max(0, d[i] + warmShift))
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] - warmShift))
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + tintShift))

      if (vibrance) {
        const r = d[i], g = d[i + 1], b = d[i + 2]
        const mx = Math.max(r, g, b), avg = (r + g + b) / 3
        const amt = ((mx - avg) / 255) * (-vibrance * 2)
        d[i] += (mx - r) * amt; d[i + 1] += (mx - g) * amt; d[i + 2] += (mx - b) * amt
      }
      if (clarity) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        const midW = 1 - Math.abs(lum - 128) / 128
        const boost = clarity * midW * 40
        d[i] = Math.min(255, Math.max(0, d[i] + boost * (d[i] > lum ? 1 : -1) * 0.5))
        d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + boost * (d[i + 1] > lum ? 1 : -1) * 0.5))
        d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + boost * (d[i + 2] > lum ? 1 : -1) * 0.5))
      }
      if (dehaze) {
        const f = 1 + dehaze * 0.4
        d[i] = Math.min(255, Math.max(0, ((d[i] / 255 - 0.5) * f + 0.5) * 255))
        d[i + 1] = Math.min(255, Math.max(0, ((d[i + 1] / 255 - 0.5) * f + 0.5) * 255))
        d[i + 2] = Math.min(255, Math.max(0, ((d[i + 2] / 255 - 0.5) * f + 0.5) * 255))
      }
      if (hasHSL) {
        let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        let h, s, l = (max + min) / 2
        if (max === min) { h = s = 0 } else {
          const delta = max - min
          s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
          if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6
          else if (max === g) h = ((b - r) / delta + 2) / 6
          else h = ((r - g) / delta + 4) / 6
        }
        const hDeg = h * 360
        let colorKey = null
        if (hDeg < 15 || hDeg >= 345) colorKey = 'red'
        else if (hDeg < 45) colorKey = 'orange'
        else if (hDeg < 75) colorKey = 'yellow'
        else if (hDeg < 150) colorKey = 'green'
        else if (hDeg < 195) colorKey = 'cyan'
        else if (hDeg < 255) colorKey = 'blue'
        else if (hDeg < 300) colorKey = 'purple'
        else colorKey = 'magenta'
        const adj = hsl[colorKey]
        if (adj && (adj.h !== 0 || adj.s !== 0 || adj.l !== 0)) {
          h = (h + adj.h * 0.1 + 1) % 1
          s = Math.min(1, Math.max(0, s + adj.s * 0.5))
          l = Math.min(1, Math.max(0, l + adj.l * 0.3))
          let r2, g2, b2
          if (s === 0) { r2 = g2 = b2 = l } else {
            const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p }
            const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s, p2 = 2 * l - q2
            r2 = hue2rgb(p2, q2, h + 1 / 3); g2 = hue2rgb(p2, q2, h); b2 = hue2rgb(p2, q2, h - 1 / 3)
          }
          d[i] = Math.round(r2 * 255); d[i + 1] = Math.round(g2 * 255); d[i + 2] = Math.round(b2 * 255)
        }
      }
      if (hasCurves) {
        d[i] = rLUT[rgbLUT[clamp(d[i])]]; d[i + 1] = gLUT[rgbLUT[clamp(d[i + 1])]]; d[i + 2] = bLUT[rgbLUT[clamp(d[i + 2])]]
      }
      if (hasColorGrade) {
        const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255
        const sw = Math.max(0, 1 - lum * 3), hw = Math.max(0, (lum - 0.66) * 3), mw = 1 - sw - hw
        d[i] = clamp(d[i] + (colorGrade.shadows?.r || 0) * sw * 30 + (colorGrade.midtones?.r || 0) * mw * 30 + (colorGrade.highlights?.r || 0) * hw * 30)
        d[i + 1] = clamp(d[i + 1] + (colorGrade.shadows?.g || 0) * sw * 30 + (colorGrade.midtones?.g || 0) * mw * 30 + (colorGrade.highlights?.g || 0) * hw * 30)
        d[i + 2] = clamp(d[i + 2] + (colorGrade.shadows?.b || 0) * sw * 30 + (colorGrade.midtones?.b || 0) * mw * 30 + (colorGrade.highlights?.b || 0) * hw * 30)
      }
      if (hasSplitTone) {
        const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255
        const bal = (splitTone.balance || 0) * 0.5 + 0.5
        let hue, sat, weight
        if (lum < bal) { hue = splitTone.shadowHue || 0; sat = splitTone.shadowSat || 0; weight = (bal - lum) / Math.max(bal, 0.01) }
        else { hue = splitTone.highlightHue || 0; sat = splitTone.highlightSat || 0; weight = (lum - bal) / Math.max(1 - bal, 0.01) }
        if (sat > 0) {
          const angle = hue * Math.PI * 2
          d[i] = clamp(d[i] + Math.cos(angle) * sat * weight * 40)
          d[i + 1] = clamp(d[i + 1] + Math.cos(angle - 2.094) * sat * weight * 40)
          d[i + 2] = clamp(d[i + 2] + Math.cos(angle + 2.094) * sat * weight * 40)
        }
      }
      if (hasSelectiveColor) {
        const sr = d[i] / 255, sg = d[i + 1] / 255, sb = d[i + 2] / 255
        const smax = Math.max(sr, sg, sb), smin = Math.min(sr, sg, sb)
        if (smax !== smin) {
          const sdelta = smax - smin
          let sh
          if (smax === sr) sh = ((sg - sb) / sdelta + (sg < sb ? 6 : 0)) * 60
          else if (smax === sg) sh = ((sb - sr) / sdelta + 2) * 60
          else sh = ((sr - sg) / sdelta + 4) * 60
          let hueDiff = Math.abs(sh - selectiveColor.hue)
          if (hueDiff > 180) hueDiff = 360 - hueDiff
          if (hueDiff > selectiveColor.range) {
            const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
            d[i] = gray; d[i + 1] = gray; d[i + 2] = gray
          }
        } else {
          const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
          d[i] = gray; d[i + 1] = gray; d[i + 2] = gray
        }
      }
    }

    // Film emulation
    if (filmEmulation && FILM_FNS[filmEmulation]) {
      const fn = FILM_FNS[filmEmulation]
      const intensity = filmIntensity ?? 1
      for (let i = 0; i < d.length; i += 4) {
        const [nr, ng, nb] = fn(d[i], d[i + 1], d[i + 2])
        if (intensity >= 1) { d[i] = nr; d[i + 1] = ng; d[i + 2] = nb }
        else { d[i] = clamp(d[i] + (nr - d[i]) * intensity); d[i + 1] = clamp(d[i + 1] + (ng - d[i + 1]) * intensity); d[i + 2] = clamp(d[i + 2] + (nb - d[i + 2]) * intensity) }
      }
    }

    // LUT
    if (lut) applyLUT3D(d, lut)

    // Gradient map / duotone
    applyGradientMap(d, gradientMap)

    // Chromatic Aberration
    const caShift = chromaticAberration || 0
    if (caShift > 0) {
      const src = new Uint8ClampedArray(d)
      const w = width, h = height
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          const rx = Math.max(0, Math.min(w - 1, x - caShift))
          const ri = (y * w + rx) * 4
          d[i] = src[ri]
          const bx = Math.max(0, Math.min(w - 1, x + caShift))
          const bi = (y * w + bx) * 4
          d[i + 2] = src[bi + 2]
        }
      }
    }

    // Sharpen (unsharp mask)
    const sharpenAmt = sharpen || 0
    if (sharpenAmt > 0) {
      const amt = sharpenAmt / 100
      const src = new Uint8ClampedArray(d)
      const w = width, h = height
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = (y * w + x) * 4
          for (let c = 0; c < 3; c++) {
            const center = src[i + c] * 5
            const neighbors = src[((y - 1) * w + x) * 4 + c] +
                              src[((y + 1) * w + x) * 4 + c] +
                              src[(y * w + x - 1) * 4 + c] +
                              src[(y * w + x + 1) * 4 + c]
            const sharpened = center - neighbors
            d[i + c] = Math.max(0, Math.min(255, src[i + c] + sharpened * amt))
          }
        }
      }
    }

    // Glitch effect
    const glitchAmt = glitch || 0
    if (glitchAmt > 0) {
      const intensity = glitchAmt / 100
      const src = new Uint8ClampedArray(d)
      const w = width, h = height
      const numSlices = Math.floor(2 + intensity * 20)
      let seed = w * h
      const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647 }

      for (let s = 0; s < numSlices; s++) {
        const sliceY = Math.floor(rand() * h)
        const sliceH = Math.floor(1 + rand() * intensity * 30)
        const offset = Math.floor((rand() - 0.5) * intensity * w * 0.3)

        for (let dy = 0; dy < sliceH && sliceY + dy < h; dy++) {
          const y = sliceY + dy
          for (let x = 0; x < w; x++) {
            const di = (y * w + x) * 4
            const sx = Math.max(0, Math.min(w - 1, x + offset))
            const si = (y * w + sx) * 4
            d[di] = src[si]
            d[di + 1] = src[di + 1]
            d[di + 2] = src[si + 2]
          }
        }
      }

      if (intensity > 0.3) {
        const channelShift = Math.floor(intensity * 8)
        for (let y = 0; y < h; y += Math.floor(3 + rand() * 10)) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4
            const rx = Math.min(w - 1, x + channelShift)
            d[i] = src[(y * w + rx) * 4]
          }
        }
      }
    }

    // Oil Paint effect
    const oilRadius = oilPaint || 0
    if (oilRadius > 0) {
      const src = new Uint8ClampedArray(d)
      const w = width, h = height
      const r = Math.min(oilRadius, 5)
      const levels = 20

      for (let y = r; y < h - r; y++) {
        for (let x = r; x < w - r; x++) {
          const bins = new Uint32Array(levels)
          const binR = new Float32Array(levels)
          const binG = new Float32Array(levels)
          const binB = new Float32Array(levels)

          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              const si = ((y + dy) * w + (x + dx)) * 4
              const intensity = Math.floor(((src[si] + src[si + 1] + src[si + 2]) / 3) * levels / 256)
              const bin = Math.min(levels - 1, intensity)
              bins[bin]++
              binR[bin] += src[si]
              binG[bin] += src[si + 1]
              binB[bin] += src[si + 2]
            }
          }

          let maxBin = 0, maxCount = 0
          for (let b = 0; b < levels; b++) {
            if (bins[b] > maxCount) { maxCount = bins[b]; maxBin = b }
          }

          const di = (y * w + x) * 4
          if (maxCount > 0) {
            d[di] = Math.round(binR[maxBin] / maxCount)
            d[di + 1] = Math.round(binG[maxBin] / maxCount)
            d[di + 2] = Math.round(binB[maxBin] / maxCount)
          }
        }
      }
    }

    // Posterize
    const posterizeLvl = posterize || 0
    if (posterizeLvl >= 2) {
      const step = 255 / (posterizeLvl - 1)
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.round(Math.round(d[i] / step) * step)
        d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step)
        d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step)
      }
    }

    // Solarize
    const solarizeThresh = solarize || 0
    if (solarizeThresh > 0) {
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] < solarizeThresh) d[i] = 255 - d[i]
        if (d[i + 1] < solarizeThresh) d[i + 1] = 255 - d[i + 1]
        if (d[i + 2] < solarizeThresh) d[i + 2] = 255 - d[i + 2]
      }
    }

    // Emboss
    const embossAmt = emboss || 0
    if (embossAmt > 0) {
      const amt = embossAmt / 100
      const src = new Uint8ClampedArray(d)
      const w = width, h = height
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = (y * w + x) * 4
          for (let c = 0; c < 3; c++) {
            const val = -src[((y - 1) * w + (x - 1)) * 4 + c]
                        -src[((y - 1) * w + x) * 4 + c]
                        -src[(y * w + (x - 1)) * 4 + c]
                        +src[((y + 1) * w + (x + 1)) * 4 + c]
                        +src[((y + 1) * w + x) * 4 + c]
                        +src[(y * w + (x + 1)) * 4 + c]
            const embossed = Math.max(0, Math.min(255, 128 + val))
            d[i + c] = Math.round(src[i + c] * (1 - amt) + embossed * amt)
          }
        }
      }
    }

    // Channel Mixer
    const cm = channelMixer
    if (cm) {
      const isDefault = cm.red.r === 100 && cm.red.g === 0 && cm.red.b === 0 &&
                        cm.green.r === 0 && cm.green.g === 100 && cm.green.b === 0 &&
                        cm.blue.r === 0 && cm.blue.g === 0 && cm.blue.b === 100
      if (!isDefault) {
        const src = new Uint8ClampedArray(d)
        for (let i = 0; i < d.length; i += 4) {
          const sr = src[i], sg = src[i + 1], sb = src[i + 2]
          d[i] = Math.max(0, Math.min(255, (sr * cm.red.r + sg * cm.red.g + sb * cm.red.b) / 100))
          d[i + 1] = Math.max(0, Math.min(255, (sr * cm.green.r + sg * cm.green.g + sb * cm.green.b) / 100))
          d[i + 2] = Math.max(0, Math.min(255, (sr * cm.blue.r + sg * cm.blue.g + sb * cm.blue.b) / 100))
        }
      }
    }

    self.postMessage({ type: 'pixelsProcessed', data: d.buffer, width, height }, [d.buffer])
  }
}
