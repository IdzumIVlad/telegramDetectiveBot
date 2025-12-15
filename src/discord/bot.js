import { Client, GatewayIntentBits, Events } from 'discord.js'
import { DiscordContext } from '../game/platform/discord.js'
// We will access engine via deps passed in init

export const initDiscord = async (token, deps) => {
    const { handleText, startGame } = deps

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    })

    client.once(Events.ClientReady, c => {
        console.log(`🤖 Discord Logged in as ${c.user.tag}`)
    })

    client.on(Events.MessageCreate, async message => {
        if (message.author.bot) return

        // Handle !start command explicitly
        if (message.content.trim() === '!start') {
            const ctx = new DiscordContext(message, client)
            await startGame(ctx)
            return
        }

        const ctx = new DiscordContext(message, client)
        await handleText(ctx)
    })

    client.on(Events.InteractionCreate, async interaction => {
        // Button clicks
        if (interaction.isButton()) {
            // We need to pass this to handleText, but 'text' getter in DiscordContext
            // will return customId (which is the UI_KEY).
            // engine compares `text === L[KEY]` -> '🕵️ Разгадать'

            // Wait, DiscordContext.text logic I wrote:
            // if (this.ctx.customId) { const label = UI_LABELS[customId]; return label || customId }
            // So it returns the LABEL ('🕵️ Разгадать'), which matches what engine expects.

            const ctx = new DiscordContext(interaction, client)
            await handleText(ctx)
        }
    })

    try {
        await client.login(token)
    } catch (e) {
        console.error('❌ Discord Login Failed:', e.message)
        if (e.message.includes('disallowed intents')) {
            console.error('👉 Включите "Message Content Intent" в Discord Developer Portal -> Bot -> Privileged Gateway Intents')
        }
        return null
    }

    return client
}
