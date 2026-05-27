"""
Telegram Client Bot (@tickets_novum_bot)

Клиентский бот для создания и отслеживания заявок:
- /start — приветствие + клавиатура
- /new — создать заявку (тема → описание → приоритет)
- /status — статус последней заявки
- /mytickets — список заявок
- Свободный текст — быстрая заявка (средний приоритет)
- Ответ на сообщение — комментарий к заявке
- ⭐ Кнопки оценки при решении заявки
"""
import os
import re
import asyncio
from typing import Optional
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, CommandStart
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.storage.base import BaseStorage, StorageKey
from aiogram.fsm.state import State, StatesGroup


class CompatMemoryStorage(BaseStorage):
    """MemoryStorage совместимый с aiogram 3.27 (исправляет проблему с ключевыми аргументами)"""
    def __init__(self):
        self.storage: dict[StorageKey, dict] = {}

    def _resolve_key(self, key=None, **kwargs):
        if isinstance(key, StorageKey):
            return key
        return StorageKey(
            bot_id=kwargs.get("bot_id", 0),
            chat_id=kwargs.get("chat", 0) or kwargs.get("chat_id", 0),
            user_id=kwargs.get("user", 0) or kwargs.get("user_id", 0),
        )

    async def set_data(self, key=None, data=None, **kwargs):
        k = self._resolve_key(key, **kwargs)
        self.storage.setdefault(k, {}).update(data or {})

    async def get_data(self, key=None, **kwargs):
        k = self._resolve_key(key, **kwargs)
        return self.storage.get(k, {}).copy()

    async def set_state(self, key=None, state=None, **kwargs):
        k = self._resolve_key(key, **kwargs)
        self.storage.setdefault(k, {})["__state__"] = state

    async def get_state(self, key=None, **kwargs):
        k = self._resolve_key(key, **kwargs)
        return self.storage.get(k, {}).get("__state__")

    async def close(self):
        self.storage.clear()
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import SessionLocal
from app.models import (
    User, Ticket, TicketStatus, Tenant, UserRole,
    TimelineEventType, TicketTimeline, Company
)
from app.security import hash_password, verify_password
from app.services.routing_service import find_best_agent
from app.sla import calculate_sla_due_date
from app.config import settings
import structlog

logger = structlog.get_logger()

CLIENT_TOKEN = settings.TELEGRAM_CLIENT_BOT_TOKEN or os.getenv("TELEGRAM_CLIENT_BOT_TOKEN")
if CLIENT_TOKEN:
    client_bot = Bot(token=CLIENT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    client_dp = Dispatcher(storage=CompatMemoryStorage())
else:
    print("⚠️  TELEGRAM_CLIENT_BOT_TOKEN not set — Client bot disabled.")
    client_bot = None
    client_dp = None

from datetime import datetime, timezone, timedelta

TASHKENT_TZ = timezone(timedelta(hours=5))

def tashkent_time(dt):
    """Convert UTC datetime to Tashkent time (UTC+5)"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(TASHKENT_TZ)


PRIORITY_EMOJI = {"low": "🟢", "medium": "🟡", "high": "🟠", "critical": "🔴"}
PRIORITY_NAMES = {"low": "Низкий", "medium": "Средний", "high": "Высокий", "critical": "Критичный"}
STATUS_EMOJI = {"Новый": "🆕", "В работе": "🔧", "Ожидает клиента": "⏳", "Решён": "✅", "Закрыт": "🔒"}


class TicketCreation(StatesGroup):
    waiting_for_title = State()
    waiting_for_description = State()
    waiting_for_priority = State()


def main_menu_kb():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📝 Новая заявка"), KeyboardButton(text="📋 Мои заявки")],
            [KeyboardButton(text="📊 Статус"), KeyboardButton(text="❓ Помощь")]
        ],
        resize_keyboard=True,
        input_field_placeholder="Выберите действие..."
    )


def priority_kb():
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🟢 Низкий", callback_data="cpri_low"),
            InlineKeyboardButton(text="🟡 Средний", callback_data="cpri_medium"),
        ],
        [
            InlineKeyboardButton(text="🟠 Высокий", callback_data="cpri_high"),
            InlineKeyboardButton(text="🔴 Критичный", callback_data="cpri_critical"),
        ],
    ])


def rating_kb(ticket_id: int):
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="⭐", callback_data=f"crate_{ticket_id}_1"),
            InlineKeyboardButton(text="⭐⭐", callback_data=f"crate_{ticket_id}_2"),
            InlineKeyboardButton(text="⭐⭐⭐", callback_data=f"crate_{ticket_id}_3"),
            InlineKeyboardButton(text="⭐⭐⭐⭐", callback_data=f"crate_{ticket_id}_4"),
            InlineKeyboardButton(text="⭐⭐⭐⭐⭐", callback_data=f"crate_{ticket_id}_5"),
        ],
        [
            InlineKeyboardButton(text="✅ Закрыть без оценки", callback_data=f"cclose_{ticket_id}"),
        ]
    ])


def get_default_tenant(db: Session) -> Optional[Tenant]:
    tenant = db.query(Tenant).filter(Tenant.slug == "novum").first()
    if not tenant:
        tenant = db.query(Tenant).first()
    return tenant


def get_or_create_client(chat_id: str, full_name: str, username: str) -> int:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
        if user:
            return user.id
        tenant = get_default_tenant(db)
        if not tenant:
            tenant = Tenant(name="Novum Tech", slug="novum", domain="novumtech.uz", is_active=True)
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
        company = db.query(Company).filter(Company.tenant_id == tenant.id).first()
        email = f"tg_{chat_id}@client.novumtech.uz"
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            existing.telegram_chat_id = chat_id
            if full_name and not existing.full_name:
                existing.full_name = full_name
            db.commit()
            logger.info("tg_client_relinked", user_id=existing.id, chat_id=chat_id)
            return existing.id
        new_user = User(
            tenant_id=tenant.id,
            email=email,
            password=hash_password("tg_user_no_login"),
            full_name=full_name or username or f"TG User {chat_id}",
            role=UserRole.CLIENT,
            telegram_chat_id=chat_id,
            company_id=company.id if company else None
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info("tg_client_created", user_id=new_user.id, chat_id=chat_id)
        return new_user.id
    finally:
        db.close()


def get_user_by_chat_id(db: Session, chat_id: str) -> Optional[User]:
    return db.query(User).filter(User.telegram_chat_id == chat_id).first()


def format_ticket(ticket, db: Session) -> str:
    status = db.query(TicketStatus).filter(TicketStatus.id == ticket.status_id).first()
    sn = status.name if status else "?"
    se = STATUS_EMOJI.get(sn, "📋")
    pe = PRIORITY_EMOJI.get(ticket.priority, "⚪")
    pn = PRIORITY_NAMES.get(ticket.priority, ticket.priority)
    msg = f"{se} <b>Заявка #{ticket.readable_id}</b>\n\n"
    msg += f"📌 <b>Тема:</b> {ticket.title}\n"
    msg += f"{pe} <b>Приоритет:</b> {pn}\n"
    msg += f"📊 <b>Статус:</b> {sn}\n"
    if ticket.assigned_to:
        assignee = db.query(User).filter(User.id == ticket.assigned_to).first()
        if assignee:
            msg += f"👤 <b>Исполнитель:</b> {assignee.full_name or assignee.email}\n"
    if ticket.created_at:
        msg += f"📅 <b>Создан:</b> {tashkent_time(ticket.created_at).strftime('%d.%m.%Y %H:%M')}\n"
    if ticket.rating:
        msg += f"{'⭐' * ticket.rating} <b>Оценка:</b> {ticket.rating}/5\n"
    return msg


# ─── Handlers ───

if client_dp:

    @client_dp.message(CommandStart())
    async def cmd_start(message: types.Message, state: FSMContext):
        await state.clear()
        chat_id = str(message.chat.id)
        db = SessionLocal()
        try:
            user = get_user_by_chat_id(db, chat_id)
            if user:
                name = user.full_name or user.email
                await message.answer(
                    f"С возвращением, <b>{name}</b>! 👋\n\nВыберите действие:",
                    reply_markup=main_menu_kb()
                )
            else:
                await message.answer(
                    "Здравствуйте! 👋\n\n"
                    "Я — бот Service Desk <b>Novum Tech</b>.\n"
                    "Здесь вы можете создавать и отслеживать заявки.\n\n"
                    "🔐 <b>Привязать аккаунт</b> — если у вас уже есть логин и пароль:\n"
                    "   <code>/login email пароль</code>\n\n"
                    "📝 <b>Или просто напишите текст</b> — заявка создастся автоматически.\n"
                    "   (будет сгенерирован временный аккаунт)",
                    reply_markup=main_menu_kb()
                )
        finally:
            db.close()

    @client_dp.message(Command("login"))
    async def cmd_login(message: types.Message):
        """Привязка аккаунта: /login email пароль"""
        parts = message.text.split(maxsplit=2)
        if len(parts) < 3:
            await message.answer(
                "🔐 <b>Привязка аккаунта</b>\n\n"
                "Формат: <code>/login email пароль</code>\n\n"
                "Пример: <code>/login ivan@mail.ru mypassword</code>\n\n"
                "После привязки вы сможете создавать заявки от имени своей учётной записи.\n"
                "Либо просто напишите текст — заявка создастся автоматически."
            )
            return
        email_addr, password = parts[1], parts[2]
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == email_addr).first()
            if not user or not verify_password(password, user.password):
                await message.answer("❌ Неверный email или пароль.")
                return
            user.telegram_chat_id = str(message.chat.id)
            db.commit()
            await message.answer(
                f"✅ <b>Аккаунт привязан!</b>\n\n"
                f"👤 <b>{user.full_name or user.email}</b>\n\n"
                f"Теперь вы можете создавать и отслеживать заявки.",
                reply_markup=main_menu_kb()
            )
            try:
                await message.delete()
            except Exception:
                pass
        except Exception as e:
            await message.answer(f"❌ Ошибка: {e}")
        finally:
            db.close()

    @client_dp.message(Command("logout"))
    async def cmd_logout(message: types.Message):
        chat_id = str(message.chat.id)
        db = SessionLocal()
        try:
            user = get_user_by_chat_id(db, chat_id)
            if not user:
                await message.answer("❌ Аккаунт не привязан.")
                return
            user.telegram_chat_id = None
            db.commit()
            await message.answer(
                "✅ <b>Аккаунт отвязан.</b>\n\n"
                "Чтобы привязать другой аккаунт:\n"
                "<code>/login email пароль</code>",
                reply_markup=main_menu_kb()
            )
        except Exception as e:
            await message.answer(f"❌ Ошибка: {e}")
        finally:
            db.close()

    @client_dp.message(Command("new"))
    async def cmd_new(message: types.Message, state: FSMContext):
        await state.set_state(TicketCreation.waiting_for_title)
        await message.answer(
            "📝 <b>Создание заявки</b> — Шаг 1/3\n\n"
            "Введите <b>тему заявки</b> (краткое описание):\n\n"
            '<i>Например: "Не работает Wi-Fi на 3 этаже"</i>\n\n'
            "Для отмены: /cancel",
            reply_markup=types.ReplyKeyboardRemove()
        )

    @client_dp.message(Command("cancel"))
    async def cmd_cancel(message: types.Message, state: FSMContext):
        await state.clear()
        await message.answer("❌ Отменено.", reply_markup=main_menu_kb())

    @client_dp.message(Command("status"))
    async def cmd_status(message: types.Message):
        db = SessionLocal()
        try:
            user = get_user_by_chat_id(db, str(message.chat.id))
            if not user:
                await message.answer("❌ Вы ещё не привязаны. Напишите описание проблемы для создания заявки.", reply_markup=main_menu_kb())
                return
            ticket = db.query(Ticket).filter(Ticket.created_by == user.id).order_by(desc(Ticket.created_at)).first()
            if not ticket:
                await message.answer("📭 Нет заявок.", reply_markup=main_menu_kb())
                return
            msg = format_ticket(ticket, db)
            if ticket.status_rel and ticket.status_rel.name in ("Решён", "Ожидает клиента") and not ticket.rating:
                await message.answer(msg, reply_markup=rating_kb(ticket.id))
            else:
                await message.answer(msg, reply_markup=main_menu_kb())
        finally:
            db.close()

    @client_dp.message(Command("mytickets"))
    async def cmd_mytickets(message: types.Message):
        db = SessionLocal()
        try:
            user = get_user_by_chat_id(db, str(message.chat.id))
            if not user:
                await message.answer("❌ Вы ещё не привязаны.", reply_markup=main_menu_kb())
                return
            tickets = db.query(Ticket).filter(Ticket.created_by == user.id).order_by(desc(Ticket.created_at)).limit(10).all()
            if not tickets:
                await message.answer("📭 Нет заявок.", reply_markup=main_menu_kb())
                return
            msg = "📋 <b>Ваши заявки:</b>\n\n"
            for t in tickets:
                s = db.query(TicketStatus).filter(TicketStatus.id == t.status_id).first()
                sn = s.name if s else "?"
                se = STATUS_EMOJI.get(sn, "📋")
                pe = PRIORITY_EMOJI.get(t.priority, "⚪")
                msg += f"{se} {pe} <b>#{t.readable_id}</b> — {t.title[:40]}\n"
                msg += f"     {sn}\n\n"
            await message.answer(msg, reply_markup=main_menu_kb())
        finally:
            db.close()

    @client_dp.message(Command("help"))
    async def cmd_help(message: types.Message):
        await message.answer(
            "🆘 <b>Помощь</b>\n\n"
            "📝 <b>Новая заявка</b> — напишите текст или нажмите «Новая заявка»\n"
            "📋 <b>Мои заявки</b> — список\n"
            "📊 <b>Статус</b> — последняя заявка\n\n"
            "🔐 <b>Привязать аккаунт:</b> <code>/login email пароль</code>\n"
            "🚪 <b>Отвязать аккаунт:</b> /logout"
        )

    # ─── FSM Steps ───
    @client_dp.message(TicketCreation.waiting_for_title, F.text)
    async def process_title(message: types.Message, state: FSMContext):
        if len(message.text) < 3:
            await message.answer("❌ Минимум 3 символа:")
            return
        await state.update_data(title=message.text)
        await state.set_state(TicketCreation.waiting_for_description)
        await message.answer(f"✅ Тема: <b>{message.text}</b>\n\nШаг 2/3: Опишите проблему подробнее:")

    @client_dp.message(TicketCreation.waiting_for_description, F.text)
    async def process_description(message: types.Message, state: FSMContext):
        if message.text.strip() == "-":
            await state.update_data(description="")
            await state.set_state(TicketCreation.waiting_for_priority)
            await message.answer("✅ Описание пропущено!\n\nШаг 3/3: Выберите приоритет:", reply_markup=priority_kb())
            return
        if len(message.text) < 5:
            await message.answer("❌ Минимум 5 символов:")
            return
        await state.update_data(description=message.text)
        await state.set_state(TicketCreation.waiting_for_priority)
        await message.answer("✅ Описание принято!\n\nШаг 3/3: Выберите приоритет:", reply_markup=priority_kb())

    @client_dp.callback_query(TicketCreation.waiting_for_priority, F.data.startswith("cpri_"))
    async def process_priority(callback: types.CallbackQuery, state: FSMContext):
        priority = callback.data.replace("cpri_", "")
        data = await state.get_data()
        title = data.get("title", "")
        description = data.get("description", "")
        await state.clear()

        chat_id = str(callback.message.chat.id)
        client_id = get_or_create_client(chat_id=chat_id, full_name=callback.from_user.full_name, username=callback.from_user.username or "")

        db = SessionLocal()
        try:
            client = db.query(User).filter(User.id == client_id).first()
            tenant = get_default_tenant(db)
            if not tenant:
                await callback.message.answer("❌ Ошибка системы.", reply_markup=main_menu_kb())
                return
            status = db.query(TicketStatus).filter(TicketStatus.tenant_id == tenant.id).order_by(TicketStatus.order).first()
            if not status:
                await callback.message.answer("❌ Ошибка системы.", reply_markup=main_menu_kb())
                return
            last_ticket = db.query(Ticket).filter(Ticket.tenant_id == tenant.id).order_by(desc(Ticket.readable_id)).first()
            readable_id = (last_ticket.readable_id + 1) if last_ticket and last_ticket.readable_id else 1001
            assigned_to = None
            sla_due = calculate_sla_due_date(priority)
            ticket = Ticket(
                tenant_id=tenant.id, readable_id=readable_id, title=title, description=description,
                status_id=status.id, priority=priority, created_by=client.id,
                company_id=client.company_id, assigned_to=assigned_to, sla_due_at=sla_due
            )
            db.add(ticket)
            db.commit()
            db.refresh(ticket)
            db.add(TicketTimeline(ticket_id=ticket.id, user_id=client.id, event_type=TimelineEventType.create, content=description))
            db.commit()

            pe = PRIORITY_EMOJI.get(priority, "⚪")
            msg = f"✅ <b>Заявка #{ticket.readable_id} создана!</b>\n\n"
            msg += f"📌 <b>Тема:</b> {title}\n"
            msg += f"{pe} <b>Приоритет:</b> {PRIORITY_NAMES.get(priority, priority)}\n"
            if assigned_to:
                agent = db.query(User).filter(User.id == assigned_to).first()
                if agent:
                    msg += f"👤 <b>Исполнитель:</b> {agent.full_name or agent.email}\n"
            msg += f"\n📊 /status  |  📋 /mytickets"

            await callback.message.answer(msg, reply_markup=main_menu_kb())
            from app.telegram_agent_bot import notify_agent_new_ticket
            notify_agent = db.query(User).filter(
                User.tenant_id == tenant.id,
                User.role.in_([UserRole.AGENT, UserRole.ADMIN])
            ).first()
            if notify_agent:
                company_name = None
                company_color = None
                if client.company_id:
                    c = db.query(Company).filter(Company.id == client.company_id).first()
                    if c:
                        company_name = c.name
                        company_color = c.color or "#0066CC"
                await notify_agent_new_ticket(agent_id=notify_agent.id, ticket_id=ticket.id, readable_id=ticket.readable_id, title=title, client_name=client.full_name, priority=priority, description=description, company_name=company_name, company_color=company_color)
            logger.info("tg_client_ticket_created", ticket_id=ticket.id, priority=priority)
        except Exception as e:
            await callback.message.answer("❌ Ошибка создания заявки.", reply_markup=main_menu_kb())
            logger.error("tg_client_create_error", error=str(e))
        finally:
            db.close()

    # ─── Rating ───
    @client_dp.callback_query(F.data.startswith("crate_"))
    async def process_rating(callback: types.CallbackQuery):
        parts = callback.data.split("_")
        if len(parts) != 3:
            await callback.answer("Ошибка")
            return
        ticket_id, rating = int(parts[1]), int(parts[2])
        db = SessionLocal()
        try:
            ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
            if not ticket:
                await callback.answer("Заявка не найдена")
                return
            from app.models import TicketRating
            existing_rating = db.query(TicketRating).filter(TicketRating.ticket_id == ticket.id).first()
            if existing_rating:
                existing_rating.rating = rating
            else:
                db.add(TicketRating(tenant_id=ticket.tenant_id, ticket_id=ticket.id, rating=rating))
            from sqlalchemy import update as sql_update
            db.execute(sql_update(Ticket).where(Ticket.id == ticket.id).values(rating=rating))
            db.flush()
            # Auto-close if currently resolved
            status_name = ticket.status_rel.name if ticket.status_rel else ""
            if status_name in ("Решён", "Ожидает клиента"):
                closed = db.query(TicketStatus).filter(
                    TicketStatus.tenant_id == ticket.tenant_id,
                    TicketStatus.is_final == True
                ).first()
                if not closed:
                    closed = db.query(TicketStatus).filter(
                        TicketStatus.tenant_id == ticket.tenant_id
                    ).order_by(TicketStatus.order.desc()).first()
                if closed:
                    ticket.status_id = closed.id
                    ticket.closed_by = ticket.created_by
                    db.add(TicketTimeline(ticket_id=ticket.id, user_id=ticket.created_by, event_type="STATUS_CHANGE",
                        content=f"Тикет закрыт клиентом после оценки"))
            db.commit()
            await callback.message.edit_text(f"{callback.message.text}\n\n{'⭐' * rating} <b>Спасибо за оценку: {rating}/5!</b>\n✅ Заявка закрыта.")
            await callback.answer(f"Оценка {rating}/5 принята! Заявка закрыта.")
            from app.telegram_agent_bot import notify_agent_new_comment
            if ticket.assigned_to:
                await notify_agent_new_comment(ticket.assigned_to, ticket.readable_id or ticket.id, "Клиент", f"Оценил на {rating}/5 и закрыл заявку")
        except Exception as e:
            await callback.answer("Ошибка")
            logger.error("tg_rating_error", error=str(e))
        finally:
            db.close()

    # ─── Close ticket callback ───
    @client_dp.callback_query(F.data.startswith("cclose_"))
    async def process_close_ticket(callback: types.CallbackQuery):
        ticket_id = int(callback.data.replace("cclose_", ""))
        db = SessionLocal()
        try:
            ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
            if not ticket:
                await callback.answer("Заявка не найдена")
                return
            closed = db.query(TicketStatus).filter(
                TicketStatus.tenant_id == ticket.tenant_id,
                TicketStatus.is_final == True
            ).first()
            if not closed:
                closed = db.query(TicketStatus).filter(
                    TicketStatus.tenant_id == ticket.tenant_id
                ).order_by(TicketStatus.order.desc()).first()
            if not closed:
                await callback.answer("Нет финального статуса")
                return
            ticket.status_id = closed.id
            ticket.closed_by = ticket.created_by
            db.add(TicketTimeline(ticket_id=ticket.id, user_id=ticket.created_by, event_type="STATUS_CHANGE",
                content=f"Тикет закрыт клиентом"))
            db.commit()
            await callback.message.edit_text(
                f"{callback.message.text}\n\n✅ <b>Заявка #{ticket.readable_id} закрыта.</b>",
                reply_markup=None
            )
            await callback.answer("✅ Заявка закрыта!")
        except Exception as e:
            await callback.answer("Ошибка")
            logger.error("tg_close_error", error=str(e))
        finally:
            db.close()

    # ─── Reply = Comment ───
    @client_dp.message(F.reply_to_message & F.text & ~F.text.startswith('/'))
    async def handle_reply(message: types.Message):
        chat_id = str(message.chat.id)
        reply_text = message.reply_to_message.text or ""
        match = re.search(r'#(\d+)', reply_text)
        if not match:
            await message.answer("⚠️ Ответьте на сообщение с номером заявки (#123).")
            return
        readable_id = int(match.group(1))
        db = SessionLocal()
        try:
            user = get_user_by_chat_id(db, chat_id)
            if not user:
                await message.answer("❌ Отправьте /start для начала.", reply_markup=main_menu_kb())
                return
            tenant = get_default_tenant(db)
            ticket = db.query(Ticket).filter(Ticket.readable_id == readable_id, Ticket.tenant_id == tenant.id if tenant else True).first()
            if not ticket:
                await message.answer(f"❌ Заявка #{readable_id} не найдена.")
                return
            db.add(TicketTimeline(ticket_id=ticket.id, user_id=user.id, event_type=TimelineEventType.COMMENT, content=message.text))
            db.commit()
            await message.answer(f"✅ Комментарий добавлен к #{readable_id}.", reply_markup=main_menu_kb())
            if ticket.assigned_to:
                from app.telegram_agent_bot import notify_agent_new_comment
                await notify_agent_new_comment(agent_id=ticket.assigned_to, ticket_readable_id=readable_id, commenter_name=user.full_name or user.email, comment_text=message.text)
        except Exception as e:
            await message.answer(f"❌ Ошибка: {e}")
        finally:
            db.close()

    # ─── Menu Buttons ───
    @client_dp.message(F.text == "📝 Новая заявка")
    async def menu_new(message: types.Message, state: FSMContext):
        await cmd_new(message, state)

    @client_dp.message(F.text == "📋 Мои заявки")
    async def menu_tickets(message: types.Message):
        await cmd_mytickets(message)

    @client_dp.message(F.text == "📊 Статус")
    async def menu_status(message: types.Message):
        await cmd_status(message)

    @client_dp.message(F.text == "❓ Помощь")
    async def menu_help(message: types.Message):
        await cmd_help(message)

    # ─── Free text = start FSM flow ───
    @client_dp.message(F.text & ~F.text.startswith('/'))
    async def quick_ticket(message: types.Message, state: FSMContext):
        current_state = await state.get_state()
        if current_state is not None:
            return
        text = message.text.strip()
        if len(text) < 3:
            return
        # Start FSM: use text as title, ask for description
        await state.update_data(title=text)
        await state.set_state(TicketCreation.waiting_for_description)
        await message.answer(
            f"✅ Тема: <b>{text}</b>\n\n"
            "Шаг 2/3: Опишите проблему подробнее (или отправьте «-» чтобы пропустить):"
        )
async def start_client_polling():
    if client_bot and client_dp:
        print("🤖 Starting Client Telegram Bot (@tickets_novum_bot)...")
        try:
            await client_dp.start_polling(client_bot)
        except Exception as e:
            print(f"Client Bot Error: {e}")
    else:
        print("⚠️  Client Telegram Bot not started (token missing)")