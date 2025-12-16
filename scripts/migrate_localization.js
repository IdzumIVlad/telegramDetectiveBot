import { googleSheetsService } from '../src/services/googleSheets.js'
import { OpenAI } from 'openai'
import { OPENAI_API_KEY, MODEL } from '../src/config.js'

// --- CONFIG ---
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

/**
 * Translate text to target language.
 * Handles single strings or Arrays (for facts/lies list).
 */
async function translate(input, lang) {
    if (!input) return input
    const isArray = Array.isArray(input)
    const text = isArray ? input.join('\n') : input

    if (!text.trim()) return isArray ? [] : ''

    console.log(`⏳ Translating to ${lang}: "${text.slice(0, 30)}..."`)

    try {
        const resp = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: `You are a professional translator for a detective game. Translate the following text to ${lang}. Keep tone, formatting, and any placeholders ({{...}}). Return ONLY the translated text.` },
                { role: 'user', content: text }
            ],
            temperature: 0.3
        })
        const result = resp.choices[0].message.content.trim()
        return isArray ? result.split('\n') : result
    } catch (e) {
        console.error('Translation failed:', e.message)
        return text // Fallback to original
    }
}

async function migrateCases() {
    console.log('\n--- Processing CASES ---')
    const rows = await googleSheetsService.readSheet('Config_Cases')
    if (rows.length < 2) return

    // Old Headers: id(0), active(1), title(2), rules(3), scenario(4), solution(5), image(6)
    // New Cols to add: title_en(7), title_es(8), scenario_en(9), scenario_es(10), solution_en(11), solution_es(12), rules_en(13), rules_es(14)

    const newHeaders = [...rows[0].slice(0, 7),
        'title_en', 'title_es',
        'scenario_en', 'scenario_es',
        'solution_en', 'solution_es',
        'rules_short_en', 'rules_short_es'
    ]

    const newRows = [newHeaders]

    for (let i = 1; i < rows.length; i++) {
        const r = rows[i]
        const id = r[0]; if (!id) continue

        // Existing
        const title = r[2] || ''
        const rules = r[3] || ''
        const scenario = r[4] || ''
        const solution = r[5] || ''

        // Translate
        const [title_en, title_es] = await Promise.all([translate(title, 'English'), translate(title, 'Spanish')])
        const [scen_en, scen_es] = await Promise.all([translate(scenario, 'English'), translate(scenario, 'Spanish')])
        const [sol_en, sol_es] = await Promise.all([translate(solution, 'English'), translate(solution, 'Spanish')])
        const [rules_en, rules_es] = await Promise.all([translate(rules, 'English'), translate(rules, 'Spanish')])

        const newRow = [
            r[0], r[1], r[2], r[3], r[4], r[5], r[6], // Copy existing 7 cols
            title_en, title_es,
            scen_en, scen_es,
            sol_en, sol_es,
            rules_en, rules_es
        ]
        newRows.push(newRow)
    }

    await googleSheetsService.writeSheet('Config_Cases', newRows)
    console.log('✅ Config_Cases updated')
}

async function migrateSuspects() {
    console.log('\n--- Processing SUSPECTS ---')
    const rows = await googleSheetsService.readSheet('Config_Suspects')
    if (rows.length < 2) return

    // Old Headers: case_id(0), name(1), facts(2), lies(3), voice(4), baseline(5)
    // New Cols: name_en(6), name_es(7), facts_en(8), facts_es(9), lies_en(10), lies_es(11), voice_en(12), voice_es(13)

    const newHeaders = [...rows[0].slice(0, 6),
        'name_en', 'name_es',
        'facts_en', 'facts_es',
        'lies_en', 'lies_es',
        'voice_en', 'voice_es'
    ]

    const newRows = [newHeaders]

    for (let i = 1; i < rows.length; i++) {
        const r = rows[i]
        const id = r[0]; if (!id) continue

        const name = r[1] || ''
        const facts = r[2] || ''
        const lies = r[3] || ''
        const voice = r[4] || ''

        const [name_en, name_es] = await Promise.all([translate(name, 'English'), translate(name, 'Spanish')])
        const [facts_en, facts_es] = await Promise.all([translate(facts, 'English'), translate(facts, 'Spanish')])
        const [lies_en, lies_es] = await Promise.all([translate(lies, 'English'), translate(lies, 'Spanish')])
        const [voice_en, voice_es] = await Promise.all([translate(voice, 'English'), translate(voice, 'Spanish')])

        const newRow = [
            r[0], r[1], r[2], r[3], r[4], r[5],
            name_en, name_es,
            facts_en, facts_es,
            lies_en, lies_es,
            voice_en, voice_es
        ]
        newRows.push(newRow)
    }

    await googleSheetsService.writeSheet('Config_Suspects', newRows)
    console.log('✅ Config_Suspects updated')
}

// Prompts require a bit more manual handling or specific template rules.
// But we can just duplicate the RU prompt for EN/ES and let LLM format it generally.
async function migratePrompts() {
    console.log('\n--- Processing PROMPTS ---')
    const rows = await googleSheetsService.readSheet('Config_Prompts')
    if (rows.length < 2) return

    // Old: case_id, template
    // New: case_id, template, lang

    const newRows = [['case_id', 'template', 'lang']]

    // Process each existing prompt (assumed RU)
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i]
        const cid = r[0]
        const tmpl = r[1]
        if (!cid) continue

        // Add Original (RU)
        newRows.push([cid, tmpl, 'ru'])

        // Gen EN/ES
        // Translating prompts is tricky because of {{tags}}.
        // But LLM should handle it if instructed.
        const [tmpl_en, tmpl_es] = await Promise.all([translate(tmpl, 'English'), translate(tmpl, 'Spanish')])

        newRows.push([cid, tmpl_en, 'en'])
        newRows.push([cid, tmpl_es, 'es'])
    }

    await googleSheetsService.writeSheet('Config_Prompts', newRows)
    console.log('✅ Config_Prompts updated')
}


async function run() {
    await googleSheetsService.connect()
    await migrateCases()
    await migrateSuspects()
    await migratePrompts()
    console.log('🎉 MIGRATION COMPLETE')
}

run()
