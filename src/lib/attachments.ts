import { t as translate } from '@/i18n'
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

export const ATTACHMENT_MIME_TYPES = [
  'image/*',
  'video/mp4',
  'video/webm',
  'application/pdf',
  'application/zip',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'text/markdown',
]

export interface UploadedAttachment {
  id: string
  url: string
  filename: string
  mimeType: string
  filesize: number
}

const UNIT = ['B', 'KB', 'MB', 'GB']

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNIT.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = value >= 100 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${UNIT[unit]}`
}

export function isImage(mimeType: string | null | undefined): boolean {
  return typeof mimeType === 'string' && mimeType.startsWith('image/')
}

export function attachmentMarkdown(file: UploadedAttachment, name = file.filename): string {
  const label = name.replace(/[[\]()\n]/g, ' ').trim() || 'attachment'
  return isImage(file.mimeType) ? `![${label}](${file.url})` : `[${label}](${file.url})`
}

export function uploadPlaceholder(token: string, name: string, image: boolean): string {
  const label = translate("Uploading {0}…", { 0: name.replace(/[[\]()\n]/g, ' ').trim() })
  return `${image ? '!' : ''}[${label}](upload:${token})`
}

export function rejectionReason(file: { name: string; size: number; type: string }): string | null {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return translate("{0} is {1}. The limit is {2}.", { 0: file.name, 1: formatBytes(file.size), 2: formatBytes(MAX_ATTACHMENT_BYTES) })
  }
  if (!accepts(file.type)) {
    return translate("{0} is not a file type this app accepts.", { 0: file.name })
  }
  return null
}

function accepts(mimeType: string): boolean {
  if (!mimeType) return false
  return ATTACHMENT_MIME_TYPES.some((allowed) =>
    allowed.endsWith('/*') ? mimeType.startsWith(allowed.slice(0, -1)) : allowed === mimeType,
  )
}
