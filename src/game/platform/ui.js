// Abstract UI Keys (Buttons)
export const UI_KEYS = {
    SOLVE: 'BTN_SOLVE',
    RESTART: 'BTN_RESTART',
    HELP: 'BTN_HELP',
    YES: 'BTN_YES',
    NO: 'BTN_NO',
    MORE_YES: 'BTN_MORE_YES',
    MORE_NO: 'BTN_MORE_NO',

    // Placeholders that will be replaced by dynamic content usually,
    // but good to have keys if we want to map them rigidly.
    CASE_1: 'BTN_CASE_1',
    CASE_2: 'BTN_CASE_2'
}

// Default Russian labels (can be moved to a translation file later)
export const UI_LABELS = {
    [UI_KEYS.SOLVE]: '🕵️ Разгадать',
    [UI_KEYS.RESTART]: '🔄 Перезапустить',
    [UI_KEYS.HELP]: 'ℹ️ Помощь',
    [UI_KEYS.YES]: '✅ Да',
    [UI_KEYS.NO]: '❌ Нет',
    [UI_KEYS.MORE_YES]: '➕ Да, ещё 5 вопросов',
    [UI_KEYS.MORE_NO]: '➡️ Нет, перейти к разгадке',
    [UI_KEYS.CASE_1]: '📦 Ночной склад',
    [UI_KEYS.CASE_2]: '🖼️ Кража в музее'
}
