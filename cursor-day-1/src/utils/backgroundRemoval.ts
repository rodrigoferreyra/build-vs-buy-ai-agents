/** In-browser background removal via edge-connected flood fill from corners. */
export async function removeBackgroundDataUrl(src: string, tolerance = 42): Promise<string> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const visited = new Uint8Array(width * height)
  const queue: number[] = []

  const seed = (x: number, y: number) => {
    const i = y * width + x
    if (visited[i]) return
    visited[i] = 1
    queue.push(i)
  }

  for (let x = 0; x < width; x++) {
    seed(x, 0)
    seed(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    seed(0, y)
    seed(width - 1, y)
  }

  const bg = sampleBg(data, width, height)

  while (queue.length) {
    const idx = queue.pop()!
    const x = idx % width
    const y = (idx - x) / width
    const pi = idx * 4
    if (!colorClose(data, pi, bg, tolerance)) continue
    data[pi + 3] = 0
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const ni = ny * width + nx
      if (!visited[ni]) {
        visited[ni] = 1
        queue.push(ni)
      }
    }
  }

  ctx.putImageData(new ImageData(data, width, height), 0, 0)
  return canvas.toDataURL('image/png')
}

function sampleBg(data: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const pts = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ]
  let r = 0
  let g = 0
  let b = 0
  for (const [x, y] of pts) {
    const i = (y * w + x) * 4
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  return [r / 4, g / 4, b / 4]
}

function colorClose(data: Uint8ClampedArray, i: number, bg: [number, number, number], tol: number): boolean {
  const dr = data[i] - bg[0]
  const dg = data[i + 1] - bg[1]
  const db = data[i + 2] - bg[2]
  return Math.sqrt(dr * dr + dg * dg + db * db) <= tol
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
