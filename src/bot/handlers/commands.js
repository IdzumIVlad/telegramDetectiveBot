import { TelegramContext } from '../../game/platform/telegram.js'
import { UI_KEYS } from '../../game/platform/ui.js'
import { helpText, restartConfirmText } from '../ui/texts.js'
import { ADMIN_ID } from '../../config.js'
import { caseManager } from '../../game/caseManager.js'

export function registerCommands(bot, deps) {
  const { sessionStore, startGame } = deps

  bot.command('help', async (ctx) => {
    const gameCtx = new TelegramContext(ctx)
    // Reconstruct main keyboard keys
    const kbMain = [[UI_KEYS.SOLVE, UI_KEYS.RESTART], [UI_KEYS.HELP]]
    await gameCtx.reply(helpText(), kbMain)
  })

  bot.command('restart', async (ctx) => {
    const gameCtx = new TelegramContext(ctx)
    const chatId = ctx.chat?.id
    if (!chatId) return

    // Check if we are in specific stage? 
    // The previous logic checked stage to decide whether to just start or confirm.
    // Let's replicate basic safety:

    const s = sessionStore.getSession(chatId)

    // If selecting case, just restart
    if (s.stage === 'CASE_SELECTION') {
      await startGame(gameCtx, deps)
      return
    }

    s.prevStage = s.stage
    s.stage = 'CONFIRM_RESTART'

    const kbYesNo = [[UI_KEYS.YES, UI_KEYS.NO]]
    await gameCtx.reply(restartConfirmText(), kbYesNo)
  })

  bot.command('reload_cases', async (ctx) => {
    // Admin command can stay raw Telegraf or use GameContext
    // Using GameContext is cleaner for consistency
    const gameCtx = new TelegramContext(ctx)

    const userId = ctx.from?.id
    if (userId !== ADMIN_ID) {
      return
    }

    await gameCtx.reply('⏳ Обновляю кейсы из облака...')
    const success = await caseManager.loadFromCloud()
    if (success) {
      const count = caseManager.getAllActive().length
      await gameCtx.reply(`✅ Кейсы обновлены! Активных: ${count}`)
    } else {
      await gameCtx.reply('❌ Ошибка обновления. См. логи.')
    }
  })

  bot.command('init_prompts', async (ctx) => {
    const gameCtx = new TelegramContext(ctx)
    if (ctx.from?.id !== ADMIN_ID) return

    await gameCtx.reply('⏳ Создаю лист Config_Prompts...')
    // Use raw service access or add method to manager?
    // Let's use service directly for init
    const headers = ['case_id', 'template']
    await import('../../services/googleSheets.js').then(m => m.googleSheetsService.ensureSheet('Config_Prompts', headers))

    // Check if we should seed default
    // We can just append a row for case 'default' or '1'

    // We need the default prompt text.
    const { DEFAULT_SUSPECT_PROMPT } = await import('../../llm/promptTemplates.js')

    await import('../../services/googleSheets.js').then(m => m.googleSheetsService.appendRow('Config_Prompts', ['default', DEFAULT_SUSPECT_PROMPT]))
    await gameCtx.reply('✅ Лист создан и добавлен дефолтный шаблон (id=default). Можно менять.')
  })
}
