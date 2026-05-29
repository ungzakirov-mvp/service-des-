#!/bin/bash
set -euo pipefail

echo "=== 1. Login to get JWT ==="
LOGIN=$(curl -sk -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@novumtech.uz","password":"admin123"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "Token: ${TOKEN:0:50}..."

echo ""
echo "=== 2. Generate Telegram link token ==="
LINK_RESP=$(curl -sk -X POST https://localhost/api/telegram/link-token \
  -H "Authorization: Bearer $TOKEN")
echo "Link: $LINK_RESP"

echo ""
echo "=== 3. Test webhook endpoint ==="
WEBHOOK_RESP=$(curl -sk -X POST https://localhost/api/webhooks/telegram \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: test" \
  -d '{"update_id":123456789,"message":{"message_id":1,"from":{"id":12345,"is_bot":false,"first_name":"Test"},"chat":{"id":12345},"text":"/start"}}' 2>&1)
echo "Webhook response: $WEBHOOK_RESP"

echo ""
echo "=== 4. Create a test ticket (triggers notify_agent_new_ticket) ==="
TICKET_RESP=$(curl -sk -X POST https://localhost/api/tickets/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Telegram Bot Test Ticket","description":"Testing if agent bot receives notification","priority":"medium"}')
echo "Ticket: $TICKET_RESP"

echo ""
echo "=== 5. Check backend logs for bot polling ==="
docker compose logs --tail 15 backend 2>&1 | grep -E "polling|Telegram|bot|error|Error|traceback" | tail -5 || echo "No bot-related log lines found"

echo ""
echo "=== Telegram workflow verification: DONE ==="
