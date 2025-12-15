import { GameContext } from './context.js'
import { UI_KEYS, UI_LABELS } from './ui.js'

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
        // If it's a message, return content
        if (this.ctx.content) return this.ctx.content.trim()
        // If it's an interaction (button click), the 'text' is effectively the label or ID
        // But engine expects text input for some things.
        // For buttons, we should ideally map button ID to text if engine relies on text comparison
        // But engine uses UI_LABELS to check text. 
        // If we use button customId = UI_KEY, we can map it back to Label?

        if (this.ctx.customId) {
            // It's a button click?
            // If we set customId as the UI Key (e.g. 'BTN_SOLVE'), 
            // we can return the Label so engine logic works unchanged (comparing against L[UI_KEYS.SOLVE])
            // OR engine needs to be smarter.

            // Current Engine Logic: `if (text === L[UI_KEYS.SOLVE])` which is '🕵️ Разгадать'

            const label = UI_LABELS[this.ctx.customId]
            if (label) return label

            return this.ctx.customId
        }

        return ''
    }

    async reply(text, uiKeys = null) {
        // Truncate text if too long for Discord (2000 chars)
        // Basic safeguard
        const safeText = text.slice(0, 1999)

        const payload = { content: safeText }

        if (uiKeys && uiKeys.length > 0) {
            payload.components = this._buildComponents(uiKeys)
        } else {
            // Remove components if previously there? No, new message.
            payload.components = []
        }

        try {
            // If interaction (button click), we must reply (or update)
            // If we are in the middle of a flow, 'reply' usually means sending a NEW message in response
            // Engine logic tends to send multiple messages: `await ctx.reply(...)` multiple times

            if (this.ctx.replied || this.ctx.deferred) {
                // If already replied to this interaction, use followUp
                await this.ctx.followUp(payload)
            } else if (this.isInteraction) {
                // First reply to interaction
                await this.ctx.reply(payload)
            } else {
                // Regular message event
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

    _buildComponents(uiKeys) {
        // uiKeys is 2D array of keys
        // Discord allows max 5 components per ActionRow, max 5 ActionRows.
        // We map each row to an ActionRowBuilder

        return uiKeys.map(row => {
            const actionRow = new ActionRowBuilder()
            row.forEach(key => {
                const label = UI_LABELS[key] || key
                const style = this._getButtonStyle(key)

                const btn = new ButtonBuilder()
                    .setCustomId(key) // Use key as ID (e.g. 'BTN_SOLVE')
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
