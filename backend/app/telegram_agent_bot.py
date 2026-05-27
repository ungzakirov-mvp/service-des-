"""
Telegram Agent Bot (@agent_novum_bot)

Агентский бот для уведомлений и управления заявками:
- Уведомления о новых заявках
- Уведомления о комментариях клиентов
- Кнопки: Принять / Завершить / Комментарий
- /start, /my, /all — просмотр заявок
"""
import os
import re
from typing import Optional
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, CommandStart
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton
from aiogram.fsm.storage.base import BaseStorage, StorageKey
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup


class CompatMemoryStorage(BaseStorage):
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
    TimelineEventType, TicketTimeline
)
from app.security import verify_password
from app.config import settings
import structlog

logger = structlog.get_logger()

AGENT_TOKEN = settings.TELEGRAM_AGENT_BOT_TOKEN or os.getenv("TELEGRAM_AGENT_BOT_TOKEN")
if AGENT_TOKEN:
    agent_bot = Bot(token=AGENT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    agent_dp = Dispatcher(storage=CompatMemoryStorage())
else:
    print("⚠️  TELEGRAM_AGENT_BOT_TOKEN not set — Agent bot disabled.")
    agent_bot = None
    agent_dp = None

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

HEX_COLOR_MAP = {
    "#0066CC": "🔵", "#007BFF": "🔵", "#0000FF": "🔵", "#1E90FF": "🔵",
    "#FF0000": "🔴", "#DC143C": "🔴", "#FF4500": "🟠",
    "#FFA500": "🟠", "#FF8C00": "🟠",
    "#FFD700": "🟡", "#FFC107": "🟡", "#FFFF00": "🟡",
    "#008000": "🟢", "#28A745": "🟢", "#32CD32": "🟢", "#00FF00": "🟢",
    "#800080": "🟣", "#6F42C1": "🟣", "#9B59B6": "🟣",
    "#000000": "⚫", "#333333": "⚫", "#555555": "⚫",
    "#FFFFFF": "⚪", "#F5F5F5": "⚪", "#DDDDDD": "⚪",
    "#FF69B4": "🩷", "#FF1493": "🩷",
    "#A0522D": "🟤", "#8B4513": "🟤",
}

def hex_to_emoji(hex_color: str) -> str:
    if not hex_color:
        return "🏢"
    h = hex_color.strip().upper()
    for key, emoji in HEX_COLOR_MAP.items():
        if h == key:
            return emoji
    try:
        r, g, b = int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)
        if r > 200 and g < 100 and b < 100:
            return "🔴"
        if r > 200 and g > 100 and b < 80:
            return "🟠"
        if r > 200 and g > 180 and b < 80:
            return "🟡"
        if g > 180 and r < 150 and b < 150:
            return "🟢"
        if b > 180 and r < 150 and g < 150:
            return "🔵"
        if r > 150 and g < 100 and b > 150:
            return "🟣"
        if r < 80 and g < 80 and b < 80:
            return "⚫"
        if r > 200 and g > 200 and b > 200:
            return "⚪"
    except Exception:
        pass
    return "🏢"


def get_default_tenant(db: Session) -> Optional[Tenant]:
    tenant = db.query(Tenant).filter(Tenant.slug == "novum").first()
    if not tenant:
        tenant = db.query(Tenant).first()
    return tenant


def agent_menu_kb():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📋 Мои заявки"), KeyboardButton(text="📊 Все заявки")],
            [KeyboardButton(text="🔧 Статус"), KeyboardButton(text="❓ Помощь")]
        ],
        resize_keyboard=True,
        input_field_placeholder="Выберите действие..."
    )


def ticket_action_kb(ticket_id: int, status_name: str, assigned_to_id: int = None, current_agent_id: int = None) -> InlineKeyboardMarkup:
    buttons = []
    if status_name == "Новый":
        buttons.append([InlineKeyboardButton(text="✅ Принять", callback_data=f"aaccept_{ticket_id}")])
    elif status_name == "В работе":
        # Показать кнопку завершения только агенту, за которым закреплена заявка
        if assigned_to_id is None or assigned_to_id == current_agent_id:
            buttons.append([InlineKeyboardButton(text="✔️ Завершить", callback_data=f"aresolve_{ticket_id}")])
    if status_name in ("Ожидает клиента", "Закрыт"):
        buttons.append([InlineKeyboardButton(text="🔄 Переоткрыть", callback_data=f"areopen_{ticket_id}")])
    buttons.append([InlineKeyboardButton(text="💬 Комментарий", callback_data=f"acomment_{ticket_id}")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


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
    if ticket.description and len(ticket.description) > 200:
        msg += f"📝 <b>Описание:</b> {ticket.description[:200]}...\n"
    elif ticket.description:
        msg += f"📝 <b>Описание:</b> {ticket.description}\n"
    if ticket.assigned_to:
        ass = db.query(User).filter(User.id == ticket.assigned_to).first()
        if ass:
            msg += f"👤 <b>Исполнитель:</b> {ass.full_name or ass.email}\n"
    if ticket.created_by:
        cr = db.query(User).filter(User.id == ticket.created_by).first()
        if cr:
            msg += f"🙋 <b>Клиент:</b> {cr.full_name or cr.email}\n"
    if ticket.created_at:
        msg += f"📅 <b>Создан:</b> {tashkent_time(ticket.created_at).strftime('%d.%m.%Y %H:%M')}\n"
    return msg


# ─── Notification Functions (called from other modules) ───

async def notify_agent_new_ticket(agent_id: int, ticket_id: int, readable_id: int, title: str, client_name: str = None, priority: str = "medium", description: str = None, company_name: str = None, company_color: str = None):
    """Broadcast new ticket notification to ALL linked agents/admins in the tenant, not just the assigned one."""
    db = SessionLocal()
    try:
        assigned_agent = db.query(User).filter(User.id == agent_id).first()
        tenant_id = assigned_agent.tenant_id if assigned_agent else None

        # Get ALL agents/admins with linked Telegram in this tenant
        recipients = db.query(User).filter(
            User.tenant_id == tenant_id,
            User.role.in_([UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
            User.telegram_chat_id.isnot(None),
            User.telegram_chat_id != ""
        ).all()

        if not recipients:
            logger.warning("tg_no_agents_linked", tenant_id=tenant_id)
            return

        pe = PRIORITY_EMOJI.get(priority, "⚪")
        org_emoji = hex_to_emoji(company_color) if company_color else "🏢"
        msg = f"🔔 <b>Новая заявка #{readable_id}</b>\n\n"
        if company_name:
            msg += f"{org_emoji} <b>Организация:</b> {company_name}\n"
        if client_name:
            msg += f"🙋 <b>Заявитель:</b> {client_name}\n"
        msg += f"📌 <b>Тема:</b> {title}\n"
        if description:
            ds = (description[:300] + '...') if len(description) > 300 else description
            msg += f"📝 <b>Проблема:</b> {ds}\n"
        msg += f"{pe} <b>Приоритет:</b> {PRIORITY_NAMES.get(priority, priority)}\n"

        # Если заявка уже закреплена, не показывать кнопку Принять другим
        ticket_assigned = None
        from app.models import Ticket as TicketModel
        ticket_obj = db.query(TicketModel).filter(TicketModel.id == ticket_id).first()
        if ticket_obj:
            ticket_assigned = ticket_obj.assigned_to

        if agent_bot:
            for recipient in recipients:
                try:
                    # Если заявка уже закреплена за агентом — кнопка "Принять" не показывается
                    if ticket_assigned and ticket_assigned != recipient.id:
                        recipient_kb = InlineKeyboardMarkup(inline_keyboard=[[
                            InlineKeyboardButton(text="👀 Подробнее", callback_data=f"aview_{ticket_id}")
                        ]])
                        msg_with_lock = msg + f"\n🔒 <i>Заявка уже закреплена за агентом</i>"
                        await agent_bot.send_message(chat_id=recipient.telegram_chat_id, text=msg_with_lock, reply_markup=recipient_kb)
                    else:
                        kb = InlineKeyboardMarkup(inline_keyboard=[[
                            InlineKeyboardButton(text="✅ Принять", callback_data=f"aaccept_{ticket_id}"),
                            InlineKeyboardButton(text="👀 Подробнее", callback_data=f"aview_{ticket_id}")
                        ]])
                        await agent_bot.send_message(chat_id=recipient.telegram_chat_id, text=msg,
reply_markup=kb)
                    logger.info("tg_agent_notified", agent_id=recipient.id, ticket_id=ticket_id)
                except Exception as send_error:
                    logger.error("tg_agent_send_error", error=str(send_error), agent_id=recipient.id)
    except Exception as e:
        logger.error("tg_agent_notify_error", error=str(e), agent_id=agent_id)
    finally:
        db.close()


async def notify_agent_new_comment(agent_id: int, ticket_readable_id: int, commenter_name: str, comment_text: str):
    db = SessionLocal()
    try:
        agent = db.query(User).filter(User.id == agent_id).first()
        if not agent or not agent.telegram_chat_id:
            return
        msg = f"💬 <b>Комментарий в заявке #{ticket_readable_id}</b>\n\n"
        msg += f"<b>От:</b> {commenter_name}\n"
        msg += f"<b>Текст:</b> {comment_text[:300]}"
        if agent_bot:
            await agent_bot.send_message(chat_id=agent.telegram_chat_id, text=msg)
    except Exception as e:
        logger.error("tg_agent_comment_notify_error", error=str(e))
    finally:
        db.close()


class AgentLogin(StatesGroup):
    waiting_for_email = State()
    waiting_for_password = State()


if agent_dp:

    @agent_dp.message(CommandStart())
    async def cmd_start(message: types.Message, state: FSMContext):
        chat_id = str(message.chat.id)
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
            if user:
                role = {"admin": "Администратор", "agent": "Агент", "super_admin": "Супер-админ"}.get(user.role, user.role)
                await message.answer(
                    f"👋 <b>{user.full_name or user.email}</b>\n\n"
                    f"Роль: <b>{role}</b>\n\n"
                    f"Вы будете получать уведомления о новых заявках.",
                    reply_markup=agent_menu_kb()
                )
            else:
                await state.set_state(AgentLogin.waiting_for_email)
                await message.answer(
                    "👋 <b>Агентский бот Service Desk</b>\n\n"
                    "Для получения уведомлений нужно привязать аккаунт.\n\n"
                    "Введите ваш <b>email</b> (который используете на сайте):\n\n"
                    "<i>Пример: agent@novumtech.uz</i>\n\n"
                    "Для отмены: /cancel",
                    reply_markup=types.ReplyKeyboardRemove()
                )
        finally:
            db.close()

    @agent_dp.message(AgentLogin.waiting_for_email, F.text)
    async def login_process_email(message: types.Message, state: FSMContext):
        email = message.text.strip().lower()
        db = SessionLocal()
        try:
            user = db.query(User).filter(
                User.email == email,
                User.role.in_([UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN])
            ).first()
            if not user:
                await message.answer("❌ Агент с таким email не найден. Попробуйте ещё раз или /cancel.")
                return
            await state.update_data(login_email=email)
            await state.set_state(AgentLogin.waiting_for_password)
            await message.answer(f"✅ Email <b>{email}</b> найден!\n\nТеперь введите <b>пароль</b>:")
        except Exception as e:
            await message.answer(f"❌ Ошибка: {e}")
        finally:
            db.close()

    @agent_dp.message(AgentLogin.waiting_for_password, F.text)
    async def login_process_password(message: types.Message, state: FSMContext):
        data = await state.get_data()
        email = data.get("login_email", "")
        password = message.text
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user or not verify_password(password, user.password):
                await message.answer("❌ Неверный пароль. Попробуйте ещё раз или /cancel.")
                return
            user.telegram_chat_id = str(message.chat.id)
            db.commit()
            await state.clear()
            role = {"admin": "Администратор", "agent": "Агент", "super_admin": "Супер-админ"}.get(user.role, user.role)
            await message.answer(
                f"✅ <b>Аккаунт привязан!</b>\n\n"
                f"👤 <b>{user.full_name or user.email}</b>\n"
                f"Роль: <b>{role}</b>\n\n"
                f"Теперь вы будете получать уведомления о новых заявках.",
                reply_markup=agent_menu_kb()
            )
            try:
                await message.delete()
            except Exception:
                pass
        except Exception as e:
            await message.answer(f"❌ Ошибка: {e}")
        finally:
            db.close()

    @agent_dp.message(Command("cancel"))
    async def cmd_cancel(message: types.Message, state: FSMContext):
        await state.clear()
        await message.answer("❌ Отменено. Отправьте /start для повторной попытки.", reply_markup=agent_menu_kb())

    @agent_dp.message(Command("login"))
    async def cmd_login(message: types.Message):
        parts = message.text.split(maxsplit=2)
        if len(parts) < 3:
            await message.answer("🔐 Формат: <code>/login email пароль</code>")
            return
        email_addr, password = parts[1], parts[2]
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == email_addr).first()
            if not user or not verify_password(password, user.password):
                await message.answer("❌ Неверный email или пароль.")
                return
            if user.role not in [UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]:
                await message.answer("⚠️ Эта команда только для агентов и администраторов.")
                return
            user.telegram_chat_id = str(message.chat.id)
            db.commit()
            role = {"admin": "Администратор", "agent": "Агент", "super_admin": "Супер-админ"}.get(user.role, user.role)
            await message.answer(
                f"✅ Привязано, <b>{user.full_name or user.email}</b>!\n\n"
                f"Роль: <b>{role}</b>\n"
                f"Ожидайте уведомления о новых заявках.",
                reply_markup=agent_menu_kb()
            )
            try:
                await message.delete()
            except Exception:
                pass
        except Exception as e:
            await message.answer(f"❌ Ошибка: {e}")
        finally:
            db.close()

    @agent_dp.message(Command("logout"))
    async def cmd_logout(message: types.Message):
        chat_id = str(message.chat.id)
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
            if not user:
                await message.answer("❌ Аккаунт не привязан.")
                return
            user.telegram_chat_id = None
            db.commit()
            await message.answer(
                "✅ <b>Аккаунт отвязан.</b>\n\n"
                "Чтобы привязать другой аккаунт:\n"
                "<code>/login email пароль</code>"
            )
        except Exception as e:
            await message.answer(f"❌ Ошибка: {e}")
        finally:
            db.close()

    @agent_dp.message(Command("my"))
    async def cmd_my(message: types.Message):
        chat_id = str(message.chat.id)
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
            if not user:
                await message.answer("❌ Отправьте /login для привязки.", reply_markup=agent_menu_kb())
                return
            tickets = db.query(Ticket).filter(
                Ticket.assigned_to == user.id,
                Ticket.tenant_id == user.tenant_id
            ).join(TicketStatus).filter(
                TicketStatus.is_final == False
            ).order_by(desc(Ticket.created_at)).limit(10).all()
            if not tickets:
                await message.answer("📭 Нет назначенных заявок.", reply_markup=agent_menu_kb())
                return
            msg = "🔧 <b>Ваши заявки:</b>\n\n"
            for t in tickets:
                s = db.query(TicketStatus).filter(TicketStatus.id == t.status_id).first()
                sn = s.name if s else "?"
                se = STATUS_EMOJI.get(sn, "📋")
                pe = PRIORITY_EMOJI.get(t.priority, "⚪")
                msg += f"{se} {pe} <b>#{t.readable_id}</b> — {t.title[:40]}\n    {sn}\n\n"
            await message.answer(msg, reply_markup=agent_menu_kb())
        finally:
            db.close()

    @agent_dp.message(Command("all"))
    async def cmd_all(message: types.Message):
        chat_id = str(message.chat.id)
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
            if not user:
                await message.answer("❌ Отправьте /login для привязки.", reply_markup=agent_menu_kb())
                return
            tickets = db.query(Ticket).filter(
                Ticket.tenant_id == user.tenant_id
            ).order_by(desc(Ticket.created_at)).limit(15).all()
            if not tickets:
                await message.answer("📭 Нет заявок.", reply_markup=agent_menu_kb())
                return
            msg = "📋 <b>Последние заявки:</b>\n\n"
            for t in tickets:
                s = db.query(TicketStatus).filter(TicketStatus.id == t.status_id).first()
                sn = s.name if s else "?"
                se = STATUS_EMOJI.get(sn, "📋")
                pe = PRIORITY_EMOJI.get(t.priority, "⚪")
                msg += f"{se} {pe} <b>#{t.readable_id}</b> — {t.title[:35]}\n    {sn}\n\n"
            await message.answer(msg, reply_markup=agent_menu_kb())
        finally:
            db.close()

    @agent_dp.message(Command("help"))
    async def cmd_help(message: types.Message):
        await message.answer(
            "🆘 <b>Агентский бот</b>\n\n"
            "📋 /my — ваши назначенные заявки\n"
            "📊 /all — все заявки\n"
            "👥 /login email пароль — привязка\n"
            "🚪 /logout — отвязать аккаунт\n\n"
            "Ответьте на уведомление — добавьте комментарий"
        )

    # ─── Callbacks ───
    @agent_dp.callback_query(F.data.startswith("aaccept_"))
    async def agent_accept(callback: types.CallbackQuery):
        ticket_id = int(callback.data.replace("aaccept_", ""))
        chat_id = str(callback.message.chat.id)
        db = SessionLocal()
        try:
            agent = db.query(User).filter(User.telegram_chat_id == chat_id).first()
            if not agent:
                await callback.answer("❌ Отправьте /login")
                return
            ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
            if not ticket:
                await callback.answer("Заявка не найдена")
                return
            in_progress = db.query(TicketStatus).filter(
                TicketStatus.tenant_id == ticket.tenant_id,
                TicketStatus.name == "В работе"
            ).first()
            if not in_progress:
                await callback.answer("Статус 'В работе' не найден")
                return
            ticket.status_id = in_progress.id
            ticket.assigned_to = agent.id
            if not ticket.accepted_at:
                from datetime import datetime
                ticket.accepted_at = datetime.now()
            db.commit()
            db.add(TicketTimeline(ticket_id=ticket.id, user_id=agent.id, event_type=TimelineEventType.STATUS_CHANGE, content=f"Статус: В работе (принято агентом)"))
            db.commit()

            # Уведомление о закреплении в чат
            assigned_name = agent.full_name or agent.email
            lock_msg = f"🔒 Заявка #{ticket.readable_id} закреплена за агентом {assigned_name}. Остальные агенты не могут её принять."

            msg = format_ticket(ticket, db)
            await callback.message.edit_text(msg, reply_markup=ticket_action_kb(ticket.id, "В работе"))
            await callback.answer("✅ Заявка принята!")

            # Уведомляем всех агентов тенанта о закреплении
            try:
                other_agents = db.query(User).filter(
                    User.tenant_id == ticket.tenant_id,
                    User.role.in_([UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
                    User.telegram_chat_id.isnot(None),
                    User.telegram_chat_id != "",
                    User.id != agent.id
                ).all()
                for other in other_agents:
                    try:
                        await agent_bot.send_message(
                            chat_id=other.telegram_chat_id,
                            text=lock_msg
                        )
                    except Exception:
                        pass
            except Exception:
                pass

            from app.telegram_bot import notify_client_status_change
            await notify_client_status_change(ticket.id, "В работе", agent_name=agent.full_name or agent.email)
        except Exception as e:
            await callback.answer(f"Ошибка: {e}")
            logger.error("tg_agent_accept_error", error=str(e))
        finally:
            db.close()

    @agent_dp.callback_query(F.data.startswith("aresolve_"))
    async def agent_resolve(callback: types.CallbackQuery):
        ticket_id = int(callback.data.replace("aresolve_", ""))
        chat_id = str(callback.message.chat.id)
        db = SessionLocal()
        try:
            agent = db.query(User).filter(User.telegram_chat_id == chat_id).first()
            if not agent:
                await callback.answer("❌ Отправьте /login")
                return
            ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
            if not ticket:
                await callback.answer("Заявка не найдена")
                return
            resolved = db.query(TicketStatus).filter(
                TicketStatus.tenant_id == ticket.tenant_id,
                TicketStatus.name == "Ожидает клиента"
            ).first()
            if not resolved:
                await callback.answer("Статус 'Ожидает клиента' не найден")
                return
            ticket.status_id = resolved.id
            from datetime import datetime
            ticket.resolved_at = datetime.now()
            ticket.resolved_by = agent.id
            db.commit()
            db.add(TicketTimeline(ticket_id=ticket.id, user_id=agent.id, event_type=TimelineEventType.STATUS_CHANGE, content="Статус: Ожидает клиента"))
            db.commit()
            msg = format_ticket(ticket, db)
            await callback.message.edit_text(msg, reply_markup=ticket_action_kb(ticket.id, "Ожидает клиента"))
            await callback.answer("✅ Заявка решена!")
            from app.telegram_bot import notify_client_status_change
            await notify_client_status_change(ticket.id, "Ожидает клиента", agent_name=agent.full_name or agent.email)
        except Exception as e:
            await callback.answer(f"Ошибка: {e}")
            logger.error("tg_agent_resolve_error", error=str(e))
        finally:
            db.close()

    @agent_dp.callback_query(F.data.startswith("areopen_"))
    async def agent_reopen(callback: types.CallbackQuery):
        ticket_id = int(callback.data.replace("areopen_", ""))
        chat_id = str(callback.message.chat.id)
        db = SessionLocal()
        try:
            agent = db.query(User).filter(User.telegram_chat_id == chat_id).first()
            if not agent:
                await callback.answer("❌ Отправьте /login")
                return
            ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
            if not ticket:
                await callback.answer("Заявка не найдена")
                return
            new_status = db.query(TicketStatus).filter(
                TicketStatus.tenant_id == ticket.tenant_id,
                TicketStatus.name == "В работе"
            ).first()
            if not new_status:
                new_status = db.query(TicketStatus).filter(
                    TicketStatus.tenant_id == ticket.tenant_id,
                    TicketStatus.name == "Новый"
                ).first()
            if not new_status:
                await callback.answer("Статус не найден")
                return
            ticket.status_id = new_status.id
            db.commit()
            db.add(TicketTimeline(ticket_id=ticket.id, user_id=agent.id, event_type=TimelineEventType.STATUS_CHANGE, content=f"Статус: {new_status.name} (переоткрыто)"))
            db.commit()
            msg = format_ticket(ticket, db)
            sn = new_status.name if new_status else "?"
            await callback.message.edit_text(msg, reply_markup=ticket_action_kb(ticket.id, sn))
            await callback.answer("🔄 Заявка переоткрыта!")
        except Exception as e:
            await callback.answer(f"Ошибка: {e}")
            logger.error("tg_agent_reopen_error", error=str(e))
        finally:
            db.close()

    @agent_dp.callback_query(F.data.startswith("aview_"))
    async def agent_view(callback: types.CallbackQuery):
        ticket_id = int(callback.data.replace("aview_", ""))
        db = SessionLocal()
        try:
            ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
            if not ticket:
                await callback.answer("Заявка не найдена")
                return
            status = db.query(TicketStatus).filter(TicketStatus.id == ticket.status_id).first()
            sn = status.name if status else "?"
            msg = format_ticket(ticket, db)
            await callback.message.edit_text(msg, reply_markup=ticket_action_kb(ticket.id, sn))
            await callback.answer()
        except Exception as e:
            await callback.answer("Ошибка")
        finally:
            db.close()

    @agent_dp.callback_query(F.data.startswith("acomment_"))
    async def agent_comment_start(callback: types.CallbackQuery):
        ticket_id = int(callback.data.replace("acomment_", ""))
        from aiogram.fsm.context import FSMContext
        from aiogram.fsm.state import State, StatesGroup

        class CommentState(StatesGroup):
            waiting_for_comment = State()

        await callback.message.answer(f"💬 Напишите комментарий к заявке #{ticket_id}:\n\nДля отмены отправьте /cancel")
        # Store ticket_id in a simple way
        await agent_dp.storage.set_data(chat=callback.message.chat.id, data={"comment_ticket_id": ticket_id})
        # We'll handle the text via a flag
        await callback.answer()

    # ─── Menu Buttons ───
    @agent_dp.message(F.text == "📋 Мои заявки")
    async def menu_my(message: types.Message):
        await cmd_my(message)

    @agent_dp.message(F.text == "📊 Все заявки")
    async def menu_all(message: types.Message):
        await cmd_all(message)

    @agent_dp.message(F.text == "🔧 Статус")
    async def menu_my_tickets(message: types.Message):
        await cmd_my(message)

    @agent_dp.message(F.text == "❓ Помощь")
    async def menu_help(message: types.Message):
        await cmd_help(message)

    # ─── Reply = comment on last viewed ticket ───
    @agent_dp.message(F.reply_to_message & F.text & ~F.text.startswith('/'))
    async def handle_agent_reply(message: types.Message):
        reply_text = message.reply_to_message.text or ""
        match = re.search(r'#(\d+)', reply_text)
        if not match:
            await message.answer("⚠️ Ответьте на сообщение с номером заявки (#123).")
            return
        readable_id = int(match.group(1))
        chat_id = str(message.chat.id)
        db = SessionLocal()
        try:
            agent = db.query(User).filter(User.telegram_chat_id == chat_id).first()
            if not agent:
                await message.answer("❌ Отправьте /login для привязки.", reply_markup=agent_menu_kb())
                return
            tenant = get_default_tenant(db)
            ticket = db.query(Ticket).filter(Ticket.readable_id == readable_id, Ticket.tenant_id == tenant.id if tenant else True).first()
            if not ticket:
                await message.answer(f"❌ Заявка #{readable_id} не найдена.")
                return

            is_internal = message.text.startswith("!")
            content = message.text[1:].strip() if is_internal else message.text

            db.add(TicketTimeline(
                ticket_id=ticket.id,
                user_id=agent.id,
                event_type=TimelineEventType.NOTE if is_internal else TimelineEventType.COMMENT,
                content=content,
                is_internal=is_internal
            ))
            db.commit()

            if is_internal:
                await message.answer(f"📝 Внутренняя заметка добавлена к #{readable_id}.")
            else:
                await message.answer(f"✅ Комментарий добавлен к #{readable_id}.", reply_markup=agent_menu_kb())
                # Notify client
                from app.telegram_bot import notify_client_new_reply
                creator = db.query(User).filter(User.id == ticket.created_by).first()
                if creator and creator.telegram_chat_id:
                    await notify_client_new_reply(ticket.id, agent.full_name or agent.email, content)

            logger.info("tg_agent_comment", ticket_id=ticket.id, agent_id=agent.id)
        except Exception as e:
            await message.answer(f"❌ Ошибка: {e}")
        finally:
            db.close()

    # ─── Free text (agent comment when in "comment mode") ───
    @agent_dp.message(F.text & ~F.text.startswith('/'))
    async def agent_free_text(message: types.Message):
        # Check if there's a pending comment
        data = await agent_dp.storage.get_data(chat=message.chat.id)
        if data and "comment_ticket_id" in data:
            ticket_id = data["comment_ticket_id"]
            # Clear the state
            await agent_dp.storage.set_data(chat=message.chat.id, data={})

            db = SessionLocal()
            try:
                agent = db.query(User).filter(User.telegram_chat_id == str(message.chat.id)).first()
                ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
                if not ticket:
                    await message.answer("❌ Заявка не найдена.", reply_markup=agent_menu_kb())
                    return

                db.add(TicketTimeline(
                    ticket_id=ticket.id,
                    user_id=agent.id,
                    event_type=TimelineEventType.COMMENT,
                    content=message.text
                ))
                db.commit()
                await message.answer(f"✅ Комментарий добавлен к #{ticket.readable_id}.", reply_markup=agent_menu_kb())

                from app.telegram_bot import notify_client_new_reply
                creator = db.query(User).filter(User.id == ticket.created_by).first()
                if creator and creator.telegram_chat_id:
                    await notify_client_new_reply(ticket.id, agent.full_name or agent.email, message.text)
            except Exception as e:
                await message.answer(f"❌ Ошибка: {e}")
            finally:
                db.close()
        else:
            await message.answer("📋 Выберите действие из меню или отправьте /my для списка заявок.", reply_markup=agent_menu_kb())


async def start_agent_polling():
    if agent_bot and agent_dp:
        print("🤖 Starting Agent Telegram Bot (@agent_novum_bot)...")
        try:
            await agent_dp.start_polling(agent_bot)
        except Exception as e:
            print(f"Agent Bot Error: {e}")
    else:
        print("⚠️  Agent Telegram Bot not started (token missing)")