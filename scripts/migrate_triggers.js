import { googleSheetsService } from '../src/services/googleSheets.js'
import { OpenAI } from 'openai'
import { OPENAI_API_KEY, MODEL } from '../src/config.js'

// --- CONFIG ---
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

/**
 * Translate text to target language.
 */
async function translate(input, lang) {
    if (!input || !input.trim()) return ''

    console.log(`⏳ Translating to ${lang}: "${input.slice(0, 30)}..."`)

    try {
        const resp = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: `You are a professional translator for a detective game. Translate the following text to ${lang}. Keep tone, formatting. Return ONLY the translated text.` },
                { role: 'user', content: input }
            ],
            temperature: 0.3
        })
        return resp.choices[0].message.content.trim()
    } catch (e) {
        console.error('Translation failed:', e.message)
        return input
    }
}

async function migrateTriggers() {
    console.log('\n--- Processing TRIGGERS ---')
    await googleSheetsService.connect()

    const rows = await googleSheetsService.readSheet('Config_Triggers')
    if (rows.length < 2) return

    // Old Headers: case_id(0), keywords(1), reveal(2)
    // New Cols: keywords_en(3), reveal_en(4), keywords_es(5), reveal_es(6)

    const newHeaders = [...rows[0].slice(0, 3),
        'keywords_en', 'reveal_en',
        'keywords_es', 'reveal_es'
    ]

    const newRows = [newHeaders]

    for (let i = 1; i < rows.length; i++) {
        const r = rows[i]
        const cid = r[0]
        if (!cid) continue

        // Existing
        const keywords = r[1] || ''
        const reveal = r[2] || ''

        // Translate
        // Keywords are comma separated, but translation might mess it up if treated as sentence.
        // Best to translate as "list of keywords".

        let kw_en = keywords, kw_es = keywords

        if (keywords) {
            const respKw = await Promise.all([
                translate(`Translate this list of keywords to English (comma separated): ${keywords}`, 'English'),
                translate(`Translate this list of keywords to Spanish (comma separated): ${keywords}`, 'Spanish')
            ])
            kw_en = respKw[0]
            kw_es = respKw[1]
        }

        const [rev_en, rev_es] = await Promise.all([translate(reveal, 'English'), translate(reveal, 'Spanish')])

        const newRow = [
            r[0], r[1], r[2], // Copy existing 3 cols
            kw_en, rev_en,
            kw_es, rev_es
        ]
        newRows.push(newRow)
    }

    await googleSheetsService.writeSheet('Config_Triggers', newRows)
    console.log('✅ Config_Triggers updated')
}

migrateTriggers()
