import 'dotenv/config'
import { googleSheetsService } from '../services/googleSheets.js'

async function run() {
    console.log('🚀 Starting Google Sheets Test (Credentials File Mode)...')

    try {
        await googleSheetsService.connect()

        // Attempt to write to "Sheet1" or "Лист1"
        const now = new Date().toISOString()
        const values = [now, 'File Auth Test', 'Success!']

        try {
            await googleSheetsService.appendRow('Sheet1', values)
            console.log('✅ Test row appended to "Sheet1". result: Success')
        } catch (e) {
            console.warn('⚠️ writing to "Sheet1" failed, trying "Лист1"...')
            try {
                await googleSheetsService.appendRow('Лист1', values)
                console.log('✅ Test row appended to "Лист1". result: Success')
            } catch (e2) {
                throw new Error('Could not write to "Sheet1" or "Лист1". Check your sheet name.')
            }
        }
    } catch (error) {
        console.error('❌ Test failed:', error)
    }
}

run()
