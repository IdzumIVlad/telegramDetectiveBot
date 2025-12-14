import { googleSheetsService } from '../services/googleSheets.js'
import { CASES } from '../game/cases/index.js'

// --- CONFIG ---
const SHEET_CASES = 'Config_Cases'
const SHEET_SUSPECTS = 'Config_Suspects'
const SHEET_TRIGGERS = 'Config_Triggers'

const HEADERS_CASES = ['id', 'active', 'title', 'rules_short', 'scenario', 'solution', 'intro_image']
const HEADERS_SUSPECTS = ['case_id', 'name', 'facts', 'lies', 'voice', 'baseline'] // baseline/voice from temperament
const HEADERS_TRIGGERS = ['case_id', 'keywords', 'reveal']

async function runMigration() {
    console.log('🚀 Starting Case Migration...')

    try {
        // 1. Connect
        await googleSheetsService.connect()

        // 2. Prepare Data
        const rowsCases = [HEADERS_CASES]
        const rowsSuspects = [HEADERS_SUSPECTS]
        const rowsTriggers = [HEADERS_TRIGGERS]

        for (const c of CASES) {
            // --- Cases ---
            rowsCases.push([
                c.id,
                c.isActive ? 1 : 0,
                c.title,
                c.rulesShort || '',
                c.scenario,
                c.solution,
                c.introImage || ''
            ])

            // --- Suspects ---
            // Assuming 1 suspect per case for now structure, but DB allows many
            if (c.suspect) {
                rowsSuspects.push([
                    c.id,
                    c.suspect.name,
                    (c.suspect.facts || []).join('\n'), // Newline separated
                    (c.suspect.lies || []).join('\n'),
                    'обычный', // text default
                    'флегматичный' // default baseline
                ])

                // --- Triggers ---
                if (c.suspect.triggers) {
                    for (const t of c.suspect.triggers) {
                        rowsTriggers.push([
                            c.id,
                            t.keywords.join(', '), // Comma separated keywords
                            t.reveal
                        ])
                    }
                }
            }
        }

        // 3. Write to Sheets
        console.log(`Writing ${rowsCases.length} rows to ${SHEET_CASES}...`)
        await googleSheetsService.createSheetIfNotExists(SHEET_CASES)
        await googleSheetsService.clearSheet(SHEET_CASES)
        await googleSheetsService.writeSheet(SHEET_CASES, rowsCases)

        console.log(`Writing ${rowsSuspects.length} rows to ${SHEET_SUSPECTS}...`)
        await googleSheetsService.createSheetIfNotExists(SHEET_SUSPECTS)
        await googleSheetsService.clearSheet(SHEET_SUSPECTS)
        await googleSheetsService.writeSheet(SHEET_SUSPECTS, rowsSuspects)

        console.log(`Writing ${rowsTriggers.length} rows to ${SHEET_TRIGGERS}...`)
        await googleSheetsService.createSheetIfNotExists(SHEET_TRIGGERS)
        await googleSheetsService.clearSheet(SHEET_TRIGGERS)
        await googleSheetsService.writeSheet(SHEET_TRIGGERS, rowsTriggers)

        console.log('✅ Migration COMPLETED successfully!')
        console.log('NOTE: Manual line breaks in cells might need "Clip/Wrap" adjustment in UI for readability.')

    } catch (e) {
        console.error('❌ Migration FAILED:', e)
    }
}

runMigration()
