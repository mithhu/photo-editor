export interface ParsedLUT {
  size: number
  type: '1d' | '3d'
  data: Float32Array
  domainMin: number[]
  domainMax: number[]
}

/**
 * Parse .cube LUT files (industry standard 3D color lookup table format).
 * Supports both 1D and 3D LUTs.
 *
 * .cube format:
 *   - Lines starting with # are comments
 *   - `LUT_1D_SIZE N` or `LUT_3D_SIZE N` declares the grid size
 *   - `DOMAIN_MIN r g b` and `DOMAIN_MAX r g b` (usually 0 0 0 and 1 1 1)
 *   - Then N (1D) or N^3 (3D) lines of `r g b` float values in 0-1 range
 */
export function parseCubeLUT(text: string): ParsedLUT {
  const lines = text.split(/\r?\n/)
  let size = 0
  let type: '1d' | '3d' = '3d'
  let domainMin = [0, 0, 0]
  let domainMax = [1, 1, 1]
  const values: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('#') || line.startsWith('TITLE')) continue

    if (line.startsWith('LUT_3D_SIZE')) {
      size = parseInt(line.split(/\s+/)[1], 10)
      type = '3d'
      continue
    }
    if (line.startsWith('LUT_1D_SIZE')) {
      size = parseInt(line.split(/\s+/)[1], 10)
      type = '1d'
      continue
    }
    if (line.startsWith('DOMAIN_MIN')) {
      const parts = line.split(/\s+/)
      domainMin = [parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]
      continue
    }
    if (line.startsWith('DOMAIN_MAX')) {
      const parts = line.split(/\s+/)
      domainMax = [parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]
      continue
    }

    const parts = line.split(/\s+/)
    if (parts.length >= 3) {
      const r = parseFloat(parts[0])
      const g = parseFloat(parts[1])
      const b = parseFloat(parts[2])
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        values.push(r, g, b)
      }
    }
  }

  if (size === 0) {
    throw new Error('Invalid .cube file: no LUT size declaration found')
  }

  const expectedCount = type === '3d' ? size * size * size * 3 : size * 3
  if (values.length < expectedCount) {
    throw new Error(
      `Invalid .cube file: expected ${expectedCount / 3} RGB entries for ${type.toUpperCase()} size ${size}, got ${values.length / 3}`
    )
  }

  return {
    size,
    type,
    data: new Float32Array(values.slice(0, expectedCount)),
    domainMin,
    domainMax,
  }
}
