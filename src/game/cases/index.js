import { nightWarehouseCase } from './night-warehouse.js'
import { museumTheftCase } from './museum-theft.js'

// =====================
// Cases registry
// =====================
export const CASES = [
  nightWarehouseCase,
  museumTheftCase,
]

// Keeping this for fallback, but main logic will use direct picking
export function pickActiveCaseRandom() {
  const active = CASES.filter((c) => c.isActive)
  if (!active.length) return CASES[0]
  return active[Math.floor(Math.random() * active.length)]
}

export function getCaseById(caseId) {
  return CASES.find((c) => c.id === caseId) || null
}
