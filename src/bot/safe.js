// =====================
// Safe send helpers (важно!)
// =====================
export async function safeReply(ctx, text, keyboard) {
  try {
    if (keyboard) return await ctx.reply(text, keyboard)
    return await ctx.reply(text)
  } catch (e) {
    console.error('❌ Telegram send error:', e?.message || e)
    // fallback: try without keyboard
    try {
      return await ctx.reply(String(text))
    } catch (e2) {
      console.error('❌ Telegram fallback send error:', e2?.message || e2)
    }
  }
}

export async function safeTyping(ctx) {
  try {
    await ctx.sendChatAction('typing')
  } catch {}
}
