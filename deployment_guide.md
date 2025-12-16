# 🚀 Руководство по развертыванию Telegram Detective Bot

Это руководство предполагает, что у вас есть Linux-сервер (например, Ubuntu) и вы вошли в систему через SSH.

## 1. Обновление системы и установка Git/Node.js

Стандартная настройка для Ubuntu/Debian:

```bash
# Обновление списка пакетов
sudo apt update && sudo apt upgrade -y

# Установка Git и Curl
sudo apt install -y git curl

# Установка Node.js (рекомендуется версия 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка установки
node -v
npm -v
```

## 2. Установка менеджера процессов (PM2)

PM2 помогает поддерживать работу вашего бота 24/7.

```bash
sudo npm install -g pm2
```

## 3. Клонирование репозитория (через SSH)

GitHub требует SSH-ключи для безопасного доступа.

1.  **Создайте SSH-ключ на сервере** (если его нет):
    ```bash
    ssh-keygen -t ed25519 -C "bot_deploy"
    # Нажимайте Enter, чтобы принять настройки по умолчанию (без пароля)
    ```

2.  **Посмотрите ваш публичный ключ**:
    ```bash
    cat ~/.ssh/id_ed25519.pub
    ```
    Скопируйте вывод (строка начинается с `ssh-ed25519`).

3.  **Добавьте ключ в GitHub**:
    *   Откройте настройки репозитория (или вашего профиля) на GitHub.
    *   Перейдите в **Settings** -> **Deploy keys** (для репозитория) или **SSH and GPG keys** (для профиля).
    *   Нажмите **Add key**, вставьте скопированный ключ и сохраните.

4.  **Склонируйте репозиторий**:
    ```bash
    git clone git@github.com:IdzumIVlad/telegramDetectiveBot.git
    cd telegramDetectiveBot
    ```

## 4. Установка зависимостей

```bash
npm install
```

## 5. Настройка переменных окружения

1.  **Создание файла .env**:
    ```bash
    cp .env.example .env
    nano .env
    ```
2.  **Вставка ваших секретных ключей**:
    Заполните `BOT_TOKEN`, `OPENAI_API_KEY` и т.д.
    Нажмите `Ctrl+O` -> `Enter` для сохранения, затем `Ctrl+X` для выхода.

3.  **Загрузка credentials.json**:
    Вам нужно перенести файл `credentials.json` с вашего локального компьютера на сервер.
    *В терминале вашего локального компьютера (не в SSH сервера)*:
    ```bash
    scp path/to/your/credentials.json user@your_server_ip:/path/to/telegramDetectiveBot/
    ```
    *Либо вставьте содержимое в файл на сервере:*
    ```bash
    nano credentials.json
    # Вставьте содержимое, Сохраните и Выйдите
    ```

## 6. Запуск бота

Используйте включенный файл `ecosystem.config.cjs` для запуска бота.

```bash
# Запуск с помощью PM2
pm2 start ecosystem.config.cjs

# Сохранение списка процессов для автозапуска при перезагрузке
pm2 save

# Генерация скрипта автозапуска (скопируйте/вставьте команду из вывода)
pm2 startup
```

## 7. Полезные команды для управления

-   **Просмотр логов**: `pm2 logs detective-bot`
-   **Перезапуск**: `pm2 restart detective-bot`
-   **Остановка**: `pm2 stop detective-bot`
-   **Мониторинг**: `pm2 monit`
