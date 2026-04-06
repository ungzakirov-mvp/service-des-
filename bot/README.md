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
