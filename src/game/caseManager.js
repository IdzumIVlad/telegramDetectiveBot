import { googleSheetsService } from '../services/googleSheets.js'

class CaseManager {
    constructor() {
        this.cases = []
        this.isLoaded = false
    }

    /**
     * Load all cases, characters, and triggers from Google Sheets
     * and assemble them into the internal objects.
     */
    async loadFromCloud() {
        console.log('☁️ Loading cases from Google Sheets...')

        // We need a helper to read all rows. Since googleSheetsService currently only has append/write,
        // we need to add a 'readSheet' method there first. 
        // Assuming we will add it, or we can access the client directly if we expose it, 
        // but better to add 'readSheet' to the service.

        // TEMPORARY: I will assume the service has 'readSheet' returning Array<Array<string>> (rows)
        // If not, we will add it in the next step.

        try {
            const [rowsCases, rowsSuspects, rowsTriggers] = await Promise.all([
                googleSheetsService.readSheet('Config_Cases'),
                googleSheetsService.readSheet('Config_Suspects'),
                googleSheetsService.readSheet('Config_Triggers')
            ])

            if (!rowsCases || rowsCases.length < 2) throw new Error('Cases sheet empty or missing headers')

            const parsedCases = this._parseCases(rowsCases)
            const parsedSuspects = this._parseSuspects(rowsSuspects)
            const parsedTriggers = this._parseTriggers(rowsTriggers)

            // Assemble
            for (const c of parsedCases) {
                // Find suspect
                const suspect = parsedSuspects.find(s => s.case_id === c.id)
                if (suspect) {
                    // Find triggers
                    const triggers = parsedTriggers.filter(t => t.case_id === c.id)
                    // Attach suspect to case
                    c.suspect = {
                        name: suspect.name,
                        facts: suspect.facts,
                        lies: suspect.lies,
                        triggers: triggers.map(t => ({
                            keywords: t.keywords,
                            reveal: t.reveal
                        }))
                    }
                } else {
                    console.warn(`⚠️ Case ${c.id} has no suspect configured.`)
                }
            }

            this.cases = parsedCases
            this.isLoaded = true
            console.log(`✅ Loaded ${this.cases.length} cases from cloud. Active: ${this.cases.filter(c => c.isActive).length}`)
            return true

        } catch (e) {
            console.error('❌ Failed to load cases:', e)
            return false
        }
    }

    getCaseById(id) {
        if (!id) return null
        // Loose comparison for string/number IDs
        return this.cases.find(c => String(c.id) === String(id)) || null
    }

    getAllActive() {
        return this.cases.filter(c => c.isActive)
    }

    // --- PARSERS ---

    _parseCases(rows) {
        // Headers: id, active, title, rules_short, scenario, solution, intro_image
        // Skip header row
        return rows.slice(1).map(r => ({
            id: r[0],
            isActive: r[1] == '1' || r[1] === 'TRUE',
            title: r[2],
            rulesShort: r[3],
            scenario: r[4],
            solution: r[5],
            introImage: r[6]
        })).filter(c => c.id) // skip empty rows
    }

    _parseSuspects(rows) {
        // Headers: case_id, name, facts, lies, voice, baseline
        if (!rows || rows.length < 2) return []
        return rows.slice(1).map(r => ({
            case_id: r[0],
            name: r[1],
            facts: (r[2] || '').split('\n').map(s => s.trim()).filter(Boolean),
            lies: (r[3] || '').split('\n').map(s => s.trim()).filter(Boolean),
            voice: r[4],
            baseline: r[5]
        })).filter(s => s.case_id)
    }

    _parseTriggers(rows) {
        // Headers: case_id, keywords, reveal
        if (!rows || rows.length < 2) return []
        return rows.slice(1).map(r => ({
            case_id: r[0],
            keywords: (r[1] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
            reveal: r[2]
        })).filter(t => t.case_id)
    }
}

export const caseManager = new CaseManager()
