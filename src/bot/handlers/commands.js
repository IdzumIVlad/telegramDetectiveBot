import { kbMain, kbYesNo } from '../ui/keyboards.js'
import { helpText, restartConfirmText } from '../ui/texts.js'
import { safeReply } from '../safe.js'

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
}
