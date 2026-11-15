export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export function photoExtension(file: File): string | null {
  return EXTENSIONS[file.type] ?? null
}

export function photoProblem(file: File): string | null {
  if (!photoExtension(file)) return '请选图片'
  if (file.size > MAX_PHOTO_BYTES) return '照片太大'
  return null
}

const RECEIPT_EXTENSIONS: Record<string, string> = {
  ...EXTENSIONS,
  'image/jpg': 'jpg',
  'image/pjpeg': 'jpg',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

/** Any image up to 5MB. Phones may send HEIC from the camera roll. */
export function receiptProblem(file: File): string | null {
  if (!file.type.startsWith('image/')) return '请选图片'
  if (file.size > MAX_PHOTO_BYTES) return '照片太大'
  return null
}

export function receiptExtension(file: File): string {
  return RECEIPT_EXTENSIONS[file.type] ?? 'jpg'
}

/** Object key inside the private receipts bucket: <orderNo>-<random>.<ext>. */
export function receiptObjectName(orderNo: string, file: File): string {
  const code = orderNo.replace(/^#/, '').replace(/[^A-Za-z0-9]/g, '') || 'order'
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const random = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${code}-${random}.${receiptExtension(file)}`
}
