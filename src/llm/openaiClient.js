import OpenAI from 'openai'
import { OPENAI_API_KEY } from '../config.js'

export function createOpenAIClient() {
  return new OpenAI({ apiKey: OPENAI_API_KEY })
}
