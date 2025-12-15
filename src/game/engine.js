import { UI_KEYS, UI_LABELS } from './platform/ui.js'
import { helpText, solveHowToText, restartConfirmText, moreQuestionsAskText, solveConfirmText } from '../bot/ui/texts.js'
import { looksLikeMultiQuestion } from './multiQuestion.js'
import { newSuspectProfile } from './temperament.js'
import { computeScore10 } from './scoring.js'
import { askSuspectLLM } from '../llm/suspect.js'
import { checkGuessLLM } from '../llm/judge.js'
import { googleSheetsService } from '../services/googleSheets.js'

// Helper to access labels easily
const L = UI_LABELS

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

  const kbMain = [[UI_KEYS.SOLVE, UI_KEYS.RESTART], [UI_KEYS.HELP]]

  // Warn if game is active, but allow forcing via buttons usually handled in handleText
  if (['INTERROGATION', 'SOLVING', 'CONFIRM_EXTRA', 'CONFIRM_SOLVE'].includes(s.stage)) {
    await ctx.reply(`🔎 Игра уже идёт.\nОсталось вопросов: ${questionsLeft(s)}\nРежим: ${s.stage}`, kbMain)
    return
  }

  // Reset state to selection
  s.stage = 'CASE_SELECTION'
  s.asked = 0
  s.extraUnlocked = false
  s.history = []

  const activeCases = caseManager.getAllActive()
  if (activeCases.length === 0) {
    await ctx.reply('⚠️ Нет активных дел. Обратитесь к администратору.')
    return
  }

  let msg = 'Какой кейс будем расследовать?\n\n'
  const kbSelection = []

  activeCases.forEach((c, i) => {
    // Dynamic Labels mapping
    let btnKey
    if (i === 0) btnKey = UI_KEYS.CASE_1
    else if (i === 1) btnKey = UI_KEYS.CASE_2
    else btnKey = `CASE_${i + 1}` // Fallback

    // For now, only 2 hardcoded buttons support in UI_KEYS, others will be text-only if we don't extend UI_KEYS or Labels
    const label = UI_LABELS[btnKey] || `Дело #${i + 1}`
    msg += `${label}: ${c.title}\n`

    // Build keyboard row
    if (btnKey && UI_LABELS[btnKey]) {
      kbSelection.push([btnKey])
    }
  })

  await ctx.reply(msg, kbSelection)
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
  const text = ctx.text

  // Reusable Keyboards
  const kbMain = [[UI_KEYS.SOLVE, UI_KEYS.RESTART], [UI_KEYS.HELP]]
  const kbYesNo = [[UI_KEYS.YES, UI_KEYS.NO]]
  const kbMore = [[UI_KEYS.MORE_YES], [UI_KEYS.MORE_NO]]
  const kbSelection = [[UI_KEYS.CASE_1], [UI_KEYS.CASE_2]]

  try {
    // ---- Auto recover (restart node) or freshly initialized
    if (s.stage === 'IDLE') {
      await startGame(ctx, deps)
      return
    }

    // =====================
    // GLOBAL COMMANDS (Restart, Help) - handled FIRST
    // =====================

    // 1. RESTART button
    if (text === L[UI_KEYS.RESTART]) {
      if (s.stage === 'CASE_SELECTION') {
        // No need to confirm if we haven't started
        await startGame(ctx, deps)
        return
      }
      s.prevStage = s.stage // save to restore if NO
      s.stage = 'CONFIRM_RESTART'
      await ctx.reply(restartConfirmText(), kbYesNo)
      return
    }

    // 2. HELP button
    if (text === L[UI_KEYS.HELP]) {
      await ctx.reply(helpText(), kbMain)
      return
    }

    // =====================
    // STAGE HANDLERS
    // =====================

    // ---- CASE SELECTION
    if (s.stage === 'CASE_SELECTION') {
      const activeCases = caseManager.getAllActive()
      let selectedCase = null

      // Map buttons to array indices
      if (text === L[UI_KEYS.CASE_1] && activeCases[0]) selectedCase = activeCases[0]
      if (text === L[UI_KEYS.CASE_2] && activeCases[1]) selectedCase = activeCases[1]

      if (!selectedCase) {
        await ctx.reply('Пожалуйста, выбери дело кнопкой снизу.', kbSelection)
        return
      }

      s.caseId = selectedCase.id
      s.stage = 'INTERROGATION'
      s.asked = 0
      s.extraUnlocked = false
      s.suspectProfile = newSuspectProfile()
      s.history = []

      await ctx.reply(selectedCase.rulesShort, kbMain)
      await ctx.reply(selectedCase.scenario, kbMain)

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
      if (text === L[UI_KEYS.YES]) {
        sessionStore.resetSession(chatId)
        await ctx.reply('✅ Прогресс сброшен.', kbMain)
        // Immediately explicitly call start to show selection
        await startGame(ctx, { sessionStore, caseManager })
        return
      }
      if (text === L[UI_KEYS.NO]) {
        s.stage = s.prevStage || 'INTERROGATION' // restore
        await ctx.reply('👌 Ок, продолжаем.', kbMain)
        return
      }
      await ctx.reply('Нажми ✅ Да или ❌ Нет.', kbYesNo)
      return
    }

    // 3. SOLVE button (Global trigger for INTERROGATION)
    if (text === L[UI_KEYS.SOLVE]) {
      if (['INTERROGATION', 'OFFER_EXTRA'].includes(s.stage) || s.stage === 'CONFIRM_EXTRA') {
        s.prevStage = s.stage
        s.stage = 'CONFIRM_SOLVE'
        await ctx.reply(solveConfirmText(), kbYesNo)
        return
      }
    }

    // ---- CONFIRM SOLVE
    if (s.stage === 'CONFIRM_SOLVE') {
      if (text === L[UI_KEYS.YES]) {
        s.stage = 'SOLVING'
        await ctx.reply(solveHowToText(), kbMain)
        return
      }
      if (text === L[UI_KEYS.NO]) {
        s.stage = s.prevStage || 'INTERROGATION'
        await ctx.reply('👌 Возвращаемся к вопросам.', kbMain)
        return
      }
      await ctx.reply('Нажми ✅ Да или ❌ Нет.', kbYesNo)
      return
    }

    // ---- CONFIRM EXTRA QUESTIONS
    if (s.stage === 'CONFIRM_EXTRA') {
      if (text === L[UI_KEYS.MORE_YES]) {
        s.extraUnlocked = true
        s.stage = 'INTERROGATION'
        await ctx.reply('✅ Отлично. У тебя есть ещё 5 вопросов. Продолжай допрос.', kbMain)
        return
      }

      if (text === L[UI_KEYS.MORE_NO]) {
        s.stage = 'SOLVING'
        await ctx.reply(solveHowToText(), kbMain)
        return
      }

      await ctx.reply(moreQuestionsAskText(), kbMore)
      return
    }

    // Get case from manager
    const c = caseManager.getCaseById(s.caseId)
    if (!c) {
      await ctx.reply('⚠️ Ошибка: Данные дела не найдены (возможно, оно было удалено). Начните заново: /start')
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
      await ctx.reply('…думает')

      let verdict
      try {
        verdict = await checkGuessLLM({ openai, model, caseData: c, guess: text })
      } catch (e) {
        console.error('❌ checkGuessLLM error:', e?.message || e)
        await ctx.reply('⚠️ Ошибка проверки версии. Попробуй ещё раз чуть короче и конкретнее.', kbMain)
        return
      }

      const score = computeScore10(verdict.closeness, s.asked)

      if (verdict.is_correct) {
        const within10 = s.asked <= 10
        const winLabel = within10 ? '🏆 Победа!' : '🥈 Условная победа!'
        const meta = `Точность: ${verdict.closeness}%\nВопросов: ${s.asked}\nБаллы: ${score}/10`

        s.stage = 'FINISHED'
        await ctx.reply(`${winLabel}\n${meta}\n\n${verdict.feedback}\n\n${c.solution}`, kbMain)

        // Log Win
        console.log('📝 Logging WIN to sheets...')
        googleSheetsService.logGameEvent({ ...logData, eventName: 'WIN' })
        return
      }

      s.stage = 'FINISHED'
      await ctx.reply(
        `❌ Не сошлось.\nТочность: ${verdict.closeness}%\nВопросов: ${s.asked}\nБаллы: ${score}/10\n\n${verdict.feedback}\n\n${c.solution}\n\nХочешь сыграть снова? /start`,
        kbMain
      )

      // Log Loss
      googleSheetsService.logGameEvent({ ...logData, eventName: 'LOSS' })
      return
    }

    // ---- INTERROGATION
    if (s.stage === 'INTERROGATION') {
      // лимит
      if (questionsLeft(s) <= 0) {
        // Only trigger offer if we haven't unlocked extra yet
        if (!s.extraUnlocked && s.asked >= s.limitBase) {
          s.stage = 'CONFIRM_EXTRA'
          await ctx.reply(moreQuestionsAskText(), kbMore)
          return
        }
        // If extra used up, force solve
        s.stage = 'SOLVING'
        await ctx.reply(solveHowToText(), kbMain)
        return
      }

      // предупреждение о мультивопросе
      if (looksLikeMultiQuestion(text)) {
        await ctx.reply('ℹ️ Я отвечу только на первый вопрос. Остальное — отдельными сообщениями.', kbMain)
      }

      // считаем вопрос
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
        await ctx.reply('⚠️ Ошибка ответа свидетеля. Попробуй переформулировать вопрос и отправь ещё раз.', kbMain)
        // откатываем потраченный вопрос, чтобы не было обидно
        s.asked = Math.max(0, s.asked - 1)
        return
      }

      await ctx.reply(answer, kbMain)

      // после 10 — спросить про +5
      if (!s.extraUnlocked && s.asked >= s.limitBase) {
        s.stage = 'CONFIRM_EXTRA'
        await ctx.reply(moreQuestionsAskText(), kbMore)
        return
      }

      return
    }

    // ---- FINISHED / fallback
    if (s.stage === 'FINISHED') {
      await ctx.reply('Игра завершена. Начать заново: /start', kbMain)
      return
    }

    await ctx.reply('Не понял. Начни игру: /start', kbMain)
  } catch (e) {
    console.error('❌ handler error:', e?.message || e)
    await ctx.reply('⚠️ Внутренняя ошибка. Нажми 🔄 Перезапустить или отправь /start.', kbMain)
  }
}
