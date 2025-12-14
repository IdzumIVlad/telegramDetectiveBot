import 'dotenv/config'

// =====================
// Config / env
// =====================
export const BOT_TOKEN = process.env.BOT_TOKEN
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const MODEL = process.env.MODEL || 'gpt-4o-mini'

export function assertEnv() {
  if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is missing in .env')
    process.exit(1)
  }
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is missing in .env')
    process.exit(1)
  }
  // Optional: check for google sheets credentials if you want to enforce them on startup
  // For now, we'll just log a warning if they are missing, or you can enforce them.
  if (!process.env.GOOGLE_SHEET_ID) {
    console.warn('⚠️ GOOGLE_SHEET_ID is missing in .env (Google Sheets integration disabled)')
  }
}

export const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
export const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
export const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID
