import { google } from 'googleapis'
import {
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY,
    GOOGLE_SHEET_ID
} from '../config.js'

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
        if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
            console.warn('⚠️ Google Sheets credentials missing. Service disabled.')
            return
        }

        try {
            const auth = new google.auth.JWT(
                GOOGLE_SERVICE_ACCOUNT_EMAIL,
                null,
                // Replace literal \n with actual newlines if they are escaped in env
                GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                ['https://www.googleapis.com/auth/spreadsheets']
            )

            await auth.authorize()
            this.client = auth
            this.sheets = google.sheets({ version: 'v4', auth })
            console.log('✅ Google Sheets connected')
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
            console.error(`❌ Failed to append row to ${range}:`, error)
        }
    }
}

export const googleSheetsService = new GoogleSheetsService()
