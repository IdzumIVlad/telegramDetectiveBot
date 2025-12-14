export function registerStart(bot, { startGame }) {
  bot.start(async (ctx) => {
    await startGame(ctx)
  })
}
