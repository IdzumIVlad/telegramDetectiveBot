import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'

export class StatsService {
    constructor(config) {
        this.sheetId = config.sheetId
        this.email = config.email
        this.privateKey = config.privateKey
        this.doc = null
        this.enabled = Boolean(this.sheetId && this.email && this.privateKey)
    }

    async init() {
        if (!this.enabled) {
            console.warn('⚠️ Google Sheets stats disabled (missing credentials)')
            return
        }

        try {
            const jwt = new JWT({
                email: this.email,
                key: this.privateKey,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            })

            this.doc = new GoogleSpreadsheet(this.sheetId, jwt)
            await this.doc.loadInfo()
            console.log(`✅ Stats connected: "${this.doc.title}"`)
        } catch (e) {
            console.error('❌ Failed to connect Google Sheets:', e.message)
            this.enabled = false
        }
    }

    /**
     * Logs an event to the "GameLogs" sheet.
     * Maps data to columns A-I.
     * F = Score, G = Questions.
     */
    async logEvent({ userId, username, caseTitle, event, score, questions, result, accuracy }) {
        if (!this.enabled || !this.doc) return

        try {
            // Try to find sheet by title or index 0
            let sheet = this.doc.sheetsByTitle['GameLogs']
            if (!sheet) {
                // Fallback: use the first sheet if GameLogs doesn't exist
                // or create it? User said "sheet already exists", so better just warn if missing
                console.warn('⚠️ Sheet "GameLogs" not found, using first sheet.')
                sheet = this.doc.sheetsByIndex[0]
            }

            // Prepare row data as array to map strictly to columns A, B, C...
            const date = new Date().toISOString()
            const rowData = [
                date,                   // A: Date
                String(userId),         // B: UserId
                username || '',         // C: Username
                caseTitle || 'Unknown', // D: Case
                event,                  // E: Event
                score ?? '',            // F: Score
                questions ?? '',        // G: Questions
                result || '',           // H: Result
                accuracy ? (accuracy + '%') : '' // I: Accuracy
            ]

            await sheet.addRow(rowData)
        } catch (e) {
            console.error('❌ Failed to log event:', e.message)
        }
    }
}
