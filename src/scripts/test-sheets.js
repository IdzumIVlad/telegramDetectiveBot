import 'dotenv/config'
import { google } from 'googleapis'

const EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const KEY = process.env.GOOGLE_PRIVATE_KEY
const SHEET_ID = process.env.GOOGLE_SHEET_ID

async function run() {
    console.log('🔍 Diagnostic Run')
    console.log('------------------')

    // 1. Check Raw Values
    console.log('EMAIL loaded:', EMAIL ? 'YES' : 'NO')
    if (EMAIL) console.log('EMAIL value:', EMAIL)

    console.log('KEY loaded:', KEY ? 'YES' : 'NO')
    if (KEY) {
        console.log('KEY length:', KEY.length)
        console.log('KEY starts with quote:', KEY.startsWith('"'))
        console.log('KEY starts with -----BEGIN:', KEY.startsWith('-----BEGIN'))
        console.log('KEY contains literal \\n:', KEY.includes('\\n'))
        console.log('KEY contains actual newline:', KEY.includes('\n'))
    }

    console.log('SHEET_ID loaded:', SHEET_ID ? 'YES' : 'NO')
    if (SHEET_ID) console.log('SHEET_ID:', SHEET_ID)

    // 2. Test Key Processing
    let processedKey = KEY
    if (KEY) {
        // Attempt standard fix
        processedKey = KEY.replace(/\\n/g, '\n')
        console.log('Processed KEY length:', processedKey.length)
        console.log('Processed KEY lines:', processedKey.split('\n').length)
    }

    // 3. Attempt Connection
    if (!EMAIL || !processedKey || !SHEET_ID) {
        console.error('❌ Missing credentials, aborting connection test.')
        return
    }

    console.log('------------------')
    console.log('🚀 Attempting Google Auth...')

    try {
        const auth = new google.auth.JWT(
            EMAIL,
            null,
            processedKey,
            ['https://www.googleapis.com/auth/spreadsheets']
        )

        await auth.authorize()
        console.log('✅ Auth successful!')

        const sheets = google.sheets({ version: 'v4', auth })
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[new Date().toISOString(), 'Diagnostic Test']] }
        })
        console.log('✅ Write successful!')

    } catch (error) {
        console.error('❌ Error:', error.message)
        if (error.response) {
            console.error('Response data:', error.response.data)
        }
    }
}

run()
