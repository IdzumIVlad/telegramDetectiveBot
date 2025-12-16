import { googleSheetsService } from '../src/services/googleSheets.js'

const TEXTS = {
    ru: `\nЗАПРЕТ: Не предлагай игроку "спросить у кого-то еще" или "уточнить у охраны". Игрок говорит ТОЛЬКО с тобой. Если нужно сослаться на другого — говори "Он мог видеть", "Я слышал от него", но не отправляй игрока к нему.`,
    en: `\nPROHIBITION: Do not suggest the player "ask someone else" or "check with security". The player talks ONLY to you. If you need to refer to someone else, say "He might have seen", "I heard from him", but do not send the player to them.`,
    es: `\nPROHIBICIÓN: No sugieras al jugador "preguntar a alguien más" o "consultar con seguridad". El jugador habla SOLO contigo. Si necesitas referirte a otra persona, di "Él podría haber visto", "Escuché de él", pero no envíes al jugador con ellos.`
}

async function run() {
    console.log('Connecting...')
    await googleSheetsService.connect()

    const SHEET_NAME = 'Config_Prompts'
    const rows = await googleSheetsService.readSheet(SHEET_NAME)

    if (!rows || rows.length < 2) {
        console.error('Sheet empty or not found')
        return
    }

    console.log(`Found ${rows.length} rows (including header)`)

    // Headers: case_id, template, lang
    // Index 1 is template, Index 2 is lang

    let updatedCount = 0

    const newRows = rows.map((r, i) => {
        if (i === 0) return r // Header

        const lang = (r[2] || 'ru').toLowerCase()
        let template = r[1] || ''

        const addition = TEXTS[lang] || TEXTS.ru

        // Check if already present to avoid duplicates
        if (!template.includes('ЗАПРЕТ: Не предлагай') && !template.includes('PROHIBITION: Do not suggest') && !template.includes('PROHIBICIÓN: No sugieras')) {
            template += addition
            updatedCount++
        }

        return [r[0], template, r[2]] // Return updated row
    })

    if (updatedCount > 0) {
        console.log(`Updating ${updatedCount} rows...`)
        await googleSheetsService.writeSheet(SHEET_NAME, newRows)
        console.log('✅ Done!')
    } else {
        console.log('No updates needed.')
    }
}

run().catch(console.error)
