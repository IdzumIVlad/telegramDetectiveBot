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

        try {
            const [rowsCases, rowsSuspects, rowsTriggers, rowsPrompts] = await Promise.all([
                googleSheetsService.readSheet('Config_Cases'),
                googleSheetsService.readSheet('Config_Suspects'),
                googleSheetsService.readSheet('Config_Triggers'),
                googleSheetsService.readSheet('Config_Prompts')
            ])

            if (!rowsCases || rowsCases.length < 2) throw new Error('Cases sheet empty or missing headers')

            const parsedCases = this._parseCases(rowsCases)
            const parsedSuspects = this._parseSuspects(rowsSuspects)
            const parsedTriggers = this._parseTriggers(rowsTriggers)
            const parsedPrompts = this._parsePrompts(rowsPrompts)

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
                        voice: suspect.voice,
                        triggers: triggers.map(t => ({
                            keywords: t.keywords,
                            reveal: t.reveal
                        }))
                    }
                } else {
                    console.warn(`⚠️ Case ${c.id} has no suspect configured.`)
                }

                // Find prompt override
                const casePrompts = parsedPrompts.filter(p => p.case_id === c.id)
                if (casePrompts.length > 0) {
                    c.promptTemplate = {}
                    const def = casePrompts.find(p => !p.lang) || casePrompts.find(p => p.lang === 'ru')
                    c.promptTemplate.ru = casePrompts.find(p => p.lang === 'ru')?.template || def?.template
                    c.promptTemplate.en = casePrompts.find(p => p.lang === 'en')?.template
                    c.promptTemplate.es = casePrompts.find(p => p.lang === 'es')?.template
                }
            }

            this.cases = parsedCases
            this.isLoaded = true
            this.prompts = parsedPrompts // Store raw prompts too if needed for debugging

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
        // NEW: title_en, title_es, scenario_en, scenario_es, solution_en, solution_es, rules_short_en, rules_short_es
        // Indices: 0..6 extended to ..14

        return rows.slice(1).map(r => {
            const safe = (idx) => r[idx] || ''
            return {
                id: r[0],
                isActive: r[1] == '1' || r[1] === 'TRUE',
                title: { ru: r[2], en: safe(7), es: safe(8) },
                rulesShort: { ru: r[3], en: safe(13), es: safe(14) },
                scenario: { ru: r[4], en: safe(9), es: safe(10) },
                solution: { ru: r[5], en: safe(11), es: safe(12) },
                introImage: r[6]
            }
        }).filter(c => c.id)
    }

    _parseSuspects(rows) {
        // Headers: case_id, name, facts, lies, voice, baseline
        // NEW: name_en, name_es, facts_en, facts_es, lies_en, lies_es, voice_en, voice_es

        if (!rows || rows.length < 2) return []

        const parseList = (txt) => (txt || '').split('\n').map(s => s.trim()).filter(Boolean)

        return rows.slice(1).map(r => {
            const safe = (idx) => r[idx] || ''
            return {
                case_id: r[0],
                name: { ru: r[1], en: safe(6), es: safe(7) },
                facts: { ru: parseList(r[2]), en: parseList(safe(8)), es: parseList(safe(9)) },
                lies: { ru: parseList(r[3]), en: parseList(safe(10)), es: parseList(safe(11)) },
                voice: { ru: r[4], en: safe(12), es: safe(13) },
                baseline: r[5] // baseline is internal logic (aggressive/etc), maybe keep universal or translate? 
                // Actually temperament.js has hardcoded mapping. We might need to map baseline keywords.
                // For now, let's assume baseline remains Russian keyword for internal logic, 
                // but the "voice" description is what matters for prompt.
            }
        }).filter(s => s.case_id)
    }

    _parseTriggers(rows) {
        // Headers: case_id, keywords, reveal, keywords_en, reveal_en, keywords_es, reveal_es
        if (!rows || rows.length < 2) return []

        const parseKeys = (txt) => (txt || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

        return rows.slice(1).map(r => {
            const safe = (idx) => r[idx] || ''
            return {
                case_id: r[0],
                keywords: {
                    ru: parseKeys(r[1]),
                    en: parseKeys(safe(3)),
                    es: parseKeys(safe(5))
                },
                reveal: {
                    ru: r[2],
                    en: safe(4),
                    es: safe(6)
                }
            }
        }).filter(t => t.case_id)
    }

    _parsePrompts(rows) {
        // Headers: case_id, template, lang
        if (!rows || rows.length < 2) return []
        return rows.slice(1).map(r => ({
            case_id: r[0],
            template: r[1],
            lang: (r[2] || 'ru').toLowerCase()
        })).filter(p => p.case_id && p.template)
    }
}

export const caseManager = new CaseManager()
