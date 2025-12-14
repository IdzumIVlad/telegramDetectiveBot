import { Telegraf } from 'telegraf'
import { assertEnv, BOT_TOKEN, MODEL, ADMIN_ID } from './config.js'
import { createOpenAIClient } from './llm/openaiClient.js'
import * as sessionStore from './game/sessionStore.memory.js'
import { startGame, handleText } from './game/engine.js'
import { googleSheetsService } from './services/googleSheets.js'
import { caseManager } from './game/caseManager.js'
import { registerCommands } from './bot/handlers/commands.js'
import { registerStart } from './bot/handlers/start.js'
import { registerTextHandler } from './bot/handlers/text.js'

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

const bot = new Telegraf(BOT_TOKEN)
const openai = createOpenAIClient()

// deps wrappers (чтобы engine не тащил глобалы)
const deps = {
  sessionStore,
  openai,
  model: MODEL,
  caseManager // Dependency injection
}

// =====================
// Handlers
// =====================
registerStart(bot, {
  startGame: (ctx) => startGame(ctx, { sessionStore }),
})

registerCommands(bot, {
  sessionStore,
  startGame: (ctx) => startGame(ctx, { sessionStore }),
})

registerTextHandler(bot, {
  handleText: (ctx) => handleText(ctx, deps),
})

// =====================
// Launch
// =====================
console.log('✅ src/index.js loaded')
console.log('Node:', process.version)
console.log('BOT_TOKEN exists:', Boolean(process.env.BOT_TOKEN))
console.log('MODEL:', MODEL)

bot.launch({ dropPendingUpdates: true })
  .then(() => console.log('✅ polling started'))
  .catch((e) => console.error('❌ launch error:', e))

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
