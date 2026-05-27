import httpx
from app.config import settings
from app.logger import logger

class TelegramBot:
    def __init__(self):
        self.token = settings.TELEGRAM_AGENT_BOT_TOKEN
        self.api_url = f"https://api.telegram.org/bot{self.token}" if self.token else None

    async def send_message(self, chat_id: int, text: str):
        if not self.api_url:
            logger.warning("telegram_bot_not_configured")
            return
        
        async with httpx.AsyncClient() as client:
            try:
                await client.post(f"{self.api_url}/sendMessage", json={
                    "chat_id": chat_id,
                    "text": text
                })
            except Exception as e:
                logger.error("telegram_send_error", error=str(e))

    async def handle_update(self, update: dict):
        """
        Обработка входящего сообщения от Telegram
        """
        if "message" not in update:
            return
            
        message = update["message"]
        chat_id = message["chat"]["id"]
        text = message.get("text", "")
        
        if text.startswith("/start"):
            await self.send_message(chat_id, "Добро пожаловать в Service Desk! Используйте /ticket для создания заявки.")
        elif text.startswith("/ticket"):
            # Simple MVP: treat everything after /ticket as title
            title = text.replace("/ticket", "").strip()
            if not title:
                await self.send_message(chat_id, "Пожалуйста, укажите заголовок тикета: /ticket Срочно почините принтер")
            else:
                # TODO: Create ticket in DB and link to TG User
                await self.send_message(chat_id, f"Ваша заявка '{title}' получена! Мы свяжемся с вами в Telegram.")
        else:
             await self.send_message(chat_id, "Я получил ваше сообщение. Чтобы создать тикет, напишите /ticket [тема]")

# Global instance
telegram_bot = TelegramBot()
