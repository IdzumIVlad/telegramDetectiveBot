// =====================
// Session store (MVP in-memory)
// =====================
const sessions = new Map()

export function createDefaultSession() {
  return {
    stage: 'IDLE', // IDLE | CASE_SELECTION | INTERROGATION | CONFIRM_RESTART | CONFIRM_EXTRA | CONFIRM_SOLVE | SOLVING | FINISHED
    // removed flags: awaitingRestartConfirm, awaitingExtraConfirm — now strictly stages

    caseId: null,
    asked: 0,
    limitBase: 10,
    extraUnlocked: false,
    extraLimit: 5,

    suspectProfile: null,
    history: [],
    startedAt: Date.now(),
  }
}

export function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, createDefaultSession())
  }
  return sessions.get(chatId)
}

export function resetSession(chatId) {
  sessions.set(chatId, createDefaultSession())
  return sessions.get(chatId)
}

export function setSession(chatId, session) {
  sessions.set(chatId, session)
  return session
}
