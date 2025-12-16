
import { askSuspectLLM } from '../src/llm/suspect.js'
import { OpenAI } from 'openai'
import { OPENAI_API_KEY, MODEL } from '../src/config.js'

async function test() {
    console.log('🧪 Testing askSuspectLLM...')
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    const mockCase = {
        id: 'test',
        scenario: { ru: 'Scenario RU', en: 'Scenario EN', es: 'Scenario ES' },
        suspect: {
            name: { ru: 'Ivan', en: 'John', es: 'Juan' },
            voice: { ru: 'Voice RU', en: 'Voice EN', es: 'Voice ES' },
            facts: { ru: ['F1'], en: ['F1'], es: ['F1'] },
            lies: { ru: ['L1'], en: ['L1'], es: ['L1'] },
            triggers: []
        },
        promptTemplate: {
            ru: "You are {{role}}. Answer in Russian. {{scenario}}",
            en: "You are {{role}}. Answer in English. {{scenario}}",
            es: "You are {{role}}. Answer in Spanish. {{scenario}}"
        }
    }

    const mockSession = {
        lang: 'es',
        asked: 0,
        history: [],
        suspectProfile: {
            baseline: 'nervous',
            voice: 'shaky',
            quirks: ['stutters']
        }
    }

    try {
        const res = await askSuspectLLM({
            openai,
            model: MODEL,
            caseData: mockCase,
            session: mockSession,
            questionOriginal: 'Hola, quien eres?'
        })
        console.log('✅ Result:', res)
    } catch (e) {
        console.error('❌ Error:', e)
    }
}

test()
