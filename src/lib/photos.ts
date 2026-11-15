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
