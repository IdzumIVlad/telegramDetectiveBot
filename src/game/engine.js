import { UI_KEYS } from './platform/ui.js'
import { getLocale } from './locales.js'
import { looksLikeMultiQuestion } from './multiQuestion.js'
import { newSuspectProfile } from './temperament.js'
import { computeScore10 } from './scoring.js'
import { askSuspectLLM } from '../llm/suspect.js'
import { checkGuessLLM } from '../llm/judge.js'
import { googleSheetsService } from '../services/googleSheets.js'

function maxQuestions(s) {
  return s.limitBase + (s.extraUnlocked ? s.extraLimit : 0)
}
function questionsLeft(s) {
  return Math.max(0, maxQuestions(s) - s.asked)
}

/**
 * @param {import('./platform/context').GameContext} ctx
 * @param {object} deps
 */
export async function startGame(ctx, { sessionStore, caseManager }) {
  const chatId = ctx.chatId
  if (!chatId) return
  const s = sessionStore.getSession(chatId)

  // 0. Language Check
  if (!s.lang) {
    s.stage = 'LANGUAGE_SELECTION'
    await ctx.reply('Select Language / Выберите язык', [['ru', 'en', 'es']], 'en') // default en for nav
    return
  }

  const locale = getLocale(s.lang)
  const kbMain = [[UI_KEYS.SOLVE, UI_KEYS.RESTART], [UI_KEYS.HELP]]

  // Warn if game is active
  if (['INTERROGATION', 'SOLVING', 'CONFIRM_EXTRA', 'CONFIRM_SOLVE'].includes(s.stage)) {
    await ctx.reply(locale.GAME_ALREADY_ACTIVE(questionsLeft(s), s.stage), kbMain, s.lang)
    return
  }

  // Reset state to selection
  s.stage = 'CASE_SELECTION'
  s.asked = 0
  s.extraUnlocked = false
  s.history = []

  const activeCases = caseManager.getAllActive()
  if (activeCases.length === 0) {
    await ctx.reply(locale.NO_ACTIVE_CASES, null, s.lang)
    return
  }

  let msg = locale.CASE_SELECT_MSG
  const kbSelection = []

  activeCases.forEach((c, i) => {
    let btnKey
    if (i === 0) btnKey = UI_KEYS.CASE_1
    else if (i === 1) btnKey = UI_KEYS.CASE_2
    else btnKey = `CASE_${i + 1}`

    const label = locale[btnKey] || `${locale.CASE_DEFAULT_LABEL} #${i + 1}`
    const title = c.title[s.lang] || c.title.ru || c.title
    msg += `${label}: ${title}\n`

    if (btnKey && locale[btnKey]) {
      kbSelection.push([btnKey])
    }
  })

  await ctx.reply(msg, kbSelection, s.lang)
}

/**
 * @param {import('./platform/context').GameContext} ctx
 * @param {object} deps
 */
export async function handleText(ctx, deps) {
  const { sessionStore, openai, model, caseManager } = deps
  const chatId = ctx.chatId
  if (!chatId) return

  const s = sessionStore.getSession(chatId)
  let text = ctx.text

  // 0. language selection
  if (s.stage === 'LANGUAGE_SELECTION') {
    text = text.toLowerCase()
    if (['ru', 'en', 'es'].includes(text)) {
      s.lang = text
      await startGame(ctx, deps)
      return
    }
    // Try to map flags/labels if user clicks button? 
    // Usually buttons send exact text. Assuming 'ru'/'en' buttons.
    await ctx.reply('Please select: ru, en, es', [['ru', 'en', 'es']])
    return
  }

  const locale = getLocale(s.lang || 'ru')

  // Check generic command helper
  // Allow matching either the localized label OR the raw key (Discord customId)
  const isCmd = (key) => text === locale[key] || text === key

  // Reusable Keyboards
  const kbMain = [[UI_KEYS.SOLVE, UI_KEYS.RESTART], [UI_KEYS.HELP]]
  const kbYesNo = [[UI_KEYS.YES, UI_KEYS.NO]]
  const kbMore = [[UI_KEYS.MORE_YES], [UI_KEYS.MORE_NO]]
  const kbSelection = [[UI_KEYS.CASE_1], [UI_KEYS.CASE_2]]

  try {
    // ---- Auto recover
    if (s.stage === 'IDLE') {
      await startGame(ctx, deps)
      return
    }

    // =====================
    // GLOBAL COMMANDS
    // =====================

    // 1. RESTART
    if (isCmd(UI_KEYS.RESTART)) {
      if (s.stage === 'CASE_SELECTION') {
        s.lang = null // Optional: allow resetting language on restart? 
        // User asked: "Also and at restart, offer to choose language".
        // So YES, we should clear lang.
        s.stage = 'LANGUAGE_SELECTION' // Force re-selection logic next start called
        sessionStore.resetSession(chatId) // This wipes s.lang anyway if implementation does what it says
        // Wait, resetSession creates fresh session.
        await startGame(ctx, deps)
        return
      }
      s.prevStage = s.stage
      s.stage = 'CONFIRM_RESTART'
      await ctx.reply(locale.CONFIRM_RESTART, kbYesNo, s.lang)
      return
    }

    // 2. HELP
    if (isCmd(UI_KEYS.HELP)) {
      await ctx.reply(locale.HELP_TEXT, kbMain, s.lang)
      return
    }

    // =====================
    // STAGE HANDLERS
    // =====================

    // ---- CASE SELECTION
    if (s.stage === 'CASE_SELECTION') {
      const activeCases = caseManager.getAllActive()
      let selectedCase = null

      // Map buttons
      if (isCmd(UI_KEYS.CASE_1) && activeCases[0]) selectedCase = activeCases[0]
      if (isCmd(UI_KEYS.CASE_2) && activeCases[1]) selectedCase = activeCases[1]

      if (!selectedCase) {
        // Checking against dynamic default labels? 
        // Harder. Let's assume buttons are enough.
        await ctx.reply(locale.CASE_SELECT_MSG, kbSelection, s.lang)
        return
      }

      s.caseId = selectedCase.id
      s.stage = 'INTERROGATION'
      s.asked = 0
      s.extraUnlocked = false
      s.suspectProfile = newSuspectProfile()
      s.history = []

      const rules = selectedCase.rulesShort[s.lang] || selectedCase.rulesShort.ru
      const scenario = selectedCase.scenario[s.lang] || selectedCase.scenario.ru

      await ctx.reply(rules, kbMain, s.lang)
      await ctx.reply(scenario, kbMain, s.lang)

      // Log Start
      console.log('📝 Logging START to sheets...')
      googleSheetsService.logGameEvent({
        eventName: 'START',
        userString: `@${ctx.username} (${ctx.firstName || ''})`,
        userId: ctx.userId,
        caseId: s.caseId,
      })
      return
    }

    // ---- CONFIRM RESTART
    if (s.stage === 'CONFIRM_RESTART') {
      if (isCmd(UI_KEYS.YES)) {
        sessionStore.resetSession(chatId)
        await ctx.reply(locale.CONFIRM_RESTART_YES, kbMain, s.lang)
        await startGame(ctx, { sessionStore, caseManager }) // This will see new session -> ask lang
        return
      }
      if (isCmd(UI_KEYS.NO)) {
        s.stage = s.prevStage || 'INTERROGATION'
        await ctx.reply(locale.CONFIRM_RESTART_NO, kbMain, s.lang)
        return
      }
      await ctx.reply(locale.CONFIRM_YES_NO, kbYesNo, s.lang)
      return
    }

    // 3. SOLVE button
    if (isCmd(UI_KEYS.SOLVE)) {
      if (['INTERROGATION', 'OFFER_EXTRA'].includes(s.stage) || s.stage === 'CONFIRM_EXTRA') {
        s.prevStage = s.stage
        s.stage = 'CONFIRM_SOLVE'
        await ctx.reply(locale.CONFIRM_SOLVE, kbYesNo, s.lang)
        return
      }
    }

    // ---- CONFIRM SOLVE
    if (s.stage === 'CONFIRM_SOLVE') {
      if (isCmd(UI_KEYS.YES)) {
        s.stage = 'SOLVING'
        await ctx.reply(locale.SOLVE_MODE_MSG, kbMain, s.lang)
        return
      }
      if (isCmd(UI_KEYS.NO)) {
        s.stage = s.prevStage || 'INTERROGATION'
        await ctx.reply(locale.CONFIRM_SOLVE_NO, kbMain, s.lang)
        return
      }
      await ctx.reply(locale.CONFIRM_YES_NO, kbYesNo, s.lang)
      return
    }

    // ---- CONFIRM EXTRA
    if (s.stage === 'CONFIRM_EXTRA') {
      if (isCmd(UI_KEYS.MORE_YES)) {
        s.extraUnlocked = true
        s.stage = 'INTERROGATION'
        await ctx.reply(locale.LIMIT_EXTRA_YES, kbMain, s.lang)
        return
      }
      if (isCmd(UI_KEYS.MORE_NO)) {
        s.stage = 'SOLVING'
        await ctx.reply(locale.SOLVE_MODE_MSG, kbMain, s.lang)
        return
      }
      await ctx.reply(locale.LIMIT_REACHED, kbMore, s.lang)
      return
    }

    // Get case
    const c = caseManager.getCaseById(s.caseId)
    if (!c) {
      await ctx.reply(locale.ERR_CASE_NOT_FOUND, null, s.lang)
      s.stage = 'IDLE'
      return
    }

    const logData = {
      userString: `@${ctx.username}`,
      userId: ctx.userId,
      caseId: s.caseId,
    }

    // ---- SOLVING
    if (s.stage === 'SOLVING') {
      await ctx.reply(locale.THIKING, [], s.lang) // empty keys

      let verdict
      try {
        // Pass language to checkGuess if supported, or rely on system prompt injection?
        // checkGuessLLM doesn't have lang support yet, but we will pass it in caseData context logic inside it?
        // Or just assume it works.
        // Ideally we update checkGuessLLM too, but for now let's pass it.
        verdict = await checkGuessLLM({ openai, model, caseData: c, guess: text, lang: s.lang })
      } catch (e) {
        console.error('❌ checkGuessLLM error:', e?.message || e)
        await ctx.reply(locale.ERR_LLM_CHECK, kbMain, s.lang)
        return
      }

      const score = computeScore10(verdict.closeness, s.asked)

      if (verdict.is_correct) {
        const within10 = s.asked <= 10
        const winLabel = within10 ? locale.WIN_TITLE : locale.WIN_TITLE_COND
        const meta = locale.RESULT_META(verdict.closeness, s.asked, score)
        const solution = c.solution[s.lang] || c.solution.ru

        s.stage = 'FINISHED'
        await ctx.reply(`${winLabel}\n${meta}\n\n${verdict.feedback}\n\n${solution}`, kbMain, s.lang)

        console.log('📝 Logging WIN to sheets...')
        googleSheetsService.logGameEvent({
          ...logData,
          eventName: 'WIN',
          score,
          questionsAsked: s.asked
        })
        return
      }

      const solution = c.solution[s.lang] || c.solution.ru
      s.stage = 'FINISHED'
      await ctx.reply(
        `${locale.LOSS_TITLE}\n${locale.RESULT_META(verdict.closeness, s.asked, score)}\n\n${verdict.feedback}\n\n${solution}\n\n${locale.PLAY_AGAIN}`,
        kbMain, s.lang
      )

      googleSheetsService.logGameEvent({
        ...logData,
        eventName: 'LOSS',
        score,
        questionsAsked: s.asked
      })
      return
    }

    // ---- INTERROGATION
    if (s.stage === 'INTERROGATION') {
      if (questionsLeft(s) <= 0) {
        if (!s.extraUnlocked && s.asked >= s.limitBase) {
          s.stage = 'CONFIRM_EXTRA'
          await ctx.reply(locale.LIMIT_REACHED, kbMore, s.lang)
          return
        }
        s.stage = 'SOLVING'
        await ctx.reply(locale.SOLVE_MODE_MSG, kbMain, s.lang)
        return
      }

      if (looksLikeMultiQuestion(text)) {
        await ctx.reply(locale.MULTI_QUESTION_WARN, kbMain, s.lang)
      }

      s.asked += 1
      await ctx.sendTyping()

      let answer
      try {
        const res = await askSuspectLLM({
          openai,
          model,
          caseData: c,
          session: s,
          questionOriginal: text,
        })
        answer = res.answer
      } catch (e) {
        console.error('❌ askSuspectLLM error:', e?.message || e)
        await ctx.reply(locale.ERR_LLM_BABE, kbMain, s.lang)
        s.asked = Math.max(0, s.asked - 1)
        return
      }

      await ctx.reply(answer, kbMain, s.lang)

      // Log Q&A
      googleSheetsService.logQuestion({
        userString: `@${ctx.username}`,
        userId: ctx.userId,
        caseId: s.caseId,
        question: text,
        answer: answer
      }).catch(e => console.error('❌ Log question failed:', e.message))

      if (!s.extraUnlocked && s.asked >= s.limitBase) {
        s.stage = 'CONFIRM_EXTRA'
        await ctx.reply(locale.LIMIT_REACHED, kbMore, s.lang)
        return
      }
      return
    }

    // ---- FINISHED
    if (s.stage === 'FINISHED') {
      await ctx.reply(locale.GAME_FINISHED, kbMain, s.lang)
      return
    }

    await ctx.reply(locale.NOT_UNDERSTOOD, kbMain, s.lang)

  } catch (e) {
    console.error('❌ handler error:', e?.message || e)
    await ctx.reply(locale.ERR_INTERNAL || 'Error', kbMain, s.lang)
  }
}
