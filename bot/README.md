# Novum Tech Bot - Помощник для сбора товаров

## Описание

Бот автоматически собирает информацию о товарах из Telegram каналов поставщиков и публикует их в ваш канал и на сайт.

## Возможности

- 🤖 Автоматический мониторинг каналов поставщиков
- 💰 Извлечение цен из сообщений
- 📦 Сохранение товаров в базу данных
- 📢 Автопостинг в Telegram канал
- 🌐 Публикация на сайте

## Установка

### 1. Установите зависимости

```bash
cd bot
npm install
```

### 2. Создайте файл .env

```bash
cp .env.example .env
```

### 3. Заполните .env

```env
# Telegram
TELEGRAM_BOT_TOKEN=ваш_токен_бота
ADMIN_CHAT_ID=ваш_telegram_id
OUTPUT_CHANNEL_ID=id_вашего_канала

# Поставщики (ID каналов)
SUPPLIER_CHANNEL_1=-1001234567890
SUPPLIER_CHANNEL_2=-1009876543210

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

## Как получить токены

### Telegram Bot Token

1. Откройте @BotFather в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен

### Telegram Chat ID

1. Откройте @userinfobot
2. Получите свой ID
3. Для канала - добавьте бота админом и используйте @channelidbot

### Supabase

1. Создайте проект на supabase.com
2. Settings → API → скопируйте URL и keys

## Запуск

```bash
# Режим разработки
npm run dev

# Продакшн
npm start
```

## Команды бота

После добавления бота в Telegram:

| Команда | Описание |
|---------|----------|
| `/start` | Запуск бота |
| `/stats` | Статистика собранных товаров |
| `/post` | Опубликовать товары на канал |
| `/channels` | Список мониторимых каналов |

## Настройка базы данных

```bash
npm run setup-db
```

Или выполните SQL в Supabase Dashboard (Settings → SQL Editor):

```sql
CREATE TABLE products (...);
CREATE TABLE supplier_channels (...);
CREATE TABLE site_posts (...);
```

## Добавление каналов поставщиков

1. Добавьте бота админом в канал поставщика
2. Получите ID канала
3. Добавьте в .env: `SUPPLIER_CHANNEL_X=id_канала`

## Структура проекта

```
bot/
├── src/
│   ├── index.js          # Основной файл бота
│   └── setup-database.js # Настройка БД
├── .env.example          # Пример переменных
└── package.json
```

## Мониторинг

Бот логирует:
- Новые сообщения из каналов
- Найденные товары
- Ошибки сохранения/постинга
- Статистику работы

## Troubleshooting

### Бот не видит сообщения

- Проверьте, что бот добавлен в канал как админ
- Проверьте правильность ID канала

### Не сохраняются товары

- Проверьте подключение к Supabase
- Убедитесь, что таблицы созданы

### Бот не публикует в канал

- Проверьте, что бот добавлен в целевой канал
- Убедитесь, что OUTPUT_CHANNEL_ID правильный

## Разработка

```bash
# Линтер
npm run lint

# Тесты (если есть)
npm test
```

---

Создано для Novum Tech © 2026

---

## Lead Agent (поиск клиентов, Telegram + Email)

Автономный агент для поиска клиентов в Ташкенте и ведения воронки.

### Что умеет

- Ищет лиды через Google (через `SERPER_API_KEY`)
- Достаёт контакты (email/telegram/phone) с сайтов
- Складывает лиды в Supabase с оценкой (score)
- Ведёт статусы: `new -> contacted -> meeting -> proposal -> won/lost`
- Даёт готовые шаблоны сообщений для Telegram и Email
- Отправляет ежедневный отчёт в Telegram

### Быстрый запуск

1. Выполните SQL из `bot/sql/lead_agent.sql` в Supabase SQL Editor.
2. Добавьте в `.env`:

```env
TELEGRAM_BOT_TOKEN=...
ADMIN_CHAT_ID=8374898260
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SERPER_API_KEY=...
LEAD_CITY=Ташкент
DAILY_REPORT_CRON=0 9 * * *
DAILY_REPORT_TIMEZONE=Asia/Tashkent
```

3. Запустите агент:

```bash
cd bot
npm install
npm run start:leads
```

### Команды Lead Agent

- `/start` — показать команды
- `/scan 3` — автономно искать лиды (3 ниши)
- `/today` — топ лидов
- `/hot [n]` — горячие лиды (score 60+)
- `/next` — следующий лучший новый лид
- `/followups [n]` — кого дожимать сегодня
- `/batchpitch [n]` — пачка готовых сообщений
- `/plan [n]` — приоритетный план касаний на день
- `/crm` — сводка воронки и прогноз выручки
- `/pitch <id>` — шаблоны Telegram + Email под лид
- `/nudge <id>` — 3 варианта сообщения для первого/второго касания
- `/value <id> <сумма>` — задать ценность сделки для лида
- `/result <id> <interested|meeting|no_reply|not_now|wrong_contact|won|lost>` — быстрый результат по контакту
- `/status <id> <new|contacted|meeting|proposal|won|lost>`
- `/addlead Компания | сайт | email | telegram | телефон`
- `/autopilot` — запустить авто outreach прямо сейчас
- `/dnc <id> on|off` — запретить/разрешить контакт с лидом
- `/stats` — статистика воронки

### Anti-spam режим (важно)

По умолчанию стоит безопасный запуск:

- `OUTREACH_DRY_RUN=true` — письма не отправляются, только формируются задачи
- `MAX_DAILY_OUTREACH=8` — максимум касаний в день
- `MAX_OUTREACH_ATTEMPTS=3` — не больше 3 попыток на лид
- `MIN_CONTACT_INTERVAL_DAYS=7` — пауза 7 дней между касаниями

Когда будете готовы к реальной отправке email:

1. Установите `RESEND_API_KEY`
2. Поставьте `OUTREACH_DRY_RUN=false`

### После обновления агента

Если вы уже запускали SQL раньше, выполните `bot/sql/lead_agent.sql` ещё раз — он безопасно добавит новые поля (`industry`).
