import { BTN, kbMain, kbMore, kbYesNo, kbCaseSelection } from '../bot/ui/keyboards.js'
import { helpText, solveHowToText, restartConfirmText, moreQuestionsAskText, solveConfirmText } from '../bot/ui/texts.js'
import { safeReply, safeTyping } from '../bot/safe.js'
import { getCaseById, pickActiveCaseRandom, CASES } from './cases/index.js'
import { looksLikeMultiQuestion } from './multiQuestion.js'
import { newSuspectProfile } from './temperament.js'
import { computeScore10 } from './scoring.js'
import { askSuspectLLM } from '../llm/suspect.js'
import { checkGuessLLM } from '../llm/judge.js'

function maxQuestions(s) {
  return s.limitBase + (s.extraUnlocked ? s.extraLimit : 0)
}
function questionsLeft(s) {
  return Math.max(0, maxQuestions(s) - s.asked)
}

export async function startGame(ctx, { sessionStore }) {
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

  await safeReply(ctx, 'Какой кейс будем расследовать?', kbCaseSelection())
}

export async function handleText(ctx, { sessionStore, openai, model }) {
  const chatId = ctx.chat?.id
  if (!chatId) return

  const s = sessionStore.getSession(chatId)
  const text = (ctx.message?.text || '').trim()

  try {
    // ---- Auto recover (restart node) or freshly initialized
    if (s.stage === 'IDLE') {
      await startGame(ctx, { sessionStore })
      return
    }

    // =====================
    // GLOBAL COMMANDS (Restart, Help) - handled FIRST
    // =====================

    // 1. RESTART button
    if (text === BTN.RESTART) {
      if (s.stage === 'CASE_SELECTION') {
        // No need to confirm if we haven't started
        await startGame(ctx, { sessionStore })
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
      let selectedCase = null
      if (text === BTN.CASE_1) selectedCase = CASES[0]
      if (text === BTN.CASE_2) selectedCase = CASES[1]

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

    const c = getCaseById(s.caseId) || CASES[0]

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
        return
      }

      s.stage = 'FINISHED'
      await safeReply(
        ctx,
        `❌ Не сошлось.\nТочность: ${verdict.closeness}%\nВопросов: ${s.asked}\nБаллы: ${score}/10\n\n${verdict.feedback}\n\n${c.solution}\n\nХочешь сыграть снова? /start`,
        kbMain()
      )
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
