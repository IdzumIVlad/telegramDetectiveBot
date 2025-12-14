import { google } from 'googleapis'
import {
    GOOGLE_SHEET_ID,
    GOOGLE_CREDENTIALS_PATH
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
    async connect() {
        if (!GOOGLE_SHEET_ID) {
            console.warn('⚠️ Google Sheets ID missing. Service disabled.')
            return
        }

        // Resolve path relative to project root (where package.json is)
        const keyFilePath = path.resolve(process.cwd(), GOOGLE_CREDENTIALS_PATH)

        if (!fs.existsSync(keyFilePath)) {
            console.warn(`⚠️ Credentials file not found at ${keyFilePath}. Service disabled.`)
            return
        }

        try {
            const auth = new google.auth.GoogleAuth({
                keyFile: keyFilePath,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            })

            this.client = await auth.getClient()
            this.sheets = google.sheets({ version: 'v4', auth: this.client })
            console.log('✅ Google Sheets connected (via credentials.json)')
        } catch (error) {
            console.error('❌ Google Sheets connection error:', error)
            throw error
        }
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
            throw error // Propagate error so caller handles it
        }
    }
}

export const googleSheetsService = new GoogleSheetsService()
