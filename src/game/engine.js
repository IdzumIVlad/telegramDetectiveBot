import { BTN, kbMain, kbMore, kbYesNo, kbCaseSelection } from '../bot/ui/keyboards.js'
import { helpText, solveHowToText, restartConfirmText, moreQuestionsAskText, solveConfirmText } from '../bot/ui/texts.js'
// Removed static CASES import
import { looksLikeMultiQuestion } from './multiQuestion.js'
import { safeReply, safeTyping } from '../bot/safe.js'
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

export async function startGame(ctx, { sessionStore, caseManager }) {
  const chatId = ctx.chat?.id
  if (!chatId) return
  const s = sessionStore.getSession(chatId)

  // Warn if game is active, but allow forcing via buttons usually handled in handleText
  if (['INTERROGATION', 'SOLVING', 'CONFIRM_EXTRA', 'CONFIRM_SOLVE'].includes(s.stage)) {
    await safeReply(ctx, `🔎 Игра уже идёт.\nОсталось вопросов: ${questionsLeft(s)}\nРежим: ${s.stage}`, kbMain())
    return
  }

  // Reset state to selection
  s.stage = 'CASE_SELECTION'
  s.asked = 0
  s.extraUnlocked = false
  s.history = []

  // Dynamic Case Selection: We can list titles or use buttons.
  // Assuming kbCaseSelection now needs to be dynamic or we just list them if kb is static.
  // For now, let's just list available cases.
  const activeCases = caseManager.getAllActive()
  if (activeCases.length === 0) {
    await safeReply(ctx, '⚠️ Нет активных дел. Обратитесь к администратору.')
    return
  }

  // Create dynamic keyboard if possible, or just text list if we stick to static buttons (CASE_1, CASE_2)
  // Our static buttons are "Дело №1" and "Дело №2". We map them to the first 2 active cases.

  let msg = 'Какой кейс будем расследовать?\n\n'
  activeCases.forEach((c, i) => {
    // Assuming BTN.CASE_1 maps to index 0, CASE_2 to index 1
    const btnLabel = i === 0 ? BTN.CASE_1 : (i === 1 ? BTN.CASE_2 : `Дело #${i + 1}`)
    msg += `${btnLabel}: ${c.title}\n`
  })

  await safeReply(ctx, msg, kbCaseSelection())
}

export async function handleText(ctx, deps) {
  const { sessionStore, openai, model, caseManager } = deps
  const chatId = ctx.chat?.id
  if (!chatId) return

  const s = sessionStore.getSession(chatId)
  const text = (ctx.message?.text || '').trim()

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
    if (text === BTN.RESTART) {
      if (s.stage === 'CASE_SELECTION') {
        // No need to confirm if we haven't started
        await startGame(ctx, deps)
        return
      }
      s.prevStage = s.stage // save to restore if NO
      s.stage = 'CONFIRM_RESTART'
      await safeReply(ctx, restartConfirmText(), kbYesNo())
      return
    }

    // 2. HELP button
    if (text === BTN.HELP) {
      await safeReply(ctx, helpText(), kbMain())
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
      if (text === BTN.CASE_1 && activeCases[0]) selectedCase = activeCases[0]
      if (text === BTN.CASE_2 && activeCases[1]) selectedCase = activeCases[1]

      if (!selectedCase) {
        await safeReply(ctx, 'Пожалуйста, выбери дело кнопкой снизу.', kbCaseSelection())
        return
      }

      s.caseId = selectedCase.id
      s.stage = 'INTERROGATION'
      s.asked = 0
      s.extraUnlocked = false
      s.suspectProfile = newSuspectProfile()
      s.history = []

      await safeReply(ctx, selectedCase.rulesShort, kbMain())
      await safeReply(ctx, selectedCase.scenario, kbMain())

      // Log Start
      console.log('📝 Logging START to sheets...')
      googleSheetsService.logGameEvent({
        eventName: 'START',
        userString: `@${ctx.from.username || 'anon'} (${ctx.from.first_name || ''})`,
        userId: ctx.from.id,
        caseId: s.caseId,
      })
      return
    }

    // ---- CONFIRM RESTART
    if (s.stage === 'CONFIRM_RESTART') {
      if (text === BTN.YES) {
        sessionStore.resetSession(chatId)
        await safeReply(ctx, '✅ Прогресс сброшен.', kbMain())
        // Immediately explicitly call start to show selection
        await startGame(ctx, { sessionStore })
        return
      }
      if (text === BTN.NO) {
        s.stage = s.prevStage || 'INTERROGATION' // restore
        await safeReply(ctx, '👌 Ок, продолжаем.', kbMain())
        return
      }
      await safeReply(ctx, 'Нажми ✅ Да или ❌ Нет.', kbYesNo())
      return
    }

    // 3. SOLVE button (Global trigger for INTERROGATION)
    if (text === BTN.SOLVE) {
      if (['INTERROGATION', 'OFFER_EXTRA'].includes(s.stage) || s.stage === 'CONFIRM_EXTRA') {
        s.prevStage = s.stage
        s.stage = 'CONFIRM_SOLVE'
        await safeReply(ctx, solveConfirmText(), kbYesNo())
        return
      }
      // If already solving or finished, ignore or explain
    }

    // ---- CONFIRM SOLVE
    if (s.stage === 'CONFIRM_SOLVE') {
      if (text === BTN.YES) {
        s.stage = 'SOLVING'
        await safeReply(ctx, solveHowToText(), kbMain())
        return
      }
      if (text === BTN.NO) {
        s.stage = s.prevStage || 'INTERROGATION'
        await safeReply(ctx, '👌 Возвращаемся к вопросам.', kbMain())
        return
      }
      await safeReply(ctx, 'Нажми ✅ Да или ❌ Нет.', kbYesNo())
      return
    }

    // ---- CONFIRM EXTRA QUESTIONS
    if (s.stage === 'CONFIRM_EXTRA') {
      if (text === BTN.MORE_YES) {
        s.extraUnlocked = true
        s.stage = 'INTERROGATION'
        await safeReply(ctx, '✅ Отлично. У тебя есть ещё 5 вопросов. Продолжай допрос.', kbMain())
        return
      }

      if (text === BTN.MORE_NO) {
        s.stage = 'SOLVING'
        await safeReply(ctx, solveHowToText(), kbMain())
        return
      }

      await safeReply(ctx, moreQuestionsAskText(), kbMore())
      return
    }

    // Get case from manager
    const c = caseManager.getCaseById(s.caseId)
    if (!c) {
      await safeReply(ctx, '⚠️ Ошибка: Данные дела не найдены (возможно, оно было удалено). Начните заново: /start')
      s.stage = 'IDLE'
      return
    }

    // ---- SOLVING
    if (s.stage === 'SOLVING') {
      await safeReply(ctx, '…думает')

      let verdict
      try {
        verdict = await checkGuessLLM({ openai, model, caseData: c, guess: text })
      } catch (e) {
        console.error('❌ checkGuessLLM error:', e?.message || e)
        await safeReply(ctx, '⚠️ Ошибка проверки версии. Попробуй ещё раз чуть короче и конкретнее.', kbMain())
        return
      }

      const score = computeScore10(verdict.closeness, s.asked)

      if (verdict.is_correct) {
        const within10 = s.asked <= 10
        const winLabel = within10 ? '🏆 Победа!' : '🥈 Условная победа!'
        const meta = `Точность: ${verdict.closeness}%\nВопросов: ${s.asked}\nБаллы: ${score}/10`

        s.stage = 'FINISHED'
        await safeReply(ctx, `${winLabel}\n${meta}\n\n${verdict.feedback}\n\n${c.solution}`, kbMain())

        // Log Win
        console.log('📝 Logging WIN to sheets...')
        googleSheetsService.logGameEvent({ ...logData, eventName: 'WIN' })
        return
      }

      s.stage = 'FINISHED'
      await safeReply(
        ctx,
        `❌ Не сошлось.\nТочность: ${verdict.closeness}%\nВопросов: ${s.asked}\nБаллы: ${score}/10\n\n${verdict.feedback}\n\n${c.solution}\n\nХочешь сыграть снова? /start`,
        kbMain()
      )

      // Log Loss
      console.log('📝 Logging LOSS to sheets...')
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
          await safeReply(ctx, moreQuestionsAskText(), kbMore())
          return
        }
        // If extra used up, force solve
        s.stage = 'SOLVING'
        await safeReply(ctx, solveHowToText(), kbMain())
        return
      }

      // предупреждение о мультивопросе
      if (looksLikeMultiQuestion(text)) {
        await safeReply(ctx, 'ℹ️ Я отвечу только на первый вопрос. Остальное — отдельными сообщениями.', kbMain())
      }

      // считаем вопрос
      s.asked += 1

      await safeTyping(ctx)

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
        await safeReply(ctx, '⚠️ Ошибка ответа свидетеля. Попробуй переформулировать вопрос и отправь ещё раз.', kbMain())
        // откатываем потраченный вопрос, чтобы не было обидно
        s.asked = Math.max(0, s.asked - 1)
        return
      }

      // ВАЖНО: LLM-ответ отправляем БЕЗ parse_mode, чтобы Telegram не ломался на спецсимволах
      await safeReply(ctx, answer, kbMain())

      // после 10 — спросить про +5
      if (!s.extraUnlocked && s.asked >= s.limitBase) {
        s.stage = 'CONFIRM_EXTRA'
        await safeReply(ctx, moreQuestionsAskText(), kbMore())
        return
      }

      return
    }

    // ---- FINISHED / fallback
    if (s.stage === 'FINISHED') {
      await safeReply(ctx, 'Игра завершена. Начать заново: /start', kbMain())
      return
    }

    await safeReply(ctx, 'Не понял. Начни игру: /start', kbMain())
  } catch (e) {
    console.error('❌ handler error:', e?.message || e)
    await safeReply(ctx, '⚠️ Внутренняя ошибка. Нажми 🔄 Перезапустить или отправь /start.', kbMain())
  }
}
