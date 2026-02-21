/**
 * WebGL-accelerated adjustment renderer.
 * Applies brightness, contrast, saturation, warmth, vibrance, vignette as a GPU shader.
 * Falls back silently if WebGL is unavailable.
 */

const VERT_SRC = `
  attribute vec2 a_pos;
  attribute vec2 a_uv;
  varying vec2 v_uv;
  void main() {
    v_uv = a_uv;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`

const FRAG_SRC = `
  precision mediump float;
  varying vec2 v_uv;
  uniform sampler2D u_image;
  uniform float u_brightness;
  uniform float u_contrast;
  uniform float u_saturation;
  uniform float u_warmth;
  uniform float u_vibrance;
  uniform float u_vignette;
  uniform float u_clarity;
  uniform float u_dehaze;
  uniform vec2 u_resolution;

  vec3 adjustBrightness(vec3 c, float b) { return c * b; }

  vec3 adjustContrast(vec3 c, float f) { return (c - 0.5) * f + 0.5; }

  vec3 adjustSaturation(vec3 c, float s) {
    float gray = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(gray), c, s);
  }

  vec3 adjustWarmth(vec3 c, float w) {
    c.r += w * 0.117;
    c.b -= w * 0.117;
    return c;
  }

  vec3 adjustVibrance(vec3 c, float v) {
    float mx = max(c.r, max(c.g, c.b));
    float avg = (c.r + c.g + c.b) / 3.0;
    float amt = (mx - avg) / max(mx, 0.001) * (-v * 2.0);
    c.r += (mx - c.r) * amt;
    c.g += (mx - c.g) * amt;
    c.b += (mx - c.b) * amt;
    return c;
  }

  float vignetteWeight(vec2 uv, float strength) {
    vec2 d = uv - 0.5;
    float dist = length(d) * 1.414;
    return 1.0 - smoothstep(0.3, 1.0, dist) * strength * 0.8;
  }

  vec3 adjustClarity(vec3 c, float cl) {
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    float midW = 1.0 - abs(lum - 0.5) * 2.0;
    float boost = cl * midW * 0.157;
    c.r += boost * sign(c.r - lum) * 0.5;
    c.g += boost * sign(c.g - lum) * 0.5;
    c.b += boost * sign(c.b - lum) * 0.5;
    return c;
  }

  vec3 adjustDehaze(vec3 c, float d) {
    float f = 1.0 + d * 0.4;
    return (c - 0.5) * f + 0.5;
  }

  void main() {
    vec4 color = texture2D(u_image, v_uv);
    vec3 c = color.rgb;
    c = adjustBrightness(c, u_brightness);
    c = adjustContrast(c, u_contrast);
    c = adjustSaturation(c, u_saturation);
    if (u_warmth != 0.0) c = adjustWarmth(c, u_warmth);
    if (u_vibrance != 0.0) c = adjustVibrance(c, u_vibrance);
    if (u_clarity != 0.0) c = adjustClarity(c, u_clarity);
    if (u_dehaze != 0.0) c = adjustDehaze(c, u_dehaze);
    if (u_vignette > 0.0) c *= vignetteWeight(v_uv, u_vignette);
    c = clamp(c, 0.0, 1.0);
    gl_FragColor = vec4(c, color.a);
  }
`

let _gl = null
let _program = null
let _texture = null
let _canvas = null
let _uniforms = {}

function createShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export function initWebGL() {
  if (_gl) return true
  try {
    _canvas = document.createElement('canvas')
    _gl = _canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true })
    if (!_gl) return false

    const vert = createShader(_gl, _gl.VERTEX_SHADER, VERT_SRC)
    const frag = createShader(_gl, _gl.FRAGMENT_SHADER, FRAG_SRC)
    if (!vert || !frag) return false

    _program = _gl.createProgram()
    _gl.attachShader(_program, vert)
    _gl.attachShader(_program, frag)
    _gl.linkProgram(_program)
    if (!_gl.getProgramParameter(_program, _gl.LINK_STATUS)) return false

    _gl.useProgram(_program)

    const posLoc = _gl.getAttribLocation(_program, 'a_pos')
    const uvLoc = _gl.getAttribLocation(_program, 'a_uv')

    const verts = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
       1,  1, 1, 0,
    ])
    const buf = _gl.createBuffer()
    _gl.bindBuffer(_gl.ARRAY_BUFFER, buf)
    _gl.bufferData(_gl.ARRAY_BUFFER, verts, _gl.STATIC_DRAW)
    _gl.enableVertexAttribArray(posLoc)
    _gl.vertexAttribPointer(posLoc, 2, _gl.FLOAT, false, 16, 0)
    _gl.enableVertexAttribArray(uvLoc)
    _gl.vertexAttribPointer(uvLoc, 2, _gl.FLOAT, false, 16, 8)

    _texture = _gl.createTexture()
    _gl.bindTexture(_gl.TEXTURE_2D, _texture)
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE)
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE)
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR)
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR)

    _uniforms = {
      brightness: _gl.getUniformLocation(_program, 'u_brightness'),
      contrast: _gl.getUniformLocation(_program, 'u_contrast'),
      saturation: _gl.getUniformLocation(_program, 'u_saturation'),
      warmth: _gl.getUniformLocation(_program, 'u_warmth'),
      vibrance: _gl.getUniformLocation(_program, 'u_vibrance'),
      vignette: _gl.getUniformLocation(_program, 'u_vignette'),
      clarity: _gl.getUniformLocation(_program, 'u_clarity'),
      dehaze: _gl.getUniformLocation(_program, 'u_dehaze'),
      resolution: _gl.getUniformLocation(_program, 'u_resolution'),
    }

    return true
  } catch {
    _gl = null
    return false
  }
}

/**
 * Render a source canvas through the WebGL adjustment pipeline.
 * Returns the WebGL canvas (or null on failure), which the caller can draw back.
 */
export function renderWithWebGL(sourceCanvas, params) {
  if (!_gl || !_program) {
    if (!initWebGL()) return null
  }

  const { brightness = 1, contrast = 1, saturation = 1, warmth = 0, vibrance = 0, vignette = 0, clarity = 0, dehaze = 0 } = params

  _canvas.width = sourceCanvas.width
  _canvas.height = sourceCanvas.height
  _gl.viewport(0, 0, _canvas.width, _canvas.height)

  _gl.bindTexture(_gl.TEXTURE_2D, _texture)
  _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, sourceCanvas)

  _gl.useProgram(_program)
  _gl.uniform1f(_uniforms.brightness, brightness)
  _gl.uniform1f(_uniforms.contrast, contrast)
  _gl.uniform1f(_uniforms.saturation, saturation)
  _gl.uniform1f(_uniforms.warmth, warmth)
  _gl.uniform1f(_uniforms.vibrance, vibrance)
  _gl.uniform1f(_uniforms.vignette, vignette)
  _gl.uniform1f(_uniforms.clarity, clarity)
  _gl.uniform1f(_uniforms.dehaze, dehaze)
  _gl.uniform2f(_uniforms.resolution, _canvas.width, _canvas.height)

  _gl.drawArrays(_gl.TRIANGLE_STRIP, 0, 4)

  return _canvas
}

export function isWebGLAvailable() {
  return !!_gl || initWebGL()
}
