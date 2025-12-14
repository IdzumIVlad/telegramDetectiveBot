import { Markup } from 'telegraf'

// =====================
// UI (Reply keyboard bottom)
// =====================
export const BTN = {
  SOLVE: '🕵️ Разгадать',
  RESTART: '🔄 Перезапустить',
  HELP: 'ℹ️ Помощь',

  YES: '✅ Да',
  NO: '❌ Нет',

  MORE_YES: '➕ Да, ещё 5 вопросов',
  MORE_NO: '➡️ Нет, перейти к разгадке',

  CASE_1: '📦 Ночной склад',
  CASE_2: '🖼️ Кража в музее',
}

export function kbMain() {
  return Markup.keyboard([[BTN.SOLVE, BTN.RESTART], [BTN.HELP]]).resize().persistent()
}
export function kbYesNo() {
  return Markup.keyboard([[BTN.YES, BTN.NO]]).resize().oneTime()
}
export function kbMore() {
  return Markup.keyboard([[BTN.MORE_YES], [BTN.MORE_NO]]).resize().oneTime()
}

export function kbCaseSelection() {
  return Markup.keyboard([
    [BTN.CASE_1],
    [BTN.CASE_2]
  ]).resize().oneTime()
}
