import { GameContext } from './context.js'
import { UI_KEYS, UI_LABELS } from './ui.js'

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

    async reply(text, uiKeys = null) {
        const extra = uiKeys ? this._buildKeyboard(uiKeys) : undefined

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

    _buildKeyboard(uiKeys) {
        // uiKeys is expected to be a 2D array of UI_KEYS or special objects
        // But engine might pass abstract names like 'MAIN', 'YESNO'
        // Let's stick to what engine passed: likely a specific keyboard configuration

        // Actually, to keep engine agnostic, engine should pass logical names like 'MAIN_MENU'
        // OR engine passes a 2D array of keys: [[UI_KEYS.SOLVE, UI_KEYS.RESTART]]

        // Let's assume engine passes a 2D array of keys for maximum flexibility

        // Map keys to labels
        const buttons = uiKeys.map(row =>
            row.map(key => UI_LABELS[key] || key) // Fallback to key if no label (e.g. dynamic text)
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
