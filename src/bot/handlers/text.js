import { TelegramContext } from '../../game/platform/telegram.js'

export function registerTextHandler(bot, { handleText }) {
  bot.on('text', async (ctx) => {
    const gameCtx = new TelegramContext(ctx)
    await handleText(gameCtx)
  })
}
