import { GameContext } from './context.js'
import { UI_KEYS } from './ui.js'
import { getLocale } from '../locales.js'

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

export class DiscordContext extends GameContext {
    constructor(interactionOrMessage, client) {
        super('discord', interactionOrMessage)
        this.ctx = interactionOrMessage
        this.client = client
        this.isInteraction = !!this.ctx.isCommand || !!this.ctx.isButton
    }

    get userId() {
        return this.ctx.author?.id || this.ctx.user?.id
    }

    get chatId() {
        return this.ctx.channelId
    }

    get username() {
        return this.ctx.author?.username || this.ctx.user?.username || 'anon'
    }

    get text() {
        if (this.ctx.customId) {
            return this.ctx.customId
        }
        return this.ctx.content ? this.ctx.content.trim() : ''
    }

    async reply(text, uiKeys = null, lang = 'ru') {
        const safeText = text.slice(0, 1999)
        const payload = { content: safeText }

        if (uiKeys && uiKeys.length > 0) {
            payload.components = this._buildComponents(uiKeys, lang)
        } else {
            payload.components = []
        }

        try {
            if (this.ctx.replied || this.ctx.deferred) {
                await this.ctx.followUp(payload)
            } else if (this.isInteraction) {
                await this.ctx.reply(payload)
            } else {
                await this.ctx.channel.send(payload)
            }
        } catch (e) {
            console.error('❌ Discord send error:', e)
        }
    }

    async sendTyping() {
        try {
            if (this.ctx.channel) {
                await this.ctx.channel.sendTyping()
            }
        } catch { }
    }

    _buildComponents(uiKeys, lang) {
        const locale = getLocale(lang)
        return uiKeys.map(row => {
            const actionRow = new ActionRowBuilder()
            row.forEach(key => {
                const label = locale[key] || key
                const style = this._getButtonStyle(key)

                const btn = new ButtonBuilder()
                    .setCustomId(key)
                    .setLabel(label)
                    .setStyle(style)

                actionRow.addComponents(btn)
            })
            return actionRow
        })
    }

    _getButtonStyle(key) {
        if (key.includes('YES')) return ButtonStyle.Success
        if (key.includes('NO')) return ButtonStyle.Danger
        if (key.includes('SOLVE')) return ButtonStyle.Primary
        return ButtonStyle.Secondary
    }
}
