import { Client, GatewayIntentBits, Events } from 'discord.js'
import { DiscordContext } from '../game/platform/discord.js'

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
            // DiscordContext handles mapping customId (UI_KEY) -> Label
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
