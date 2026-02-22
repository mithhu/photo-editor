export function buildCurveLUT(points: [number, number][]): Uint8Array {
  const sorted: [number, number][] = [...points].sort((a, b) => a[0] - b[0])
  const lut = new Uint8Array(256)

  if (sorted.length < 2) {
    for (let i = 0; i < 256; i++) lut[i] = i
    return lut
  }

  for (let i = 0; i < 256; i++) {
    const x: number = i / 255
    let j: number = 0
    while (j < sorted.length - 1 && sorted[j + 1][0] < x) j++

    if (j >= sorted.length - 1) {
      lut[i] = Math.round(sorted[sorted.length - 1][1] * 255)
    } else {
      const [x0, y0] = sorted[j]
      const [x1, y1] = sorted[j + 1]
      const t: number = x1 === x0 ? 0 : (x - x0) / (x1 - x0)
      const st: number = t * t * (3 - 2 * t)
      const y: number = y0 + (y1 - y0) * st
      lut[i] = Math.round(Math.max(0, Math.min(1, y)) * 255)
    }
  }
  return lut
}
