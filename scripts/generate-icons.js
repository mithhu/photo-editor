/**
 * Generates PNG icons from the SVG favicon for PWA manifest and iOS.
 * Run: node scripts/generate-icons.js
 *
 * Uses canvas to render the SVG at multiple sizes.
 * Output goes to public/ directory.
 */

import { writeFileSync } from 'fs'

const sizes = [192, 512]

// Since we may not have the `canvas` npm package, generate simple PNG icons
// using raw pixel data. These are minimal but valid PNGs.

function createMinimalPng(size) {
  // Create a simple PNG with the app colors
  // Using a raw approach that doesn't need external dependencies

  const bg = [24, 24, 27] // #18181b
  const amber = [245, 158, 11] // #f59e0b
  const pixels = new Uint8Array(size * size * 4)

  const cx = size / 2
  const cy = size * 0.45
  const radius = size * 0.2
  const cornerR = size * 0.125

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4

      // Rounded rect background
      let inRect = true
      if (x < cornerR && y < cornerR) {
        inRect = Math.hypot(x - cornerR, y - cornerR) <= cornerR
      } else if (x > size - cornerR && y < cornerR) {
        inRect = Math.hypot(x - (size - cornerR), y - cornerR) <= cornerR
      } else if (x < cornerR && y > size - cornerR) {
        inRect = Math.hypot(x - cornerR, y - (size - cornerR)) <= cornerR
      } else if (x > size - cornerR && y > size - cornerR) {
        inRect = Math.hypot(x - (size - cornerR), y - (size - cornerR)) <= cornerR
      }

      if (!inRect) {
        pixels[idx] = 0
        pixels[idx + 1] = 0
        pixels[idx + 2] = 0
        pixels[idx + 3] = 0
        continue
      }

      // Circle (lens)
      const dist = Math.hypot(x - cx, y - cy)
      const ringWidth = size * 0.047
      const isRing = Math.abs(dist - radius) < ringWidth

      // Bars below circle
      const barY1 = cy + radius + size * 0.08
      const barH = size * 0.016
      const isBar1 = y >= barY1 && y < barY1 + barH && Math.abs(x - cx) < size * 0.11
      const isBar2 = y >= barY1 + size * 0.04 && y < barY1 + size * 0.04 + barH && Math.abs(x - cx) < size * 0.15
      const isBar3 = y >= barY1 + size * 0.08 && y < barY1 + size * 0.08 + barH && Math.abs(x - cx) < size * 0.09

      if (isRing || isBar1) {
        pixels[idx] = amber[0]
        pixels[idx + 1] = amber[1]
        pixels[idx + 2] = amber[2]
        pixels[idx + 3] = 255
      } else if (isBar2) {
        pixels[idx] = amber[0]
        pixels[idx + 1] = amber[1]
        pixels[idx + 2] = amber[2]
        pixels[idx + 3] = 153 // 0.6 opacity
      } else if (isBar3) {
        pixels[idx] = amber[0]
        pixels[idx + 1] = amber[1]
        pixels[idx + 2] = amber[2]
        pixels[idx + 3] = 77 // 0.3 opacity
      } else {
        pixels[idx] = bg[0]
        pixels[idx + 1] = bg[1]
        pixels[idx + 2] = bg[2]
        pixels[idx + 3] = 255
      }
    }
  }

  return encodePng(size, size, pixels)
}

function encodePng(width, height, rgba) {
  // Minimal PNG encoder
  function crc32(buf) {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ crc32Table[(c ^ buf[i]) & 0xff]
    }
    return (c ^ 0xffffffff) >>> 0
  }

  const crc32Table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc32Table[n] = c >>> 0
  }

  function adler32(buf) {
    let a = 1, b = 0
    for (let i = 0; i < buf.length; i++) {
      a = (a + buf[i]) % 65521
      b = (b + a) % 65521
    }
    return ((b << 16) | a) >>> 0
  }

  // Raw image data with filter byte (0 = none) per row
  const raw = new Uint8Array(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0 // filter none
    for (let x = 0; x < width * 4; x++) {
      raw[y * (1 + width * 4) + 1 + x] = rgba[y * width * 4 + x]
    }
  }

  // Deflate (store only, no compression - simple but larger)
  const blocks = []
  const BLOCK_SIZE = 65535
  for (let i = 0; i < raw.length; i += BLOCK_SIZE) {
    const end = Math.min(i + BLOCK_SIZE, raw.length)
    const last = end >= raw.length ? 1 : 0
    const len = end - i
    blocks.push(last, len & 0xff, (len >> 8) & 0xff, (~len) & 0xff, ((~len) >> 8) & 0xff)
    for (let j = i; j < end; j++) blocks.push(raw[j])
  }

  const deflated = new Uint8Array(blocks.length + 6)
  deflated[0] = 0x78
  deflated[1] = 0x01
  deflated.set(blocks, 2)
  const adl = adler32(raw)
  deflated[deflated.length - 4] = (adl >> 24) & 0xff
  deflated[deflated.length - 3] = (adl >> 16) & 0xff
  deflated[deflated.length - 2] = (adl >> 8) & 0xff
  deflated[deflated.length - 1] = adl & 0xff

  function makeChunk(type, data) {
    const buf = new Uint8Array(4 + type.length + data.length + 4)
    const dv = new DataView(buf.buffer)
    dv.setUint32(0, data.length)
    for (let i = 0; i < type.length; i++) buf[4 + i] = type.charCodeAt(i)
    buf.set(data, 4 + type.length)
    const crcData = buf.slice(4, 4 + type.length + data.length)
    dv.setUint32(4 + type.length + data.length, crc32(crcData))
    return buf
  }

  const ihdr = new Uint8Array(13)
  const ihdrDv = new DataView(ihdr.buffer)
  ihdrDv.setUint32(0, width)
  ihdrDv.setUint32(4, height)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdrChunk = makeChunk('IHDR', ihdr)
  const idatChunk = makeChunk('IDAT', deflated)
  const iendChunk = makeChunk('IEND', new Uint8Array(0))

  const png = new Uint8Array(sig.length + ihdrChunk.length + idatChunk.length + iendChunk.length)
  let offset = 0
  png.set(sig, offset); offset += sig.length
  png.set(ihdrChunk, offset); offset += ihdrChunk.length
  png.set(idatChunk, offset); offset += idatChunk.length
  png.set(iendChunk, offset)

  return png
}

for (const size of sizes) {
  const png = createMinimalPng(size)
  const path = `public/icon-${size}.png`
  writeFileSync(path, png)
  console.log(`Generated ${path} (${png.length} bytes)`)
}
