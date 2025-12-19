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

        const content = message.content.trim()

        // Admin command to deploy the lobby button (Allowed in Public Channels)
        if (content === '!deploy') {
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = await import('discord.js')

            // Security check
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return // Ignore non-admins
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('START_GAME_LOBBY')
                        .setLabel('Start Case 🕵️‍♂️')
                        .setStyle(ButtonStyle.Primary)
                )

            await message.channel.send({
                content: '🕵️ **Detective Game**\nPress the button below to start a new private investigation.',
                components: [row]
            })
            return
        }

        // Restrict game logic to Threads only
        if (!message.channel.isThread()) {
            return
        }

        // Handle !start command explicitly (legacy/debug)
        if (content === '!start') {
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

            // 1. LOBBY START
            if (interaction.customId === 'START_GAME_LOBBY') {
                try {
                    const { ChannelType } = await import('discord.js')

                    // Create private thread
                    // Note: 'GuildPrivateThread' requires server boost level 2 or just standard private threads if available.
                    // Fallback to Public Thread if Private not supported? Usually Private is standard now for community servers.
                    // Actually, ChannelType.PrivateThread is the correct type.

                    const thread = await interaction.channel.threads.create({
                        name: `Case-${interaction.user.username}`,
                        autoArchiveDuration: 60,
                        type: ChannelType.PrivateThread,
                        reason: 'Detective Game Session'
                    })

                    // Add user to thread
                    await thread.members.add(interaction.user.id)

                    // Reply ephemerally to button click
                    await interaction.reply({
                        content: `🕵️‍♂️ Case started! Proceed to ${thread.toString()}`,
                        ephemeral: true
                    })

                    // Init game in thread
                    // We need a context that points to the THREAD channel, not the lobby channel.
                    // We can fake a "message" object or just construct context manually.
                    // But DiscordContext expects "interactionOrMessage".
                    // If we pass the INTERACTION, it replies to the interaction (the button).
                    // We want to send messages to the THREAD.

                    // Let's send a dummy message to the thread to start interaction?
                    // Or construct a context that wraps the thread channel.

                    await thread.send(`👋 Welcome, Detective <@${interaction.user.id}>! Initializing data...`)

                    // Hack: Create a dummy message object to initialize context pointing to the thread
                    const dummyMessage = {
                        author: interaction.user,
                        channel: thread,
                        channelId: thread.id,
                        content: '', // empty start
                        reply: async (payload) => thread.send(payload), // Override reply to send to thread
                        channel: thread
                    }

                    // Initialize game
                    const ctx = new DiscordContext(dummyMessage, client)
                    // We need to ensure ctx.reply uses thread.send (handled by checking ctx.channel.send in DiscordContext)
                    // DiscordContext constructor: if passed object has .reply, it uses it.
                    // But confirm DiscordContext logic.

                    await startGame(ctx)

                } catch (e) {
                    console.error('Failed to create thread:', e)
                    await interaction.reply({ content: 'Error starting case. Check bot permissions (Create Private Threads).', ephemeral: true })
                }
                return
            }

            // Normal Game Buttons
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
