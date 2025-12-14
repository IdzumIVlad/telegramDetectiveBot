import { kbMain, kbYesNo } from '../ui/keyboards.js'
import { helpText, restartConfirmText } from '../ui/texts.js'
import { safeReply } from '../safe.js'
import { ADMIN_ID } from '../../config.js'
import { caseManager } from '../../game/caseManager.js'

export function registerCommands(bot, { sessionStore, startGame }) {
  bot.command('help', async (ctx) => {
    await safeReply(ctx, helpText(), kbMain())
  })

  bot.command('restart', async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId) return
    const s = sessionStore.getSession(chatId)
    s.awaitingRestartConfirm = true
    s.awaitingExtraConfirm = false
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
