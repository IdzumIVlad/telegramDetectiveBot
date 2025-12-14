export function registerTextHandler(bot, { handleText }) {
  bot.on('text', async (ctx) => {
    await handleText(ctx)
  })
}
