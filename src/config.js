import dotenv from 'dotenv'
dotenv.config()

// =====================
// Config / env
// =====================
export const BOT_TOKEN = process.env.BOT_TOKEN
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const MODEL = process.env.MODEL || 'gpt-4o'

export const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID
export const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
// Fix multiline key issue often found in env vars
export const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
export const GOOGLE_CREDENTIALS_PATH = 'credentials.json'

export const ADMIN_ID = 234840579

export function assertEnv() {
  if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is missing in .env')
    process.exit(1)
  }
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is missing in .env')
    process.exit(1)
  }
  // Optional: check for google sheets credentials
  if (!process.env.GOOGLE_SHEET_ID) {
    console.warn('⚠️ GOOGLE_SHEET_ID is missing. Google Sheets integration will not work.')
  }
}

