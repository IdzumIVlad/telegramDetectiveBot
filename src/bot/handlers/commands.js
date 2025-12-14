import { kbMain, kbYesNo } from '../ui/keyboards.js'
import { helpText, restartConfirmText } from '../ui/texts.js'
import { safeReply } from '../safe.js'
import { ADMIN_ID } from '../../config.js'
import { caseManager } from '../../game/caseManager.js'

export function registerCommands(bot, deps) {
  const { sessionStore, startGame } = deps

  bot.command('help', async (ctx) => {
    await safeReply(ctx, helpText(), kbMain())
  })

  bot.command('restart', async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId) return
    const s = sessionStore.getSession(chatId)

    // If selecting case, just restart (re-list cases)
    if (s.stage === 'CASE_SELECTION') {
      await startGame(ctx, deps)
      return
    }

    s.prevStage = s.stage
    s.stage = 'CONFIRM_RESTART'
    await safeReply(ctx, restartConfirmText(), kbYesNo())
  })

  bot.command('reload_cases', async (ctx) => {
    const userId = ctx.from?.id
    if (userId !== ADMIN_ID) {
      return // Ignore or reply access denied
    }

    await safeReply(ctx, '⏳ Обновляю кейсы из облака...')
    const success = await caseManager.loadFromCloud()
    if (success) {
      const count = caseManager.getAllActive().length
      await safeReply(ctx, `✅ Кейсы обновлены! Активных: ${count}`)
    } else {
      await safeReply(ctx, '❌ Ошибка обновления. См. логи.')
    }
  })
}
