/**
 * Multi-pass WebGL rendering pipeline.
 *
 * Pass 1 — Per-pixel color: base adjustments, filter ops, HSL, curves,
 *   color grading, split tone, film emulation, selective color, posterize,
 *   solarize, channel mixer, gradient map, chromatic aberration.
 * Pass 2 — Convolution: sharpen (unsharp mask) and emboss.
 * Pass 3 — Post-effects: grain (procedural noise) and tilt-shift blur
 *   (separable Gaussian via two sub-passes) with vignette.
 *
 * Uses ping-pong framebuffers so each pass reads the previous pass's output.
 * Falls back silently if WebGL is unavailable.
 */

// ─── Shared vertex shader ────────────────────────────────────────────
const VERT_SRC = `
attribute vec2 a_pos;
attribute vec2 a_uv;
varying vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

// ─── Pass 1: Per-pixel color processing ──────────────────────────────
const FRAG_COLOR = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;

// Basic adjustments
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_warmth;
uniform float u_tint;
uniform float u_vibrance;
uniform float u_clarity;
uniform float u_dehaze;

// Filter preset ops (up to 6)
uniform int u_filterCount;
uniform int u_filterTypes[6];   // 0=brightness,1=contrast,2=saturate,3=sepia,4=grayscale,5=hue-rotate
uniform float u_filterValues[6];

// HSL (8 color ranges × 3 channels = 24 floats)
uniform float u_hslH[8];
uniform float u_hslS[8];
uniform float u_hslL[8];

// Curves — baked into a 256×4 lookup texture (RGBA = RGB curve, A = master)
uniform sampler2D u_curvesLUT;
uniform bool u_hasCurves;

// Color grading
uniform vec3 u_cgShadows;
uniform vec3 u_cgMidtones;
uniform vec3 u_cgHighlights;

// Split toning
uniform float u_stShadowHue;
uniform float u_stShadowSat;
uniform float u_stHighlightHue;
uniform float u_stHighlightSat;
uniform float u_stBalance;

// Selective color
uniform bool u_selectiveEnabled;
uniform float u_selectiveHue;
uniform float u_selectiveRange;

// Film emulation — encoded as uniforms
uniform int u_filmId;
uniform float u_filmIntensity;

// Posterize / Solarize
uniform float u_posterize;
uniform float u_solarize;

// Channel mixer (3×3 matrix, row-major, divided by 100)
uniform mat3 u_channelMixer;
uniform bool u_hasChannelMixer;

// Gradient map
uniform bool u_hasGradientMap;
uniform vec3 u_gmShadowColor;
uniform vec3 u_gmHighlightColor;
uniform float u_gmIntensity;

// Chromatic aberration
uniform float u_caShift;

// ─── Helpers ─────────────────────────────────────────────────────────

vec3 rgb2hsl(vec3 c) {
  float mx = max(c.r, max(c.g, c.b));
  float mn = min(c.r, min(c.g, c.b));
  float l = (mx + mn) * 0.5;
  if (mx == mn) return vec3(0.0, 0.0, l);
  float d = mx - mn;
  float s = l > 0.5 ? d / (2.0 - mx - mn) : d / (mx + mn);
  float h;
  if (mx == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
  else h = (c.r - c.g) / d + 4.0;
  h /= 6.0;
  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 0.5) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  if (hsl.y == 0.0) return vec3(hsl.z);
  float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
  float p = 2.0 * hsl.z - q;
  return vec3(
    hue2rgb(p, q, hsl.x + 1.0/3.0),
    hue2rgb(p, q, hsl.x),
    hue2rgb(p, q, hsl.x - 1.0/3.0)
  );
}

vec3 applySepia(vec3 c, float amt) {
  vec3 s = vec3(
    0.393*c.r + 0.769*c.g + 0.189*c.b,
    0.349*c.r + 0.686*c.g + 0.168*c.b,
    0.272*c.r + 0.534*c.g + 0.131*c.b
  );
  return mix(c, s, amt);
}

vec3 applyGrayscale(vec3 c, float amt) {
  float g = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return mix(c, vec3(g), amt);
}

vec3 applyHueRotate(vec3 c, float deg) {
  float rad = deg * 3.14159265 / 180.0;
  float cs = cos(rad);
  float sn = sin(rad);
  mat3 m = mat3(
    0.213 + cs*0.787 - sn*0.213, 0.213 - cs*0.213 + sn*0.143, 0.213 - cs*0.213 - sn*0.787,
    0.715 - cs*0.715 - sn*0.715, 0.715 + cs*0.285 + sn*0.140, 0.715 - cs*0.715 + sn*0.715,
    0.072 - cs*0.072 + sn*0.928, 0.072 - cs*0.072 - sn*0.283, 0.072 + cs*0.928 + sn*0.072
  );
  return clamp(m * c, 0.0, 1.0);
}

// HSL color range indices: 0=red,1=orange,2=yellow,3=green,4=cyan,5=blue,6=purple,7=magenta
int getHueRange(float h) {
  float hd = h * 360.0;
  if (hd < 15.0 || hd >= 345.0) return 0;  // red
  if (hd < 45.0) return 1;   // orange
  if (hd < 75.0) return 2;   // yellow
  if (hd < 165.0) return 3;  // green
  if (hd < 195.0) return 4;  // cyan
  if (hd < 255.0) return 5;  // blue
  if (hd < 285.0) return 6;  // purple
  return 7;                    // magenta
}

// Film emulations — each as a GLSL function encoded by ID
vec3 filmTransform(vec3 c, int id) {
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 o = c;

  // 0=koji
  if (id == 0) {
    o = o * 0.94 + vec3(15.0, 12.0, 10.0) / 255.0;
    float hlW = max(0.0, (lum - 0.5) * 2.0);
    o += hlW * vec3(18.0, 8.0, -6.0) / 255.0;
    float shW = max(0.0, (0.4 - lum) * 2.5);
    o += shW * vec3(-8.0, 4.0, 14.0) / 255.0;
    float midW = 1.0 - abs(lum - 0.5) * 2.0;
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    o = mix(o, vec3(gray), 0.08 * midW);
    o = (o - 0.5) * 1.08 + 0.5;
  }
  // 1=tokyo
  else if (id == 1) {
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    o = mix(o, vec3(gray), 0.15);
    float hlW = max(0.0, (lum - 0.4) * 2.0);
    o += hlW * vec3(-10.0, 6.0, 12.0) / 255.0;
    float shW = max(0.0, (0.35 - lum) * 3.0);
    o += shW * vec3(8.0, -6.0, 10.0) / 255.0;
    o = (o - 0.5) * 1.15 + 0.5;
    o = o * 0.96 + vec3(10.0, 10.0, 12.0) / 255.0;
  }
  // 2=portra
  else if (id == 2) {
    o = o * 0.9 + vec3(25.0, 22.0, 20.0) / 255.0;
    o += vec3(6.0, 0.0, -4.0) / 255.0;
    o = (o - 0.5) * 0.95 + 0.5;
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    o = mix(o, vec3(gray), 0.1);
    float hlW = max(0.0, (lum - 0.55) * 2.0);
    o += hlW * vec3(8.0, 3.0, 0.0) / 255.0;
  }
  // 3=velvia
  else if (id == 3) {
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    o += (o - gray) * 0.35;
    o = (o - 0.5) * 1.2 + 0.5;
    float shW = max(0.0, (0.2 - lum) * 5.0);
    o -= shW * vec3(5.0) / 255.0;
  }
  // 4=superia
  else if (id == 4) {
    float midW = 1.0 - abs(lum - 0.5) * 2.0;
    o += midW * vec3(-3.0, 8.0, 0.0) / 255.0;
    float shW = max(0.0, (0.35 - lum) * 3.0);
    o += shW * vec3(-4.0, 0.0, 10.0) / 255.0;
    o = o * 0.95 + vec3(12.0, 14.0, 16.0) / 255.0;
    o = (o - 0.5) * 1.05 + 0.5;
  }
  // 5=aura
  else if (id == 5) {
    o = o * 0.82 + vec3(45.0, 40.0, 42.0) / 255.0;
    o += vec3(8.0, 2.0, -3.0) / 255.0;
    o = (o - 0.5) * 0.88 + 0.5;
    float hlW = max(0.0, (lum - 0.6) * 2.5);
    o += hlW * vec3(10.0, 0.0, 5.0) / 255.0;
  }
  // 6=havana
  else if (id == 6) {
    o = o * 0.92 + vec3(20.0, 14.0, 8.0) / 255.0;
    o += vec3(12.0, 4.0, -10.0) / 255.0;
    float hlW = max(0.0, (lum - 0.45) * 2.0);
    o += hlW * vec3(22.0, 8.0, -12.0) / 255.0;
    float shW = max(0.0, (0.35 - lum) * 3.0);
    o += shW * vec3(-10.0, 6.0, 14.0) / 255.0;
    o = (o - 0.5) * 1.1 + 0.5;
  }
  // 7=berlin
  else if (id == 7) {
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    o = mix(o, vec3(gray), 0.35);
    o += vec3(-6.0, -2.0, 10.0) / 255.0;
    float shW = max(0.0, (0.25 - lum) * 4.0);
    o -= shW * vec3(12.0, 12.0, 8.0) / 255.0;
    o = (o - 0.5) * 1.12 + 0.5;
    o = o * 0.97 + vec3(6.0, 6.0, 8.0) / 255.0;
  }
  // 8=seoul
  else if (id == 8) {
    o = o * 0.85 + vec3(38.0, 35.0, 38.0) / 255.0;
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    o = mix(o, vec3(gray), 0.18);
    float hlW = max(0.0, (lum - 0.5) * 2.0);
    o += hlW * vec3(14.0, -4.0, 6.0) / 255.0;
    o += vec3(4.0, 0.0, 6.0) / 255.0;
    o = (o - 0.5) * 0.85 + 0.5;
  }
  // 9=paris
  else if (id == 9) {
    o = o * 0.88 + vec3(30.0, 25.0, 18.0) / 255.0;
    o += vec3(10.0, 4.0, -8.0) / 255.0;
    float hlW = max(0.0, (lum - 0.55) * 2.5);
    o += hlW * vec3(12.0, -2.0, 4.0) / 255.0;
    float midW = 1.0 - abs(lum - 0.5) * 2.0;
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    o = mix(o, vec3(gray), 0.12 * midW);
    o = (o - 0.5) * 0.9 + 0.5;
  }
  // 10=bali
  else if (id == 10) {
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    o.r += (o.r - gray) * 0.25;
    o.g += (o.g - gray) * 0.3;
    o.b += (o.b - gray) * 0.25;
    float midW = 1.0 - abs(lum - 0.5) * 2.0;
    o += midW * vec3(0.0, 12.0, 6.0) / 255.0;
    float hlW = max(0.0, (lum - 0.5) * 2.0);
    o += hlW * vec3(14.0, 6.0, -8.0) / 255.0;
    o = (o - 0.5) * 1.1 + 0.5;
  }
  // 11=nordic
  else if (id == 11) {
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    o = mix(o, vec3(gray), 0.45);
    o += vec3(-8.0, -4.0, 14.0) / 255.0;
    o = (o - 0.5) * 1.25 + 0.5;
    float shW = max(0.0, (0.3 - lum) * 3.0);
    o -= shW * vec3(10.0, 10.0, 6.0) / 255.0;
  }
  // 12=retroVhs
  else if (id == 12) {
    float origR = o.r;
    o.r = o.r * 0.85 + o.g * 0.1 + o.b * 0.05;
    o.g = origR * 0.05 + o.g * 0.85 + o.b * 0.1;
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    o = mix(o, vec3(gray), 0.25);
    o = o * 0.85 + vec3(35.0, 30.0, 32.0) / 255.0;
    o += vec3(6.0, -4.0, 4.0) / 255.0;
    o = (o - 0.5) * 0.88 + 0.5;
  }
  // 13=disposable
  else if (id == 13) {
    o += vec3(15.0, 15.0, 10.0) / 255.0;
    o = o * 0.8 + vec3(50.0, 50.0, 40.0) / 255.0;
    o += vec3(4.0, 10.0, -12.0) / 255.0;
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    o = mix(o, vec3(gray), 0.2);
    o = (o - 0.5) * 0.85 + 0.5;
  }
  // 14=cyberpunk
  else if (id == 14) {
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    o += (o - gray) * 0.3;
    float shW = max(0.0, (0.4 - lum) * 2.5);
    o += shW * vec3(-14.0, 10.0, 16.0) / 255.0;
    float hlW = max(0.0, (lum - 0.55) * 2.5);
    o += hlW * vec3(20.0, -10.0, 14.0) / 255.0;
    o = (o - 0.5) * 1.22 + 0.5;
  }
  // 15=sunsetBlvd
  else if (id == 15) {
    o += vec3(20.0, 6.0, -18.0) / 255.0;
    o *= vec3(1.05, 0.98, 0.85);
    float hlW = max(0.0, (lum - 0.45) * 2.0);
    o += hlW * vec3(18.0, 10.0, 2.0) / 255.0;
    o = o * 0.92 + vec3(20.0, 14.0, 6.0) / 255.0;
    o = (o - 0.5) * 0.92 + 0.5;
  }
  // 16=filmNoir
  else if (id == 16) {
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    float v = (gray - 0.5) * 1.3 + 0.5;
    float shW = max(0.0, (0.25 - gray) * 4.0);
    v -= shW * 15.0 / 255.0;
    o = vec3(v + 8.0/255.0, v + 2.0/255.0, v - 6.0/255.0);
  }
  // 17=pastelPop
  else if (id == 17) {
    o = o * 0.75 + vec3(60.0, 55.0, 58.0) / 255.0;
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    o = mix(o, vec3(gray), 0.3);
    o += vec3(10.0, -2.0, 4.0) / 255.0;
    o = (o - 0.5) * 0.82 + 0.5;
    float hlW = max(0.0, (lum - 0.6) * 2.5);
    o += hlW * vec3(8.0, 4.0, 6.0) / 255.0;
  }
  // 18=chrome
  else if (id == 18) {
    float midW = 1.0 - abs(lum - 0.5) * 2.0;
    float gray = dot(o, vec3(0.299, 0.587, 0.114));
    o = mix(o, vec3(gray), 0.35 * midW);
    o += vec3(-4.0, -2.0, 8.0) / 255.0;
    o = (o - 0.5) * 1.3 + 0.5;
    float hlW = max(0.0, (lum - 0.7) * 3.0);
    o += hlW * vec3(12.0, 12.0, 14.0) / 255.0;
    float shW = max(0.0, (0.2 - lum) * 5.0);
    o -= shW * vec3(10.0) / 255.0;
  }
  // 19=matte
  else if (id == 19) {
    o = o * 0.78 + vec3(55.0, 52.0, 48.0) / 255.0;
    float hlW = max(0.0, (lum - 0.6) * 2.5);
    o -= hlW * vec3(15.0) / 255.0;
    o += vec3(5.0, 1.0, -4.0) / 255.0;
    o = (o - 0.5) * 0.82 + 0.5;
  }
  // 20=infrared
  else if (id == 20) {
    float origR = c.r, origG = c.g, origB = c.b;
    o.r = origG * 1.2 + origR * 0.1;
    o.g = origR * 0.6 + origG * 0.3 + 20.0/255.0;
    o.b = origB * 0.5 + origR * 0.15;
    float redW = max(0.0, (origR - 0.5) * 2.0);
    o += redW * vec3(30.0, 25.0, 10.0) / 255.0;
    float blueW = max(0.0, (origB - 0.4) * 2.0);
    o.b -= blueW * 15.0 / 255.0;
    o = (o - 0.5) * 1.18 + 0.5;
  }

  return o;
}

void main() {
  vec2 uv = v_uv;
  vec3 c;

  // Chromatic aberration — sample R and B from offset UVs
  if (u_caShift > 0.0) {
    float shift = u_caShift / u_resolution.x;
    c.r = texture2D(u_image, vec2(uv.x - shift, uv.y)).r;
    c.g = texture2D(u_image, uv).g;
    c.b = texture2D(u_image, vec2(uv.x + shift, uv.y)).b;
  } else {
    c = texture2D(u_image, uv).rgb;
  }

  // Base adjustments
  c *= u_brightness;
  c = (c - 0.5) * u_contrast + 0.5;
  float gray = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(gray), c, u_saturation);

  if (u_warmth != 0.0) { c.r += u_warmth * 0.117; c.b -= u_warmth * 0.117; }
  if (u_tint != 0.0) { c.g += u_tint * 0.117; }

  if (u_vibrance != 0.0) {
    float mx = max(c.r, max(c.g, c.b));
    float avg = (c.r + c.g + c.b) / 3.0;
    float amt = (mx - avg) / max(mx, 0.001) * (-u_vibrance * 2.0);
    c += (vec3(mx) - c) * amt;
  }

  if (u_clarity != 0.0) {
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    float midW = 1.0 - abs(lum - 0.5) * 2.0;
    float boost = u_clarity * midW * 0.157;
    c += boost * sign(c - lum) * 0.5;
  }

  if (u_dehaze != 0.0) {
    float f = 1.0 + u_dehaze * 0.4;
    c = (c - 0.5) * f + 0.5;
  }

  // Filter preset ops
  for (int j = 0; j < 6; j++) {
    if (j >= u_filterCount) break;
    int t = u_filterTypes[j];
    float v = u_filterValues[j];
    if (t == 0) c *= v;                                      // brightness
    else if (t == 1) c = (c - 0.5) * v + 0.5;               // contrast
    else if (t == 2) { float g2 = dot(c, vec3(0.2126,0.7152,0.0722)); c = mix(vec3(g2), c, v); } // saturate
    else if (t == 3) c = applySepia(c, v);
    else if (t == 4) c = applyGrayscale(c, v);
    else if (t == 5) c = applyHueRotate(c, v);
  }

  // HSL adjustments
  {
    vec3 hsl = rgb2hsl(clamp(c, 0.0, 1.0));
    int range = getHueRange(hsl.x);
    float hAdj = 0.0, sAdj = 0.0, lAdj = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i == range) {
        hAdj = u_hslH[i]; sAdj = u_hslS[i]; lAdj = u_hslL[i];
      }
    }
    if (hAdj != 0.0 || sAdj != 0.0 || lAdj != 0.0) {
      hsl.x = fract(hsl.x + hAdj / 360.0);
      hsl.y = clamp(hsl.y + sAdj / 100.0, 0.0, 1.0);
      hsl.z = clamp(hsl.z + lAdj / 100.0, 0.0, 1.0);
      c = hsl2rgb(hsl);
    }
  }

  // Curves LUT
  if (u_hasCurves) {
    c = clamp(c, 0.0, 1.0);
    float masterR = texture2D(u_curvesLUT, vec2(c.r, 0.875)).r;
    float masterG = texture2D(u_curvesLUT, vec2(c.g, 0.875)).r;
    float masterB = texture2D(u_curvesLUT, vec2(c.b, 0.875)).r;
    c.r = texture2D(u_curvesLUT, vec2(masterR, 0.625)).r;
    c.g = texture2D(u_curvesLUT, vec2(masterG, 0.375)).g;
    c.b = texture2D(u_curvesLUT, vec2(masterB, 0.125)).b;
  }

  // Color grading
  {
    float lum = dot(clamp(c, 0.0, 1.0), vec3(0.299, 0.587, 0.114));
    float shW = max(0.0, 1.0 - lum * 3.0);
    float hlW = max(0.0, lum * 3.0 - 2.0);
    float midW = 1.0 - shW - hlW;
    vec3 grade = u_cgShadows * shW + u_cgMidtones * midW + u_cgHighlights * hlW;
    c += grade * 0.3;
  }

  // Split toning
  if (u_stShadowSat > 0.0 || u_stHighlightSat > 0.0) {
    float lum = dot(clamp(c, 0.0, 1.0), vec3(0.299, 0.587, 0.114));
    float balance = u_stBalance * 0.5;
    if (u_stShadowSat > 0.0 && lum < 0.5 + balance) {
      float w = (0.5 + balance - lum) / (0.5 + balance);
      vec3 toneColor = hsl2rgb(vec3(u_stShadowHue, 1.0, 0.5));
      c = mix(c, toneColor * lum * 2.0, u_stShadowSat * w * 0.3);
    }
    if (u_stHighlightSat > 0.0 && lum > 0.5 - balance) {
      float w = (lum - 0.5 + balance) / (0.5 + balance);
      vec3 toneColor = hsl2rgb(vec3(u_stHighlightHue, 1.0, 0.5));
      c = mix(c, toneColor + (1.0 - toneColor) * (lum * 2.0 - 1.0), u_stHighlightSat * w * 0.3);
    }
  }

  // Selective color
  if (u_selectiveEnabled) {
    vec3 hsl = rgb2hsl(clamp(c, 0.0, 1.0));
    float hueDeg = hsl.x * 360.0;
    float targetDeg = u_selectiveHue;
    float diff = abs(hueDeg - targetDeg);
    if (diff > 180.0) diff = 360.0 - diff;
    if (diff > u_selectiveRange) {
      float g3 = dot(c, vec3(0.2126, 0.7152, 0.0722));
      float desatAmt = clamp((diff - u_selectiveRange) / u_selectiveRange, 0.0, 1.0);
      c = mix(c, vec3(g3), desatAmt);
    }
  }

  // Film emulation
  if (u_filmId >= 0) {
    vec3 filmed = filmTransform(clamp(c, 0.0, 1.0), u_filmId);
    c = mix(c, filmed, u_filmIntensity);
  }

  // Channel mixer
  if (u_hasChannelMixer) {
    c = u_channelMixer * clamp(c, 0.0, 1.0);
  }

  // Posterize
  if (u_posterize > 1.5) {
    float levels = u_posterize;
    c = floor(c * levels + 0.5) / levels;
  }

  // Solarize
  if (u_solarize > 0.0) {
    float threshold = u_solarize / 255.0;
    c.r = c.r < threshold ? 1.0 - c.r : c.r;
    c.g = c.g < threshold ? 1.0 - c.g : c.g;
    c.b = c.b < threshold ? 1.0 - c.b : c.b;
  }

  // Gradient map
  if (u_hasGradientMap) {
    float lum = dot(clamp(c, 0.0, 1.0), vec3(0.299, 0.587, 0.114));
    vec3 mapped = mix(u_gmShadowColor, u_gmHighlightColor, lum);
    c = mix(c, mapped, u_gmIntensity);
  }

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), texture2D(u_image, v_uv).a);
}
`

// ─── Pass 2: Convolution (sharpen + emboss) ──────────────────────────
const FRAG_CONVOLVE = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_texelSize;
uniform float u_sharpen;
uniform float u_emboss;

void main() {
  vec4 center = texture2D(u_image, v_uv);
  vec3 c = center.rgb;

  if (u_sharpen > 0.0) {
    vec3 t = texture2D(u_image, v_uv + vec2(0.0, -u_texelSize.y)).rgb;
    vec3 b = texture2D(u_image, v_uv + vec2(0.0,  u_texelSize.y)).rgb;
    vec3 l = texture2D(u_image, v_uv + vec2(-u_texelSize.x, 0.0)).rgb;
    vec3 r = texture2D(u_image, v_uv + vec2( u_texelSize.x, 0.0)).rgb;
    vec3 sharp = c * 5.0 - t - b - l - r;
    float amt = u_sharpen / 100.0;
    c = mix(c, sharp, amt);
  }

  if (u_emboss > 0.0) {
    vec3 tl = texture2D(u_image, v_uv + vec2(-u_texelSize.x, -u_texelSize.y)).rgb;
    vec3 tm = texture2D(u_image, v_uv + vec2(0.0, -u_texelSize.y)).rgb;
    vec3 tr = texture2D(u_image, v_uv + vec2( u_texelSize.x, -u_texelSize.y)).rgb;
    vec3 bl = texture2D(u_image, v_uv + vec2(-u_texelSize.x,  u_texelSize.y)).rgb;
    vec3 bm = texture2D(u_image, v_uv + vec2(0.0,  u_texelSize.y)).rgb;
    vec3 br = texture2D(u_image, v_uv + vec2( u_texelSize.x,  u_texelSize.y)).rgb;
    vec3 ml = texture2D(u_image, v_uv + vec2(-u_texelSize.x, 0.0)).rgb;
    vec3 mr = texture2D(u_image, v_uv + vec2( u_texelSize.x, 0.0)).rgb;
    vec3 embossed = (-tl - tm - ml + mr + bm + br) + 0.5;
    float amt = u_emboss / 100.0;
    c = mix(c, embossed, amt);
  }

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), center.a);
}
`

// ─── Pass 3a: Blur horizontal (for tilt-shift) ──────────────────────
const FRAG_BLUR_H = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_texelSize;
uniform float u_blurRadius;

void main() {
  vec4 sum = vec4(0.0);
  float total = 0.0;
  float r = u_blurRadius;
  for (float i = -20.0; i <= 20.0; i += 1.0) {
    if (abs(i) > r) continue;
    float w = 1.0 - abs(i) / (r + 1.0);
    sum += texture2D(u_image, v_uv + vec2(i * u_texelSize.x, 0.0)) * w;
    total += w;
  }
  gl_FragColor = sum / total;
}
`

// ─── Pass 3b: Blur vertical (for tilt-shift) ────────────────────────
const FRAG_BLUR_V = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_texelSize;
uniform float u_blurRadius;

void main() {
  vec4 sum = vec4(0.0);
  float total = 0.0;
  float r = u_blurRadius;
  for (float i = -20.0; i <= 20.0; i += 1.0) {
    if (abs(i) > r) continue;
    float w = 1.0 - abs(i) / (r + 1.0);
    sum += texture2D(u_image, v_uv + vec2(0.0, i * u_texelSize.y)) * w;
    total += w;
  }
  gl_FragColor = sum / total;
}
`

// ─── Pass 3c: Tilt-shift composite + grain + vignette ────────────────
const FRAG_POST = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_sharp;
uniform sampler2D u_blurred;
uniform vec2 u_resolution;

// Tilt-shift
uniform int u_tsMode;
uniform float u_tsPosition;
uniform float u_tsSize;
uniform float u_tsBlur;

// Vignette
uniform float u_vignette;

// Grain
uniform float u_grainAmount;
uniform float u_grainSize;
uniform float u_time;

// Film grain
uniform float u_filmGrainAmount;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec3 sharp = texture2D(u_sharp, v_uv).rgb;
  vec3 c;

  if (u_tsBlur > 0.0) {
    vec3 blurred = texture2D(u_blurred, v_uv).rgb;
    float dist;
    if (u_tsMode == 1) { // radial
      float dx = v_uv.x - 0.5;
      float dy = v_uv.y - u_tsPosition;
      dist = sqrt(dx*dx + dy*dy) * 2.0;
    } else { // linear
      dist = abs(v_uv.y - u_tsPosition);
    }
    float halfSize = u_tsSize * 0.5;
    float t = clamp((dist - halfSize) / max(halfSize, 0.001), 0.0, 1.0);
    float alpha = t * t;
    c = mix(sharp, blurred, alpha);
  } else {
    c = sharp;
  }

  // Grain (monochromatic)
  if (u_grainAmount > 0.0) {
    float intensity = u_grainAmount / 100.0 * 80.0 / 255.0;
    float blockSize = max(1.0, u_grainSize);
    vec2 blockCoord = floor(v_uv * u_resolution / blockSize);
    float noise = (hash(blockCoord + u_time) - 0.5) * intensity;
    c += noise;
  }

  // Film grain
  if (u_filmGrainAmount > 0.0) {
    float strength = u_filmGrainAmount * 40.0 / 255.0;
    float noise = (hash(v_uv * u_resolution + u_time * 1.7) - 0.5) * strength;
    c += noise;
  }

  // Vignette
  if (u_vignette > 0.0) {
    vec2 d = v_uv - 0.5;
    float dist = length(d) * 1.414;
    float vig = 1.0 - smoothstep(0.3, 1.0, dist) * u_vignette * 0.8;
    c *= vig;
  }

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`

// ─── WebGL state ─────────────────────────────────────────────────────

let _gl = null
let _canvas = null
let _programs = {}
let _uniforms = {}
let _sourceTexture = null
let _fbos = [null, null]
let _fboTextures = [null, null]
let _curvesTexture = null
let _quadBuf = null
let _lastW = 0, _lastH = 0

function createShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[WebGL] Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(gl, vertSrc, fragSrc) {
  const vert = createShader(gl, gl.VERTEX_SHADER, vertSrc)
  const frag = createShader(gl, gl.FRAGMENT_SHADER, fragSrc)
  if (!vert || !frag) return null
  const prog = gl.createProgram()
  gl.attachShader(prog, vert)
  gl.attachShader(prog, frag)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[WebGL] Program link error:', gl.getProgramInfoLog(prog))
    return null
  }
  return prog
}

function getUniforms(gl, prog, names) {
  const u = {}
  for (const n of names) u[n] = gl.getUniformLocation(prog, n)
  return u
}

function setupTexture(gl) {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return tex
}

function ensureFBOs(gl, w, h) {
  if (_lastW === w && _lastH === h && _fbos[0]) return
  for (let i = 0; i < 2; i++) {
    if (_fbos[i]) gl.deleteFramebuffer(_fbos[i])
    if (_fboTextures[i]) gl.deleteTexture(_fboTextures[i])
    _fboTextures[i] = setupTexture(gl)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    _fbos[i] = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, _fbos[i])
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, _fboTextures[i], 0)
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  _lastW = w
  _lastH = h
}

function drawQuad(gl) {
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

function activateProgram(gl, name) {
  const prog = _programs[name]
  gl.useProgram(prog)
  const posLoc = gl.getAttribLocation(prog, 'a_pos')
  const uvLoc = gl.getAttribLocation(prog, 'a_uv')
  gl.bindBuffer(gl.ARRAY_BUFFER, _quadBuf)
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0)
  gl.enableVertexAttribArray(uvLoc)
  gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 16, 8)
  return _uniforms[name]
}

// ─── Initialization ──────────────────────────────────────────────────

export function initWebGL() {
  if (_gl) return true
  try {
    _canvas = document.createElement('canvas')
    _gl = _canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true })
    if (!_gl) return false

    const shaderPairs = {
      color: FRAG_COLOR,
      convolve: FRAG_CONVOLVE,
      blurH: FRAG_BLUR_H,
      blurV: FRAG_BLUR_V,
      post: FRAG_POST,
    }

    for (const [name, frag] of Object.entries(shaderPairs)) {
      const prog = createProgram(_gl, VERT_SRC, frag)
      if (!prog) { _gl = null; return false }
      _programs[name] = prog
    }

    const verts = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
       1,  1, 1, 0,
    ])
    _quadBuf = _gl.createBuffer()
    _gl.bindBuffer(_gl.ARRAY_BUFFER, _quadBuf)
    _gl.bufferData(_gl.ARRAY_BUFFER, verts, _gl.STATIC_DRAW)

    _sourceTexture = setupTexture(_gl)
    _curvesTexture = setupTexture(_gl)

    // Collect uniform locations
    const colorNames = [
      'u_image', 'u_resolution',
      'u_brightness', 'u_contrast', 'u_saturation', 'u_warmth', 'u_tint',
      'u_vibrance', 'u_clarity', 'u_dehaze',
      'u_filterCount', 'u_caShift',
      'u_curvesLUT', 'u_hasCurves',
      'u_cgShadows', 'u_cgMidtones', 'u_cgHighlights',
      'u_stShadowHue', 'u_stShadowSat', 'u_stHighlightHue', 'u_stHighlightSat', 'u_stBalance',
      'u_selectiveEnabled', 'u_selectiveHue', 'u_selectiveRange',
      'u_filmId', 'u_filmIntensity',
      'u_posterize', 'u_solarize',
      'u_channelMixer', 'u_hasChannelMixer',
      'u_hasGradientMap', 'u_gmShadowColor', 'u_gmHighlightColor', 'u_gmIntensity',
    ]
    for (let i = 0; i < 6; i++) { colorNames.push(`u_filterTypes[${i}]`); colorNames.push(`u_filterValues[${i}]`) }
    for (let i = 0; i < 8; i++) { colorNames.push(`u_hslH[${i}]`); colorNames.push(`u_hslS[${i}]`); colorNames.push(`u_hslL[${i}]`) }
    _uniforms.color = getUniforms(_gl, _programs.color, colorNames)

    _uniforms.convolve = getUniforms(_gl, _programs.convolve, ['u_image', 'u_texelSize', 'u_sharpen', 'u_emboss'])
    _uniforms.blurH = getUniforms(_gl, _programs.blurH, ['u_image', 'u_texelSize', 'u_blurRadius'])
    _uniforms.blurV = getUniforms(_gl, _programs.blurV, ['u_image', 'u_texelSize', 'u_blurRadius'])
    _uniforms.post = getUniforms(_gl, _programs.post, [
      'u_sharp', 'u_blurred', 'u_resolution',
      'u_tsMode', 'u_tsPosition', 'u_tsSize', 'u_tsBlur',
      'u_vignette',
      'u_grainAmount', 'u_grainSize', 'u_time',
      'u_filmGrainAmount',
    ])

    return true
  } catch (e) {
    console.warn('[WebGL] Init failed:', e)
    _gl = null
    return false
  }
}

export function isWebGLAvailable() {
  return !!_gl || initWebGL()
}

// ─── Curve LUT baking ────────────────────────────────────────────────

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
  if (n === 2) {
    const lut = new Uint8Array(256)
    for (let i = 0; i < 256; i++) {
      const t = i / 255
      const v = ys[0] + (ys[1] - ys[0]) * ((t - xs[0]) / (xs[1] - xs[0] || 1))
      lut[i] = Math.min(255, Math.max(0, Math.round(v * 255)))
    }
    return lut
  }
  const h = [], delta = [], m = []
  for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); delta.push((ys[i + 1] - ys[i]) / (h[i] || 1)) }
  m.push(delta[0])
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) m.push(0)
    else { const avg = (delta[i - 1] + delta[i]) / 2; m.push(avg) }
  }
  m.push(delta[n - 2])
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(delta[i]) < 1e-6) { m[i] = 0; m[i + 1] = 0 }
    else {
      const a = m[i] / delta[i], b = m[i + 1] / delta[i]
      const s = a * a + b * b
      if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * delta[i]; m[i + 1] = tau * b * delta[i] }
    }
  }
  const lut = new Uint8Array(256)
  for (let px = 0; px < 256; px++) {
    const t = px / 255
    let seg = n - 2
    for (let i = 0; i < n - 1; i++) { if (t < xs[i + 1]) { seg = i; break } }
    const dx = xs[seg + 1] - xs[seg] || 1
    const tt = (t - xs[seg]) / dx
    const a = (2 * tt * tt * tt - 3 * tt * tt + 1) * ys[seg]
    const b2 = (tt * tt * tt - 2 * tt * tt + tt) * dx * m[seg]
    const cc = (-2 * tt * tt * tt + 3 * tt * tt) * ys[seg + 1]
    const d = (tt * tt * tt - tt * tt) * dx * m[seg + 1]
    lut[px] = Math.min(255, Math.max(0, Math.round((a + b2 + cc + d) * 255)))
  }
  return lut
}

function uploadCurvesLUT(gl, curves) {
  const rgbLUT = buildCurveLUT(curves.rgb)
  const rLUT = buildCurveLUT(curves.red)
  const gLUT = buildCurveLUT(curves.green)
  const bLUT = buildCurveLUT(curves.blue)
  const data = new Uint8Array(256 * 4 * 4)
  for (let i = 0; i < 256; i++) {
    data[i * 4] = rLUT[i]; data[i * 4 + 1] = 0; data[i * 4 + 2] = 0; data[i * 4 + 3] = 255
    data[256 * 4 + i * 4] = 0; data[256 * 4 + i * 4 + 1] = gLUT[i]; data[256 * 4 + i * 4 + 2] = 0; data[256 * 4 + i * 4 + 3] = 255
    data[512 * 4 + i * 4] = 0; data[512 * 4 + i * 4 + 1] = 0; data[512 * 4 + i * 4 + 2] = bLUT[i]; data[512 * 4 + i * 4 + 3] = 255
    data[768 * 4 + i * 4] = rgbLUT[i]; data[768 * 4 + i * 4 + 1] = 0; data[768 * 4 + i * 4 + 2] = 0; data[768 * 4 + i * 4 + 3] = 255
  }
  gl.bindTexture(gl.TEXTURE_2D, _curvesTexture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
}

// ─── Film emulation ID mapping ───────────────────────────────────────
const FILM_ID_MAP = {
  koji: 0, tokyo: 1, portra: 2, velvia: 3, superia: 4, aura: 5,
  havana: 6, berlin: 7, seoul: 8, paris: 9, bali: 10, nordic: 11,
  retroVhs: 12, disposable: 13, cyberpunk: 14, sunsetBlvd: 15,
  filmNoir: 16, pastelPop: 17, chrome: 18, matte: 19, infrared: 20,
}

// Filter type name to int
const FILTER_TYPE_MAP = { brightness: 0, contrast: 1, saturate: 2, sepia: 3, grayscale: 4, 'hue-rotate': 5 }

// ─── Main render function ────────────────────────────────────────────

/**
 * Render sourceCanvas through the full multi-pass WebGL pipeline.
 * Returns the WebGL output canvas or null on failure.
 */
export function renderWithWebGL(sourceCanvas, params) {
  if (!_gl) { if (!initWebGL()) return null }
  const gl = _gl

  const w = sourceCanvas.width
  const h = sourceCanvas.height
  _canvas.width = w
  _canvas.height = h
  gl.viewport(0, 0, w, h)

  ensureFBOs(gl, w, h)

  // Upload source image
  gl.bindTexture(gl.TEXTURE_2D, _sourceTexture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas)

  let readTex = _sourceTexture
  let pingPong = 0

  function renderPass(programName, setupFn) {
    const u = activateProgram(gl, programName)
    gl.bindFramebuffer(gl.FRAMEBUFFER, _fbos[pingPong])
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, readTex)
    setupFn(u)
    drawQuad(gl)
    readTex = _fboTextures[pingPong]
    pingPong = 1 - pingPong
  }

  // ── Pass 1: Color ──────────────────────────────────────────────────
  const {
    brightness = 1, contrast = 1, saturation = 1, warmth = 0, tint = 0,
    vibrance = 0, clarity = 0, dehaze = 0,
    filterOps, hsl, curves, colorGrade, splitTone, selectiveColor,
    filmEmulation, filmIntensity = 1,
    posterize = 0, solarize = 0, channelMixer, gradientMap,
    chromaticAberration = 0,
    sharpen = 0, emboss = 0,
    vignette = 0, grain, filmGrain = 0,
    tiltShift,
  } = params

  renderPass('color', (u) => {
    gl.uniform1i(u['u_image'], 0)
    gl.uniform2f(u['u_resolution'], w, h)
    gl.uniform1f(u['u_brightness'], brightness)
    gl.uniform1f(u['u_contrast'], contrast)
    gl.uniform1f(u['u_saturation'], saturation)
    gl.uniform1f(u['u_warmth'], warmth)
    gl.uniform1f(u['u_tint'], tint)
    gl.uniform1f(u['u_vibrance'], vibrance)
    gl.uniform1f(u['u_clarity'], clarity)
    gl.uniform1f(u['u_dehaze'], dehaze)
    gl.uniform1f(u['u_caShift'], chromaticAberration)

    // Filter ops
    const ops = filterOps || []
    gl.uniform1i(u['u_filterCount'], Math.min(ops.length, 6))
    for (let i = 0; i < 6; i++) {
      const op = ops[i]
      gl.uniform1i(u[`u_filterTypes[${i}]`], op ? (FILTER_TYPE_MAP[op.type] ?? 0) : 0)
      gl.uniform1f(u[`u_filterValues[${i}]`], op ? op.value : 0)
    }

    // HSL
    const hslRanges = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'magenta']
    for (let i = 0; i < 8; i++) {
      const ch = hsl?.[hslRanges[i]] || { h: 0, s: 0, l: 0 }
      gl.uniform1f(u[`u_hslH[${i}]`], ch.h)
      gl.uniform1f(u[`u_hslS[${i}]`], ch.s)
      gl.uniform1f(u[`u_hslL[${i}]`], ch.l)
    }

    // Curves
    const hasCurves = curves && Object.entries(curves).some(([, pts]) =>
      pts.length > 2 || (pts.length === 2 && (pts[0][0] !== 0 || pts[0][1] !== 0 || pts[1][0] !== 1 || pts[1][1] !== 1))
    )
    gl.uniform1i(u['u_hasCurves'], hasCurves ? 1 : 0)
    if (hasCurves) {
      uploadCurvesLUT(gl, curves)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, _curvesTexture)
      gl.uniform1i(u['u_curvesLUT'], 1)
      gl.activeTexture(gl.TEXTURE0)
    }

    // Color grading
    const cg = colorGrade || { shadows: { r: 0, g: 0, b: 0 }, midtones: { r: 0, g: 0, b: 0 }, highlights: { r: 0, g: 0, b: 0 } }
    gl.uniform3f(u['u_cgShadows'], cg.shadows?.r || 0, cg.shadows?.g || 0, cg.shadows?.b || 0)
    gl.uniform3f(u['u_cgMidtones'], cg.midtones?.r || 0, cg.midtones?.g || 0, cg.midtones?.b || 0)
    gl.uniform3f(u['u_cgHighlights'], cg.highlights?.r || 0, cg.highlights?.g || 0, cg.highlights?.b || 0)

    // Split tone
    const st = splitTone || {}
    gl.uniform1f(u['u_stShadowHue'], st.shadowHue || 0)
    gl.uniform1f(u['u_stShadowSat'], st.shadowSat || 0)
    gl.uniform1f(u['u_stHighlightHue'], st.highlightHue || 0)
    gl.uniform1f(u['u_stHighlightSat'], st.highlightSat || 0)
    gl.uniform1f(u['u_stBalance'], st.balance || 0)

    // Selective color
    gl.uniform1i(u['u_selectiveEnabled'], selectiveColor?.enabled ? 1 : 0)
    gl.uniform1f(u['u_selectiveHue'], selectiveColor?.hue || 0)
    gl.uniform1f(u['u_selectiveRange'], selectiveColor?.range || 30)

    // Film emulation
    const filmId = filmEmulation ? (FILM_ID_MAP[filmEmulation] ?? -1) : -1
    gl.uniform1i(u['u_filmId'], filmId)
    gl.uniform1f(u['u_filmIntensity'], filmIntensity)

    // Posterize / Solarize
    gl.uniform1f(u['u_posterize'], posterize)
    gl.uniform1f(u['u_solarize'], solarize)

    // Channel mixer
    const cm = channelMixer
    const hasCM = cm && (cm.red?.g !== 0 || cm.red?.b !== 0 || cm.green?.r !== 0 || cm.green?.b !== 0 || cm.blue?.r !== 0 || cm.blue?.g !== 0 ||
      cm.red?.r !== 100 || cm.green?.g !== 100 || cm.blue?.b !== 100)
    gl.uniform1i(u['u_hasChannelMixer'], hasCM ? 1 : 0)
    if (hasCM) {
      gl.uniformMatrix3fv(u['u_channelMixer'], false, [
        (cm.red?.r || 100) / 100, (cm.green?.r || 0) / 100, (cm.blue?.r || 0) / 100,
        (cm.red?.g || 0) / 100, (cm.green?.g || 100) / 100, (cm.blue?.g || 0) / 100,
        (cm.red?.b || 0) / 100, (cm.green?.b || 0) / 100, (cm.blue?.b || 100) / 100,
      ])
    } else {
      gl.uniformMatrix3fv(u['u_channelMixer'], false, [1, 0, 0, 0, 1, 0, 0, 0, 1])
    }

    // Gradient map
    const gm = gradientMap
    const hasGM = gm?.enabled
    gl.uniform1i(u['u_hasGradientMap'], hasGM ? 1 : 0)
    if (hasGM) {
      const sh = hexToVec3(gm.shadows)
      const hl = hexToVec3(gm.highlights)
      gl.uniform3f(u['u_gmShadowColor'], sh[0], sh[1], sh[2])
      gl.uniform3f(u['u_gmHighlightColor'], hl[0], hl[1], hl[2])
      gl.uniform1f(u['u_gmIntensity'], gm.intensity ?? 0.7)
    }
  })

  // ── Pass 2: Convolution (sharpen + emboss) ─────────────────────────
  if (sharpen > 0 || emboss > 0) {
    renderPass('convolve', (u) => {
      gl.uniform1i(u['u_image'], 0)
      gl.uniform2f(u['u_texelSize'], 1.0 / w, 1.0 / h)
      gl.uniform1f(u['u_sharpen'], sharpen)
      gl.uniform1f(u['u_emboss'], emboss)
    })
  }

  // ── Pass 3: Post-effects (tilt-shift blur + grain + vignette) ──────
  const ts = tiltShift || {}
  const tsBlur = ts.blur || 0
  const hasPost = vignette > 0 || tsBlur > 0 || (grain?.amount > 0) || filmGrain > 0

  const sharpTex = readTex
  let blurredTex = readTex

  if (tsBlur > 0) {
    const blurRadius = Math.min(tsBlur, 20)
    // Blur pass H
    renderPass('blurH', (u) => {
      gl.uniform1i(u['u_image'], 0)
      gl.uniform2f(u['u_texelSize'], 1.0 / w, 1.0 / h)
      gl.uniform1f(u['u_blurRadius'], blurRadius)
    })
    // Blur pass V
    renderPass('blurV', (u) => {
      gl.uniform1i(u['u_image'], 0)
      gl.uniform2f(u['u_texelSize'], 1.0 / w, 1.0 / h)
      gl.uniform1f(u['u_blurRadius'], blurRadius)
    })
    // Second iteration for quality
    renderPass('blurH', (u) => {
      gl.uniform1i(u['u_image'], 0)
      gl.uniform2f(u['u_texelSize'], 1.0 / w, 1.0 / h)
      gl.uniform1f(u['u_blurRadius'], blurRadius)
    })
    renderPass('blurV', (u) => {
      gl.uniform1i(u['u_image'], 0)
      gl.uniform2f(u['u_texelSize'], 1.0 / w, 1.0 / h)
      gl.uniform1f(u['u_blurRadius'], blurRadius)
    })
    blurredTex = readTex
    readTex = sharpTex
  }

  if (hasPost) {
    // Final composite pass — render to screen
    const u = activateProgram(gl, 'post')
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, sharpTex)
    gl.uniform1i(u['u_sharp'], 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, blurredTex)
    gl.uniform1i(u['u_blurred'], 1)
    gl.activeTexture(gl.TEXTURE0)

    gl.uniform2f(u['u_resolution'], w, h)
    gl.uniform1i(u['u_tsMode'], ts.mode === 'radial' ? 1 : 0)
    gl.uniform1f(u['u_tsPosition'], (ts.position ?? 50) / 100)
    gl.uniform1f(u['u_tsSize'], Math.max(0.01, (ts.size ?? 30) / 100))
    gl.uniform1f(u['u_tsBlur'], tsBlur)
    gl.uniform1f(u['u_vignette'], vignette)
    gl.uniform1f(u['u_grainAmount'], grain?.amount || 0)
    gl.uniform1f(u['u_grainSize'], grain?.size || 1)
    gl.uniform1f(u['u_time'], (performance.now() % 10000) / 10000)
    gl.uniform1f(u['u_filmGrainAmount'], filmGrain)

    drawQuad(gl)
  } else {
    // Just blit the last FBO to the screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    const u = activateProgram(gl, 'post')
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, readTex)
    gl.uniform1i(u['u_sharp'], 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, readTex)
    gl.uniform1i(u['u_blurred'], 1)
    gl.activeTexture(gl.TEXTURE0)
    gl.uniform2f(u['u_resolution'], w, h)
    gl.uniform1i(u['u_tsMode'], 0)
    gl.uniform1f(u['u_tsPosition'], 0.5)
    gl.uniform1f(u['u_tsSize'], 0.5)
    gl.uniform1f(u['u_tsBlur'], 0.0)
    gl.uniform1f(u['u_vignette'], 0.0)
    gl.uniform1f(u['u_grainAmount'], 0.0)
    gl.uniform1f(u['u_grainSize'], 1.0)
    gl.uniform1f(u['u_time'], 0.0)
    gl.uniform1f(u['u_filmGrainAmount'], 0.0)
    drawQuad(gl)
  }

  return _canvas
}

// ─── Helpers ─────────────────────────────────────────────────────────

function hexToVec3(hex) {
  if (!hex || hex.length < 7) return [0, 0, 0]
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}
