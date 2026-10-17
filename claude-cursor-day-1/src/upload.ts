import { fileToDataUrl } from './fonts'
import { actions, getState, currentPage, toast } from './store'
import type { ImageEl } from './types'

export interface LoadedImage {
  src: string
  nw: number
  nh: number
  name: string
}

export async function readImageFile(file: File): Promise<LoadedImage> {
  const src = await fileToDataUrl(file)
  const dims = await new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth || 512, h: img.naturalHeight || 512 })
    img.onerror = () => resolve({ w: 512, h: 512 })
    img.src = src
  })
  return { src, nw: dims.w, nh: dims.h, name: file.name.replace(/\.[^.]+$/, '') }
}

export function openFilePicker(accept: string, multiple: boolean, cb: (files: File[]) => void) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  input.multiple = multiple
  input.style.display = 'none'
  input.onchange = () => {
    const files = Array.from(input.files || [])
    input.remove()
    if (files.length) cb(files)
  }
  document.body.appendChild(input)
  input.click()
}

export async function addImageFiles(files: File[]) {
  for (const f of files) {
    if (!f.type.startsWith('image/') && !/\.(svg|png|jpe?g|webp|gif)$/i.test(f.name)) {
      toast(`${f.name}: not an image`)
      continue
    }
    if (f.type === 'image/svg+xml' || /\.svg$/i.test(f.name)) {
      try {
        actions.addSvgText(await f.text(), f.name.replace(/\.svg$/i, ''))
        continue
      } catch (e) {
        toast(`${f.name}: ${(e as Error).message} – added as a flat image`)
      }
    }
    const im = await readImageFile(f)
    actions.addImageFromSrc(im.src, im.nw, im.nh, im.name)
  }
}

export function pickImageForElement(id: string) {
  openFilePicker('image/*', false, async (files) => {
    const im = await readImageFile(files[0])
    actions.setImageSrc(id, im.src, im.nw, im.nh)
  })
}

export async function replaceImage(id: string, file: File) {
  const im = await readImageFile(file)
  actions.setImageSrc(id, im.src, im.nw, im.nh)
}

/** topmost image element under a world point */
export function imageAt(x: number, y: number): ImageEl | null {
  const els = currentPage(getState()).elements
  for (let i = els.length - 1; i >= 0; i--) {
    const e = els[i]
    if (e.type !== 'image' || e.hidden) continue
    const cx = e.x + e.w / 2
    const cy = e.y + e.h / 2
    const a = (-e.rotation * Math.PI) / 180
    const dx = x - cx
    const dy = y - cy
    const lx = dx * Math.cos(a) - dy * Math.sin(a)
    const ly = dx * Math.sin(a) + dy * Math.cos(a)
    if (Math.abs(lx) <= e.w / 2 && Math.abs(ly) <= e.h / 2) return e
  }
  return null
}
