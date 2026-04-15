# 🎫 Service Desk - Premium Help Desk System

Production-ready Service Desk система с премиальным дизайном и полным функционалом.

![Status](https://img.shields.io/badge/status-production--ready-success)
![Version](https://img.shields.io/badge/version-2.0.0-blue)

## ✨ Возможности

### Backend
- ✅ JWT аутентификация с refresh токенами
- ✅ Bcrypt хеширование паролей
- ✅ CRUD операции для тикетов
- ✅ Система комментариев
- ✅ Фильтрация и пагинация
- ✅ Структурированное логирование
- ✅ Обработка ошибок
- ✅ OpenAPI документация (Swagger)
- ✅ CORS настроен
- ✅ PostgreSQL + SQLAlchemy ORM

### Frontend  
- ✅ Премиальный glassmorphism дизайн
- ✅ Темная тема с градиентами
- ✅ Анимированный фон
- ✅ Адаптивный дизайн
- ✅ Аутентификация (вход/регистрация)
- ✅ Dashboard со статистикой
- ✅ Управление тикетами
- ✅ Фильтры по статусу и приоритету
- ✅ Toast уведомления

## 🚀 Быстрый старт

### Требования
- Docker & Docker Compose
- Браузер (Chrome, Firefox, Safari)

### Запуск

```bash
cd service-desk
docker compose up --build -d
```

Подождите 30-60 секунд пока поднимутся контейнеры.

### Доступ к системе

- **Frontend**: Откройте `frontend/index.html` в браузере
- **Backend API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/

## 🎨 Дизайн

Премиальный дизайн вдохновлён современными SaaS платформами:
- **Glassmorphism** эффекты
- **Анимированный градиентный фон**
- **Плавные переходы и hover эффекты**
- **Тёмная тема** с акцентными цветами
- **Адаптивность** для всех устройств

## 📁 Структура проекта

```
service-desk/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py              # FastAPI app
│       ├── config.py            # Settings
│       ├── database.py          # DB connection
│       ├── models.py            # User, Ticket, Comment
│       ├── security.py          # JWT + password hashing
│       ├── dependencies.py      # Auth dependencies
│       ├── exceptions.py        # Custom exceptions
│       ├── logger.py            # Structured logging
│       └── routers/
│           ├── auth.py          # Authentication
│           ├── tickets.py       # Ticket CRUD
│           └── comments.py      # Comments
└── frontend/
    ├── index.html               # Main SPA
    ├── css/
    │   └── style.css            # Premium styles
    └── js/
        ├── api.js               # API client
        └── app.js               # Application logic
```

## 🔐 Безопасность

- ✅ **Bcrypt** для хеширования паролей
- ✅ **JWT** токены для аутентификации
- ✅ **CORS** защита
- ✅ **SQL Injection** защита через ORM
- ✅ **XSS** защита через escapeHtml
- ⚠️ **HTTPS**: Настройте в production

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/login/form` - OAuth2 вход

### Tickets
- `GET /api/tickets` - Список тикетов (с фильтрами)
- `POST /api/tickets/` - Создать тикет
- `GET /api/tickets/{id}` - Детали тикета
- `PATCH /api/tickets/{id}` - Обновить тикет
- `DELETE /api/tickets/{id}` - Удалить тикет

### Comments
- `POST /api/comments/` - Добавить комментарий
- `GET /api/comments/ticket/{id}` - Комментарии тикета

### Stats
- `GET /api/stats` - Статистика для dashboard

## 🧪 Тестирование

### Быстрый тест через Swagger

1. Откройте http://localhost:8000/docs
2. Используйте `/api/auth/register` для регистрации
3. Используйте `/api/auth/login/form` - нажмите Authorize
4. Тестируйте защищённые endpoints

### Тест через Frontend

1. Откройте `frontend/index.html`
2. Зарегистрируйтесь
3. Создайте тикет
4. Проверьте дашборд со статистикой

## 🛠️ Разработка

### Backend

```bash
cd backend

# Установить зависимости
pip install -r requirements.txt

# Запустить локально (без Docker)
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend

# Запустить простой HTTP сервер
python -m http.server 3000

# Откройте http://localhost:3000
```

## ⚙️ Конфигурация

Создайте `backend/.env` файл (см. `.env.example`):

```env
DATABASE_URL=postgresql://sd_user:sd_pass@db:5432/servicedesk
SECRET_KEY=your-secret-key-change-in-production-min-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
DEBUG=True
```

⚠️ **ВАЖНО**: Измените `SECRET_KEY` в production!

## 🔄 Что дальше

### Готово к релизу
- ✅ JWT аутентификация
- ✅ Password hashing
- ✅ Ticket system
- ✅ Premium frontend
- ✅ Docker setup

### Roadmap v2.1
- [ ] Alembic миграции
- [ ] Unit тесты (pytest)
- [ ] Rate limiting
- [ ] Email уведомления
- [ ] File uploads
- [ ] Multi-tenancy

### Roadmap v3.0
- [ ] Webhooks
- [ ] API versioning
- [ ] Monitoring (Prometheus)
- [ ] Admin панель
- [ ] Mobile app

## 📝 Лицензия

Commercial use allowed.

## 👨‍💻 Разработчики

Создано enterprise командой разработчиков.

---

**Статус**: Production Ready v2.0.0 🚀
