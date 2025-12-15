import { Telegraf } from 'telegraf'
import { assertEnv, BOT_TOKEN, DISCORD_TOKEN, MODEL } from './config.js'
import { createOpenAIClient } from './llm/openaiClient.js'
import * as sessionStore from './game/sessionStore.memory.js'
import { startGame, handleText } from './game/engine.js'
import { googleSheetsService } from './services/googleSheets.js'
import { caseManager } from './game/caseManager.js'
import { registerCommands } from './bot/handlers/commands.js'
import { registerStart } from './bot/handlers/start.js'
import { registerTextHandler } from './bot/handlers/text.js'
import { initDiscord } from './discord/bot.js'

// =====================
// Bootstrap / logs
// =====================
process.on('unhandledRejection', (e) => console.error('UNHANDLED:', e))
process.on('uncaughtException', (e) => console.error('UNCAUGHT:', e))

assertEnv()

// Initialize services
googleSheetsService.connect()
  .then(() => caseManager.loadFromCloud())
  .catch(e => console.error('Services init error:', e))

const openai = createOpenAIClient()

// Common Dependencies
const engineDeps = {
  sessionStore,
  openai,
  model: MODEL,
  caseManager
}

// Bound functions (Engine expects (ctx, deps) but handlers expect (ctx))
const boundStartGame = (ctx) => startGame(ctx, engineDeps)
const boundHandleText = (ctx) => handleText(ctx, engineDeps)

// =====================
// Telegram Bot
// =====================
let telegramBot = null
if (BOT_TOKEN) {
  telegramBot = new Telegraf(BOT_TOKEN)

  registerStart(telegramBot, {
    startGame: boundStartGame,
  })

  registerCommands(telegramBot, { ...engineDeps, startGame: boundStartGame })

  registerTextHandler(telegramBot, {
    handleText: boundHandleText,
  })

  telegramBot.launch({ dropPendingUpdates: true })
    .then(() => console.log('✅ Telegram polling started'))
    .catch((e) => console.error('❌ Telegram launch error:', e))
}

// =====================
// Discord Bot
// =====================
let discordClient = null
if (DISCORD_TOKEN) {
  initDiscord(DISCORD_TOKEN, {
    startGame: boundStartGame,
    handleText: boundHandleText
  }).then(client => {
    if (client) {
      discordClient = client
      console.log('✅ Discord bot initialized')
    }
  }).catch(e => console.error('❌ Discord launch error:', e))
}

// =====================
// Launch
// =====================
console.log('✅ src/index.js loaded')
console.log('Node:', process.version)
console.log('MODEL:', MODEL)

const stopAll = () => {
  if (telegramBot) telegramBot.stop('SIGTERM')
  if (discordClient) discordClient.destroy()
  process.exit(0)
}

process.once('SIGINT', stopAll)
process.once('SIGTERM', stopAll)
