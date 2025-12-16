import { extractFirstQuestion } from '../game/multiQuestion.js'
import { newSuspectProfile } from '../game/temperament.js'
import { DEFAULT_SUSPECT_PROMPT } from './promptTemplates.js'

// Localized emotion labels
const EMOTIONS = {
  ru: { cold: '[холодно]', calm: '[спокойно]', nervous: '[нервничает]', tense: '[напрягся]', onEdge: '[на взводе]' },
  en: { cold: '[coldly]', calm: '[calmly]', nervous: '[nervous]', tense: '[tense]', onEdge: '[on edge]' },
  es: { cold: '[frío]', calm: '[tranquilo]', nervous: '[nervioso]', tense: '[tenso]', onEdge: '[al límite]' }
}

function pickEmotionLabel(session) {
  const n = session.asked
  const lang = session.lang || 'ru'
  const labels = EMOTIONS[lang] || EMOTIONS.ru
  const base = session.suspectProfile?.baseline || 'флегматичный'

  // Baseline keywords are currently Russian in temperament.js. 
  // We can pick labels based on them.
  if (n <= 3) return base === 'агрессивный' ? labels.cold : labels.calm
  if (n <= 7) return base === 'нервный' ? labels.nervous : labels.tense
  return base === 'агрессивный' ? labels.onEdge : labels.nervous
}

function triggersForQuestion(caseData, question, lang = 'ru') {
  const q = (question || '').toLowerCase()
  const hits = []

  for (const t of caseData.suspect?.triggers || []) {
    // Check keywords in current language, fallback to RU if missing
    const keys = t.keywords?.[lang] || t.keywords?.ru || []
    if (keys.some((k) => q.includes(k))) {
      // Return reveal in current language
      const reveal = t.reveal?.[lang] || t.reveal?.ru
      if (reveal) hits.push(reveal)
    }
  }
  return hits
}


function forceEmotionFormat(answer, emotionLabel) {
  const emo = `🎭 ${emotionLabel}`
  const a = (answer || '').trim()
  if (!a) return `${emo}\n— …`

  if (!a.startsWith('🎭')) {
    const cleaned = a.replace(/^\s*[\-\—]\s*/, '')
    return `${emo}\n— ${cleaned}`
  }

  const lines = a.split('\n')
  if (lines.length === 1) return `${lines[0]}\n— …`
  if (lines.length >= 2 && !lines[1].trim().startsWith('—')) {
    lines[1] = `— ${lines[1].trim()}`
    return lines.join('\n')
  }
  return a
}

export async function askSuspectLLM({ openai, model, caseData, session, questionOriginal }) {
  const lang = session.lang || 'ru'
  const profile = session.suspectProfile || newSuspectProfile()
  session.suspectProfile = profile

  const q1 = extractFirstQuestion(questionOriginal)
  const emotionLabel = pickEmotionLabel(session)
  const reveals = triggersForQuestion(caseData, q1, lang)
  const history = session.history.slice(-8)

  // 1. Pick Template
  let rawTemplate = DEFAULT_SUSPECT_PROMPT
  // If caseData.promptTemplate is object {ru, en, es}
  if (caseData.promptTemplate && typeof caseData.promptTemplate === 'object') {
    rawTemplate = caseData.promptTemplate[lang] || caseData.promptTemplate.ru || DEFAULT_SUSPECT_PROMPT
  } else if (typeof caseData.promptTemplate === 'string') {
    rawTemplate = caseData.promptTemplate
  }

  const triggersSection = reveals.length
    ? `TRIGGER (MUST INCLUDE):\n${reveals.map((r) => `- ${r}`).join('\n')}` // Universal-ish or language dependent? 
    // Ideally the prompt template handles the language of "TRIGGER". 
    // But here we inject a string. 
    // Let's assume the template has {{triggers_section}} and we just inject content.
    // Better to localize the prefix too.
    : ''

  // 2. Pick Data
  const sName = caseData.suspect?.name?.[lang] || caseData.suspect?.name?.ru || 'Suspect'

  const getList = (src) => {
    if (!src) return []
    if (Array.isArray(src)) return src // legacy fallback
    return src[lang] || src.ru || []
  }

  const factsList = getList(caseData.suspect?.facts).map((f) => `- ${f}`).join('\n')
  const liesList = getList(caseData.suspect?.lies).map((l) => `- ${l}`).join('\n')

  // Voice: check caseData (Sheet) priority, fallback to profile (random)
  const sVoice = caseData.suspect?.voice?.[lang] || caseData.suspect?.voice?.ru || profile.voice

  const system = rawTemplate
    .replace('{{role}}', sName)
    .replace('{{temperament}}', profile.baseline)
    .replace('{{voice}}', sVoice)
    .replace('{{quirks}}', profile.quirks.join(', '))
    .replace('{{emotionLabel}}', emotionLabel)
    .replace('{{scenario}}', caseData.scenario[lang] || caseData.scenario.ru || '')
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
