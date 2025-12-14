import 'dotenv/config'
import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

try {
  const r = await client.chat.completions.create({
    model: process.env.MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'ping' }],
    temperature: 0,
  })
  console.log('OK:', r.choices[0].message.content)
} catch (e) {
  console.error('FAIL:', {
    message: e?.message,
    status: e?.status,
    code: e?.code,
    request_id: e?.request_id,
    error: e?.error,
  })
  process.exit(1)
}
