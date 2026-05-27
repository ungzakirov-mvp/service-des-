"""
Telegram Bot Integration - Entry Point

Launches both Client and Agent bots.
Exports notification functions for use by other modules (routers).
"""
import os
import asyncio
import structlog

from app.config import settings

logger = structlog.get_logger()


async def start_polling():
    tasks = []

    if settings.TELEGRAM_CLIENT_BOT_TOKEN:
        from app.telegram_bot_client import start_client_polling
        tasks.append(asyncio.create_task(start_client_polling()))
    else:
        print("⚠️  Client Telegram Bot not started (TELEGRAM_CLIENT_BOT_TOKEN missing)")

    if settings.TELEGRAM_AGENT_BOT_TOKEN:
        from app.telegram_agent_bot import start_agent_polling
        tasks.append(asyncio.create_task(start_agent_polling()))
    else:
        print("⚠️  Agent Telegram Bot not started (TELEGRAM_AGENT_BOT_TOKEN missing)")

    if not tasks:
        print("⚠️  No Telegram bots configured")
        return

    print(f"🤖 Starting {len(tasks)} Telegram bot(s)...")
    await asyncio.gather(*tasks)


async def notify_agent_new_ticket(agent_id: int, ticket_id: int, readable_id: int, title: str, client_name: str = None, priority: str = "medium", description: str = None, company_name: str = None, company_color: str = None, ticket=None):
    from app.telegram_agent_bot import notify_agent_new_ticket as _fn
    await _fn(agent_id=agent_id, ticket_id=ticket_id, readable_id=readable_id, title=title, client_name=client_name, priority=priority, description=description, company_name=company_name, company_color=company_color)


async def notify_client_status_change(ticket_id: int, new_status_name: str, agent_name: str = None):
    if not settings.TELEGRAM_CLIENT_BOT_TOKEN:
        return
    from app.telegram_bot_client import client_bot
    from app.database import SessionLocal
    from app.models import Ticket, User
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    db = SessionLocal()
    try:
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return
        creator = db.query(User).filter(User.id == ticket.created_by).first()
        if not creator or not creator.telegram_chat_id:
            return
        STATUS_EMOJI = {"Новый": "🆕", "В работе": "🔧", "Ожидает клиента": "⏳", "Решён": "✅", "Закрыт": "🔒"}
        se = STATUS_EMOJI.get(new_status_name, "📋")
        msg = f"{se} <b>Обновление заявки #{ticket.readable_id}</b>\n\n"
        msg += f"📌 <b>Тема:</b> {ticket.title}\n"
        msg += f"📊 <b>Новый статус:</b> {new_status_name}\n"
        if agent_name:
            msg += f"👤 <b>Исполнитель:</b> {agent_name}\n"

        if new_status_name == "Ожидает клиента":
            msg += f"\n⭐ <i>Оцените качество обслуживания:</i>"
            kb = InlineKeyboardMarkup(inline_keyboard=[[
                InlineKeyboardButton(text="⭐", callback_data=f"crate_{ticket.id}_1"),
                InlineKeyboardButton(text="⭐⭐", callback_data=f"crate_{ticket.id}_2"),
                InlineKeyboardButton(text="⭐⭐⭐", callback_data=f"crate_{ticket.id}_3"),
                InlineKeyboardButton(text="⭐⭐⭐⭐", callback_data=f"crate_{ticket.id}_4"),
                InlineKeyboardButton(text="⭐⭐⭐⭐⭐", callback_data=f"crate_{ticket.id}_5"),
            ]])
            await client_bot.send_message(chat_id=creator.telegram_chat_id, text=msg, reply_markup=kb)
        else:
            msg += f"\n💬 <i>Ответьте на это сообщение для комментария.</i>"
            await client_bot.send_message(chat_id=creator.telegram_chat_id, text=msg)
        logger.info("tg_client_notified", ticket_id=ticket_id, status=new_status_name)
    except Exception as e:
        logger.error("tg_notify_client_error", error=str(e))
    finally:
        db.close()


async def notify_client_new_reply(ticket_id: int, agent_name: str, reply_text: str):
    if not settings.TELEGRAM_CLIENT_BOT_TOKEN:
        return
    from app.telegram_bot_client import client_bot
    from app.database import SessionLocal
    from app.models import Ticket, User
    db = SessionLocal()
    try:
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return
        creator = db.query(User).filter(User.id == ticket.created_by).first()
        if not creator or not creator.telegram_chat_id:
            return
        msg = f"💬 <b>Ответ по заявке #{ticket.readable_id}</b>\n\n"
        msg += f"👤 <b>Агент:</b> {agent_name}\n"
        msg += f"📝 <b>Ответ:</b> {reply_text[:500]}\n"
        msg += f"\n💬 <i>Ответьте на это сообщение для комментария.</i>"
        await client_bot.send_message(chat_id=creator.telegram_chat_id, text=msg)
    except Exception as e:
        logger.error("tg_notify_client_reply_error", error=str(e))
    finally:
        db.close()


async def notify_agent_new_comment(agent_id: int, ticket_readable_id: int, commenter_name: str, comment_text: str):
    from app.telegram_agent_bot import notify_agent_new_comment as _fn
    await _fn(agent_id=agent_id, ticket_readable_id=ticket_readable_id, commenter_name=commenter_name, comment_text=comment_text)