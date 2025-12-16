// =====================
// LLM: guess judge (robust JSON)
// =====================
function safeParseJsonFromText(raw) {
  if (!raw) return null
  const t = raw.trim()
  // 1) прямой JSON
  try {
    return JSON.parse(t)
  } catch { }

  // 2) попытка вытащить первый {...}
  const m = t.match(/\{[\s\S]*\}/)
  if (m) {
    try {
      return JSON.parse(m[0])
    } catch { }
  }
  return null
}

export async function checkGuessLLM({ openai, model, caseData, guess }) {
  const system = [
    'Ты — судья детективной разгадки.',
    'Оцени совпадение версии игрока с истинным решением.',
    '',
    'Верни СТРОГО JSON:',
    '{ "closeness": number, "is_correct": boolean, "feedback": string }',
    '',
    'Правила:',
    '- closeness 0..100',
    '- is_correct = true если closeness >= 65',
    '- ВАЖНО: Если игрок верно назвал ПРЕСТУПНИКА и СПОСОБ (как совершено), ставь минимум 80 баллов, даже если упущены детали (время, номер двери).',
    '- Мелкие детали (минуты, номера) влияют только на получение идеального счета (90-100).',
    '- feedback 1–3 предложения',
    '- если is_correct=false — не раскрывай полностью истинное решение',
  ].join('\n')

  const user = ['ИСТИННОЕ РЕШЕНИЕ:', caseData.solution, '', 'ВЕРСИЯ ИГРОКА:', guess].join('\n')

  const resp = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
  })

  const raw = (resp.choices?.[0]?.message?.content || '').trim()
  const j = safeParseJsonFromText(raw)

  if (!j) {
    return {
      closeness: 0,
      is_correct: false,
      feedback: 'Не смог корректно оценить версию. Напиши короче: кто, как отключили камеры, как вынесли, мотив.',
    }
  }

  const closeness = Math.max(0, Math.min(100, Number(j.closeness) || 0))
  const is_correct = !!j.is_correct || closeness >= 65
  const feedback = String(j.feedback || '').slice(0, 600)
  return { closeness, is_correct, feedback }
}
