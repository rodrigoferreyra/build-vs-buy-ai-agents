/** Set normalized crop rect to target aspect ratio (width/height), centered in current crop. */
export function applyCropAspect(
  cropX: number,
  cropY: number,
  cropW: number,
  cropH: number,
  aspect: number,
): { cropX: number; cropY: number; cropW: number; cropH: number } {
  const boxAspect = cropW / cropH
  let w = cropW
  let h = cropH
  if (boxAspect > aspect) {
    w = cropH * aspect
  } else {
    h = cropW / aspect
  }
  const x = cropX + (cropW - w) / 2
  const y = cropY + (cropH - h) / 2
  return {
    cropX: Math.max(0, Math.min(1 - w, x)),
    cropY: Math.max(0, Math.min(1 - h, y)),
    cropW: w,
    cropH: h,
  }
}
