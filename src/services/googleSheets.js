import { google } from 'googleapis'
import {
    GOOGLE_SHEET_ID,
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY
} from '../config.js'
import fs from 'fs'
import path from 'path'

export class GoogleSheetsService {
    constructor() {
        this.sheetId = GOOGLE_SHEET_ID
        this.client = null
        this.sheets = null
    }

    /**
     * Initialize connection to Google Sheets
     */
    /**
     * Initialize connection to Google Sheets
     */
    async connect() {
        if (!GOOGLE_SHEET_ID) {
            console.warn('⚠️ Google Sheets ID missing. Service disabled.')
            return
        }

        if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
            console.warn('⚠️ Google Credentials missing (EMAIL/KEY). Service disabled.')
            return
        }

        try {
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    private_key: GOOGLE_PRIVATE_KEY,
                },
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            })

            this.client = await auth.getClient()
            this.sheets = google.sheets({ version: 'v4', auth: this.client })
            console.log('✅ Google Sheets connected (via Env Vars)')
        } catch (error) {
            console.error('❌ Google Sheets connection error:', error)
            // don't throw, just log
        }
    }

    /**
   * Ensure a sheet exists with specific headers
   * @param {string} title - Sheet title (e.g. "GameLogs")
   * @param {string[]} headers - Array of header strings
   */
    async ensureSheet(title, headers) {
        if (!this.sheets) return

        try {
            const meta = await this.sheets.spreadsheets.get({
                spreadsheetId: this.sheetId
            })

            const sheetExists = meta.data.sheets.some(s => s.properties.title === title)

            if (!sheetExists) {
                // Create sheet
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.sheetId,
                    requestBody: {
                        requests: [{
                            addSheet: {
                                properties: { title }
                            }
                        }]
                    }
                })

                // Add headers
                await this.appendRow(title, headers)
                console.log(`✅ Sheet "${title}" created with headers.`)
            }
        } catch (error) {
            console.error(`❌ Failed to ensure sheet "${title}":`, error.message)
            // Don't throw here to avoid breaking the flow if we just failed to check/create
        }
    }

    /**
   * Log game event (START, WIN, LOSS, etc)
   * @param {Object} params
   * @param {string} params.eventName - "START", "WIN", "LOSS"
   * @param {string} params.userString - User formatted name/link
   * @param {number|string} params.userId - Telegram ID
   * @param {string} params.caseId - Case ID
   * @param {number} [params.score] - Score 0-10 (optional for START)
   * @param {number} [params.questionsAsked] - Number of questions (optional for START)
   */
    async logGameEvent({ eventName, userString, userId, caseId, score = '', questionsAsked = '' }) {
        const SHEET_NAME = 'GameLogs'
        const HEADERS = ['Time', 'User', 'ID', 'Case', 'Event', 'Score', 'Questions']

        await this.ensureSheet(SHEET_NAME, HEADERS)

        const now = new Date().toISOString()
        const row = [
            now,
            userString,
            userId.toString(),
            caseId,
            eventName,
            score,
            questionsAsked
        ]

        await this.appendRow(SHEET_NAME, row)
    }

    /**
     * Log a specific Q&A interaction
     */
    async logQuestion({ userString, userId, caseId, question, answer }) {
        const SHEET_NAME = 'Questions_Log'
        const HEADERS = ['Time', 'User', 'ID', 'Case', 'Question', 'Answer']

        await this.ensureSheet(SHEET_NAME, HEADERS)

        const now = new Date().toISOString()
        const row = [
            now,
            userString,
            userId.toString(),
            caseId,
            question,
            answer
        ]

        await this.appendRow(SHEET_NAME, row)
    }

    /**
     * Append a row to the sheet
     * @param {string} range - e.g. "Sheet1!A:A" or just "Sheet1"
     * @param {Array<string|number>} values - Array of values for the row
     */
    async appendRow(range, values) {
        if (!this.sheets) {
            // If not connected, just ignore or log (depending on desired strictness)
            return
        }

        try {
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.sheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [values],
                },
            })
        } catch (error) {
            console.error(`❌ Failed to append row to ${range}:`, error.message)
            // throw error // Propagate error so caller handles it (commented out for production safety)
        }
    }
    /**
   * Read all data from a sheet
   * @param {string} title
   * @returns {Promise<Array<Array<string>>>} Rows
   */
    async readSheet(title) {
        if (!this.sheets) return []
        try {
            const res = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.sheetId,
                range: title
            })
            return res.data.values || []
        } catch (e) {
            console.error(`Error reading sheet ${title}:`, e.message)
            return []
        }
    }

    /**
     * Write data to a specific sheet (overwriting specific range or whole sheet logic if extended)
     * For migration, we usually clear and write.
     */
    async writeSheet(title, values) {
        if (!this.sheets) return

        // Clear sheet content first (except maybe headers if we want to be safe, but for migration we overwrite)
        // For simplicity, we just overwrite from A1. If sheet doesn't exist, ensureSheet should be called first.

        try {
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.sheetId,
                range: `${title}!A1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values }
            })
        } catch (e) {
            console.error(`Error writing sheet ${title}:`, e)
            throw e
        }
    }

    async createSheetIfNotExists(title) {
        if (!this.sheets) return
        try {
            const meta = await this.sheets.spreadsheets.get({ spreadsheetId: this.sheetId })
            const sheetExists = meta.data.sheets.some(s => s.properties.title === title)
            if (!sheetExists) {
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.sheetId,
                    requestBody: {
                        requests: [{ addSheet: { properties: { title } } }]
                    }
                })
                console.log(`Created sheet: ${title}`)
            }
        } catch (e) {
            console.error(`Error creating sheet ${title}:`, e)
        }
    }

    async clearSheet(title) {
        if (!this.sheets) return
        try {
            await this.sheets.spreadsheets.values.clear({
                spreadsheetId: this.sheetId,
                range: title
            })
        } catch (e) {
            // ignore if sheet didn't exist
        }
    }
}

export const googleSheetsService = new GoogleSheetsService()
