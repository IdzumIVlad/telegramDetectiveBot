import { extractFirstQuestion } from '../game/multiQuestion.js'
import { newSuspectProfile } from '../game/temperament.js'
import { DEFAULT_SUSPECT_PROMPT } from './promptTemplates.js'

function pickEmotionLabel(session) {
  const n = session.asked
  const base = session.suspectProfile?.baseline || 'флегматичный'
  if (n <= 3) return base === 'агрессивный' ? '[холодно]' : '[спокойно]'
  if (n <= 7) return base === 'нервный' ? '[нервничает]' : '[напрягся]'
  return base === 'агрессивный' ? '[на взводе]' : '[нервничает]'
}

function triggersForQuestion(caseData, question) {
  const q = (question || '').toLowerCase()
  const hits = []
  for (const t of caseData.suspect?.triggers || []) {
    if (t.keywords?.some((k) => q.includes(k))) hits.push(t.reveal)
  }
  return hits
}

function forceEmotionFormat(answer, emotionLabel) {
  const emo = `🎭 ${emotionLabel}`
  const a = (answer || '').trim()
  if (!a) return `${emo}\n— …`

  // если модель не соблюла формат — принудительно добавим
  if (!a.startsWith('🎭')) {
    const cleaned = a.replace(/^\s*[\-\—]\s*/, '')
    return `${emo}\n— ${cleaned}`
  }

  // если после первой строки нет "—"
  const lines = a.split('\n')
  if (lines.length === 1) return `${lines[0]}\n— …`
  if (lines.length >= 2 && !lines[1].trim().startsWith('—')) {
    lines[1] = `— ${lines[1].trim()}`
    return lines.join('\n')
  }
  return a
}

export async function askSuspectLLM({ openai, model, caseData, session, questionOriginal }) {
  const profile = session.suspectProfile || newSuspectProfile()
  session.suspectProfile = profile

  const q1 = extractFirstQuestion(questionOriginal)
  const emotionLabel = pickEmotionLabel(session)
  const reveals = triggersForQuestion(caseData, q1)
  const history = session.history.slice(-8)

  const template = caseData.promptTemplate || DEFAULT_SUSPECT_PROMPT

  const triggersSection = reveals.length
    ? `ТРИГГЕР (вплети обязательно):\n${reveals.map((r) => `- ${r}`).join('\n')}`
    : 'ТРИГГЕРА НЕТ: продвигайся мелкой конкретикой.'

  const factsList = (caseData.suspect?.facts || []).map((f) => `- ${f}`).join('\n')
  const liesList = (caseData.suspect?.lies || []).map((l) => `- ${l}`).join('\n')

  const system = template
    .replace('{{role}}', caseData.suspect?.name || 'Свидетель')
    .replace('{{temperament}}', profile.baseline)
    .replace('{{voice}}', profile.voice)
    .replace('{{quirks}}', profile.quirks.join(', '))
    .replace('{{emotionLabel}}', emotionLabel)
    .replace('{{scenario}}', caseData.scenario)
    .replace('{{facts}}', factsList)
    .replace('{{lies}}', liesList)
    .replace('{{triggers_section}}', triggersSection)


  const messages = [
    { role: 'system', content: system },
    ...history.flatMap((h) => [
      { role: 'user', content: h.q },
      { role: 'assistant', content: h.a },
    ]),
    { role: 'user', content: q1 },
  ]

  const resp = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.9,
  })

  let answer = (resp.choices?.[0]?.message?.content || '').trim()
  answer = forceEmotionFormat(answer, emotionLabel)

  session.history.push({ q: q1, a: answer })
  if (session.history.length > 20) session.history = session.history.slice(-20)

  return { answer, usedQuestion: q1 }
}
