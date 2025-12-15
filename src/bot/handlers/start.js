import { TelegramContext } from '../../game/platform/telegram.js'

export function registerStart(bot, { startGame }) {
  bot.start(async (ctx) => {
    const gameCtx = new TelegramContext(ctx)
    await startGame(gameCtx)
  })
}
