const UTC_ISO_WITH_MILLIS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

function normalizeInput(value: string): string {
  const trimmed = value.trim()

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace(' ', 'T')}.000Z`
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}.000Z`
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+$/.test(trimmed)) {
    return `${trimmed}Z`
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed) && !/(Z|[+-]\d{2}:\d{2})$/.test(trimmed)) {
    return `${trimmed}Z`
  }

  return trimmed
}

export function toUtcIso8601(value: string | Date): string {
  const raw = value instanceof Date ? value.toISOString() : value

  if (UTC_ISO_WITH_MILLIS.test(raw)) {
    return raw
  }

  const normalized = normalizeInput(raw)
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`不正な日時フォーマット: ${raw}`)
  }
  return parsed.toISOString()
}
