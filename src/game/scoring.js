// =====================
// Score (0..10)
// =====================
export function efficiencyFactorByQuestions(q) {
  if (q <= 0) return 0
  if (q === 1) return 0.80
  if (q === 2) return 0.95
  if (q <= 4) return 1.00
  if (q <= 7) return 0.90
  if (q <= 10) return 0.80
  if (q <= 15) return 0.65
  return 0.50
}

export function computeScore10(closeness, asked) {
  const c = Math.max(0, Math.min(100, Number(closeness) || 0))
  if (c < 50) return 0
  const acc = c / 100
  const eff = efficiencyFactorByQuestions(asked)
  const score = Math.round(10 * acc * eff)
  return Math.max(0, Math.min(10, score))
}
