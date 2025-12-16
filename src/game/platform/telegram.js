import { GameContext } from './context.js'
import { UI_KEYS } from './ui.js'
import { getLocale } from '../locales.js'
import { Markup } from 'telegraf'

export class TelegramContext extends GameContext {
    constructor(ctx) {
        super('telegram', ctx)
        this.ctx = ctx
    }

    get userId() {
        return this.ctx.from?.id
    }

    get chatId() {
        return this.ctx.chat?.id
    }

    get username() {
        return this.ctx.from?.username || 'anon'
    }

    get firstName() {
        return this.ctx.from?.first_name || ''
    }

    get text() {
        return (this.ctx.message?.text || '').trim()
    }

    async reply(text, uiKeys = null, lang = 'ru') {
        const extra = uiKeys ? this._buildKeyboard(uiKeys, lang) : undefined

        try {
            if (extra) {
                await this.ctx.reply(text, extra)
            } else {
                await this.ctx.reply(text)
            }
        } catch (e) {
            console.error('❌ Telegram send error:', e?.message || e)
            // Fallback
            if (extra) {
                try {
                    await this.ctx.reply(text)
                } catch (e2) {
                    console.error('Failed fallback', e2)
                }
            }
        }
    }

    async sendTyping() {
        try {
            await this.ctx.sendChatAction('typing')
        } catch (e) {
            // ignore
        }
    }

    _buildKeyboard(uiKeys, lang) {
        const locale = getLocale(lang)
        // Map keys to labels
        const buttons = uiKeys.map(row =>
            row.map(key => locale[key] || key)
        )

        // Determine generic options based on content (heuristic)
        // If it looks like main menu, persistent. Else oneTime.
        const isMain = uiKeys.some(row => row.includes(UI_KEYS.SOLVE))

        if (isMain) {
            return Markup.keyboard(buttons).resize().persistent()
        }
        return Markup.keyboard(buttons).resize().oneTime()
    }
}
