export const LOCALES = {
    ru: {
        // UI Keys
        BTN_SOLVE: '🕵️ Разгадать',
        BTN_RESTART: '🔄 Перезапустить',
        BTN_HELP: 'ℹ️ Помощь',
        BTN_YES: '✅ Да',
        BTN_NO: '❌ Нет',
        BTN_MORE_YES: '➕ Да, ещё 5 вопросов',
        BTN_MORE_NO: '➡️ Нет, перейти к разгадке',
        BTN_CASE_1: '📦 Ночной склад',
        BTN_CASE_2: '🖼️ Кража в музее',

        // Messages
        LANG_SELECT: 'Выберите язык / Choose language / Elige idioma',
        NO_ACTIVE_CASES: '⚠️ Нет активных дел. Обратитесь к администратору.',
        CASE_SELECT_MSG: 'Какой кейс будем расследовать?\n\n',
        CASE_DEFAULT_LABEL: 'Дело',
        GAME_ALREADY_ACTIVE: (left, mode) => `🔎 Игра уже идёт.\nОсталось вопросов: ${left}\nРежим: ${mode}`,
        ERR_CASE_NOT_FOUND: '⚠️ Ошибка: Данные дела не найдены. Начните заново: /start',
        ERR_INTERNAL: '⚠️ Внутренняя ошибка. Нажми 🔄 Перезапустить или отправь /start.',

        // Stages
        CONFIRM_RESTART: '🔄 Перезапуск игры\n\nТы уверен? Прогресс будет потерян.\nНажми ✅ Да или ❌ Нет.',
        CONFIRM_RESTART_YES: '✅ Прогресс сброшен.',
        CONFIRM_RESTART_NO: '👌 Ок, продолжаем.',
        CONFIRM_YES_NO: 'Нажми ✅ Да или ❌ Нет.',

        CONFIRM_SOLVE: 'Ты уверен, что готов выдвинуть версию?\nВернуться к вопросам будет нельзя.',
        CONFIRM_SOLVE_NO: '👌 Возвращаемся к вопросам.',

        SOLVE_MODE_TITLE: '🕵️ Режим разгадки',
        SOLVE_MODE_MSG: 'Теперь любые твои сообщения считаются версией.\nВопросы больше не принимаются.\n\nНапиши одним сообщением:\nКто → что → как → почему → когда/как вынес.',

        LIMIT_REACHED: '❗ Лимит 10 вопросов исчерпан.\nНужны ещё 5 вопросов?',
        LIMIT_EXTRA_YES: '✅ Отлично. У тебя есть ещё 5 вопросов. Продолжай допрос.',

        MULTI_QUESTION_WARN: 'ℹ️ Я отвечу только на первый вопрос. Остальное — отдельными сообщениями.',
        THIKING: '…думает',

        // LLM Errors
        ERR_LLM_CHECK: '⚠️ Ошибка проверки версии. Попробуй ещё раз чуть короче и конкретнее.',
        ERR_LLM_BABE: '⚠️ Ошибка ответа свидетеля. Попробуй переформулировать вопрос.',

        // Results
        WIN_TITLE: '🏆 Победа!',
        WIN_TITLE_COND: '🥈 Условная победа!',
        LOSS_TITLE: '❌ Не сошлось.',
        RESULT_META: (acc, q, score) => `Точность: ${acc}%\nВопросов: ${q}\nБаллы: ${score}/10`,
        PLAY_AGAIN: 'Хочешь сыграть снова? /start',
        GAME_FINISHED: 'Игра завершена. Начать заново: /start',
        NOT_UNDERSTOOD: 'Не понял. Начни игру: /start',

        // Help
        HELP_TEXT: `ℹ️ Помощь

Ты допрашиваешь подозреваемого. Лимит — 10 вопросов.
После 10 — можно взять ещё 5 или перейти к разгадке.

Правило: один вопрос = одно сообщение.
Если отправишь несколько — отвечу только на первый.

Кнопка "🕵️ Разгадать" включает режим версии.`
    },
    en: {
        BTN_SOLVE: '🕵️ Solve',
        BTN_RESTART: '🔄 Restart',
        BTN_HELP: 'ℹ️ Help',
        BTN_YES: '✅ Yes',
        BTN_NO: '❌ No',
        BTN_MORE_YES: '➕ Yes, 5 more',
        BTN_MORE_NO: '➡️ No, ready to solve',
        BTN_CASE_1: '📦 Night Warehouse',
        BTN_CASE_2: '🖼️ Museum Theft',

        LANG_SELECT: 'Choose language',
        NO_ACTIVE_CASES: '⚠️ No active cases. Contact admin.',
        CASE_SELECT_MSG: 'Which case shall we investigate?\n\n',
        CASE_DEFAULT_LABEL: 'Case',
        GAME_ALREADY_ACTIVE: (left, mode) => `🔎 Game is active.\nQuestions left: ${left}\nMode: ${mode}`,
        ERR_CASE_NOT_FOUND: '⚠️ Error: Case data not found. Restart: /start',
        ERR_INTERNAL: '⚠️ Internal error. Press 🔄 Restart or send /start.',

        CONFIRM_RESTART: '🔄 Restart Game\n\nAre you sure? Progress will be lost.\nPress ✅ Yes or ❌ No.',
        CONFIRM_RESTART_YES: '✅ Progress reset.',
        CONFIRM_RESTART_NO: '👌 Ok, continuing.',
        CONFIRM_YES_NO: 'Press ✅ Yes or ❌ No.',

        CONFIRM_SOLVE: 'Are you sure you represent ready to solve?\nYou cannot return to questions.',
        CONFIRM_SOLVE_NO: '👌 Returning to questions.',

        SOLVE_MODE_TITLE: '🕵️ Solution Mode',
        SOLVE_MODE_MSG: 'Your next messages will be treated as your solution.\nQuestions are no longer accepted.\n\nWrite in one message:\nWho → what → how → why → when.',

        LIMIT_REACHED: '❗ Limit of 10 questions reached.\nNeed 5 more?',
        LIMIT_EXTRA_YES: '✅ Great. You have 5 more questions. Continue.',

        MULTI_QUESTION_WARN: 'ℹ️ I will answer only the first question. Send others separately.',
        THIKING: '…thinking',

        ERR_LLM_CHECK: '⚠️ Error checking solution. Try again, be concise.',
        ERR_LLM_BABE: '⚠️ Suspect response error. Try rephrasing.',

        WIN_TITLE: '🏆 Victory!',
        WIN_TITLE_COND: '🥈 Conditional Victory!',
        LOSS_TITLE: '❌ Missed.',
        RESULT_META: (acc, q, score) => `Accuracy: ${acc}%\nQuestions: ${q}\nScore: ${score}/10`,
        PLAY_AGAIN: 'Play again? /start',
        GAME_FINISHED: 'Game finished. Restart: /start',
        NOT_UNDERSTOOD: 'Not understood. Start game: /start',

        HELP_TEXT: `ℹ️ Help

You are interrogating a suspect. Limit: 10 questions.
After 10, you can take 5 more or solve.

Rule: one question = one message.
"🕵️ Solve" button enables solution mode.`
    },
    es: {
        BTN_SOLVE: '🕵️ Resolver',
        BTN_RESTART: '🔄 Reiniciar',
        BTN_HELP: 'ℹ️ Ayuda',
        BTN_YES: '✅ Sí',
        BTN_NO: '❌ No',
        BTN_MORE_YES: '➕ Sí, 5 más',
        BTN_MORE_NO: '➡️ No, resolver',
        BTN_CASE_1: '📦 Almacén Nocturno',
        BTN_CASE_2: '🖼️ Robo en el Museo',

        LANG_SELECT: 'Elige idioma',
        NO_ACTIVE_CASES: '⚠️ No hay casos activos. Contacta al admin.',
        CASE_SELECT_MSG: '¿Qué caso investigamos?\n\n',
        CASE_DEFAULT_LABEL: 'Caso',
        GAME_ALREADY_ACTIVE: (left, mode) => `🔎 Juego activo.\nPreguntas restantes: ${left}\nModo: ${mode}`,
        ERR_CASE_NOT_FOUND: '⚠️ Error: Datos del caso no encontrados. Reinicia: /start',
        ERR_INTERNAL: '⚠️ Error interno. Pulsa 🔄 Reiniciar o envía /start.',

        CONFIRM_RESTART: '🔄 Reiniciar Juego\n\n¿Seguro? Se perderá el progreso.\nPulsa ✅ Sí o ❌ No.',
        CONFIRM_RESTART_YES: '✅ Progreso reiniciado.',
        CONFIRM_RESTART_NO: '👌 Ok, continuamos.',
        CONFIRM_YES_NO: 'Pulsa ✅ Sí o ❌ No.',

        CONFIRM_SOLVE: '¿Estás seguro de que quieres resolver?\nNo podrás volver a preguntar.',
        CONFIRM_SOLVE_NO: '👌 Volviendo a preguntas.',

        SOLVE_MODE_TITLE: '🕵️ Modo Solución',
        SOLVE_MODE_MSG: 'Tus siguientes mensajes serán tu versión.\nYa no se aceptan preguntas.\n\nEscribe en un mensaje:\nQuién → qué → cómo → por qué → cuándo.',

        LIMIT_REACHED: '❗ Límite de 10 preguntas alcanzado.\n¿Quieres 5 más?',
        LIMIT_EXTRA_YES: '✅ Genial. Tienes 5 preguntas más. Continúa.',

        MULTI_QUESTION_WARN: 'ℹ️ Responderé solo a la primera pregunta.',
        THIKING: '…pensando',

        ERR_LLM_CHECK: '⚠️ Error verificando. Intenta de nuevo.',
        ERR_LLM_BABE: '⚠️ Error de respuesta. Intenta reformular.',

        WIN_TITLE: '🏆 ¡Victoria!',
        WIN_TITLE_COND: '🥈 ¡Victoria Condicional!',
        LOSS_TITLE: '❌ Fallaste.',
        RESULT_META: (acc, q, score) => `Precisión: ${acc}%\nPreguntas: ${q}\nPuntuación: ${score}/10`,
        PLAY_AGAIN: '¿Jugar de nuevo? /start',
        GAME_FINISHED: 'Juego terminado. Reiniciar: /start',
        NOT_UNDERSTOOD: 'No entiendo. Inicia: /start',

        HELP_TEXT: `ℹ️ Ayuda

Interrogas a un sospechoso. Límite: 10 preguntas.
Después, puedes pedir 5 más o resolver.

Regla: una pregunta = un mensaje.
Botón "🕵️ Resolver" activa modo solución.`
    }
}

export const getLocale = (lang) => LOCALES[lang] || LOCALES.ru
