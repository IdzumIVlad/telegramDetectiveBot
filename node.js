import 'dotenv/config'
import { Telegraf } from 'telegraf'

process.on('unhandledRejection', (e) => console.error('UNHANDLED:', e))
process.on('uncaughtException', (e) => console.error('UNCAUGHT:', e))

if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing in .env')
  process.exit(1)
}

const bot = new Telegraf(process.env.BOT_TOKEN)

// Проверка связи с Telegram
bot.telegram.getMe()
  .then(me => console.log('✅ BOT OK:', me.username, 'id:', me.id))
  .catch(e => console.error('❌ getMe failed:', e))

bot.use((ctx, next) => {
  console.log('UPDATE:', ctx.updateType)
  return next()
})

bot.on('message', async (ctx) => {
  console.log('MESSAGE TEXT:', ctx.message?.text)
  await ctx.reply('✅ Я получил сообщение')
})

bot.launch({ dropPendingUpdates: true })
  .then(() => console.log('✅ Launched (polling)'))
  .catch(e => console.error('❌ launch failed:', e))

console.log('Bot running…')
