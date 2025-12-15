export class GameContext {
    constructor(platform, originalCtx) {
        this.platform = platform // 'telegram' | 'discord'
        this.originalCtx = originalCtx
    }

    get userId() { throw new Error('Not implemented') }
    get chatId() { throw new Error('Not implemented') }
    get username() { throw new Error('Not implemented') }
    get text() { throw new Error('Not implemented') }

    /**
     * @param {string} text
     * @param {string[][]} [keyboard] - Optional 2D array of button labels
     */
    async reply(text, keyboard = null) { throw new Error('Not implemented') }

    async sendTyping() { throw new Error('Not implemented') }

    // Optional: Unified logging helper
    log(message) {
        console.log(`[${this.platform.toUpperCase()}] ${message}`)
    }
}
