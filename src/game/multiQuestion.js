// =====================
// Multi-question guard (не ломает игру)
// =====================
export function looksLikeMultiQuestion(text) {
  const t = (text || '').trim()
  const qm = (t.match(/[?？]/g) || []).length
  if (qm >= 2) return true
  if (t.includes('\n')) return true
  if (/\;\s+/.test(t)) return true
  if (/\?\s+\S+/.test(t)) return true
  if (/\b(и ещё|а ещё|еще|также)\b/i.test(t) && t.length > 40) return true
  return false
}

export function extractFirstQuestion(text) {
  const t = (text || '').trim()
  if (!t) return ''
  const parts = t
    .split(/\n|[?？]+|\s*;\s*|\s+\-\s+|\s+—\s+|\s*\.\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
  const first = parts[0] || t
  return first.endsWith('?') ? first : `${first}?`
}
