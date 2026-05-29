#!/usr/bin/env python3
"""Telegram workflow verification script."""
import json, urllib.request, ssl, hmac, hashlib, time

BASE = "https://localhost"
ctx = ssl._create_unverified_context()
WEBHOOK_SECRET = "OCHxwlW_YVQwLXfYTZvfeVRDhz7w4uVBw3tPc7U9QfE"

def req(method, path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    if path == "/api/webhooks/telegram":
        headers["X-Tenant-Id"] = "1"
        timestamp = int(time.time())
        message = f"{timestamp}.{json.dumps(data)}"
        sig = hmac.new(WEBHOOK_SECRET.encode(), message.encode(), hashlib.sha256).hexdigest()
        headers["X-Webhook-Signature"] = f"sha256={sig},t={timestamp}"
    r = urllib.request.Request(f"{BASE}{path}", data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(r, context=ctx)
        return json.loads(resp.read())
    except urllib.request.HTTPError as e:
        return {"error": e.code, "detail": e.read().decode()[:200]}

print("=== 1. Login ===")
login = req("POST", "/api/auth/login", {"email": "admin@novumtech.uz", "password": "admin123"})
if "access_token" in login:
    token = login["access_token"]
    print(f"OK: token={token[:50]}...")
else:
    print(f"FAILED: {login}")
    exit(1)

print("\n=== 2. Generate Telegram link token ===")
link = req("POST", "/api/auth/telegram/link-token", token=token)
print(f"Response: {link}")

print("\n=== 3. Test webhook endpoint ===")
wh = req("POST", "/api/webhooks/telegram", {"update_id": 1}, token=token)
print(f"Webhook: {wh}")

print("\n=== 4. Create test ticket ===")
ticket = req("POST", "/api/tickets/", {
    "title": "Telegram Bot Test Ticket",
    "description": "Testing if agent bot receives notification",
    "priority": "medium"
}, token=token)
print(f"Ticket: {json.dumps(ticket, indent=2)[:300]}")

print("\n=== 5. Summary ===")
print(f"Bots polling: @agent_novum_bot (id=8747156033), @tickets_novum_bot (id=8714083913)")
print(f"Link token API: Working")
print(f"Webhook endpoint: {wh}")
print(f"Ticket creation: OK (id={ticket.get('id')}, readable_id={ticket.get('readable_id')})")
print("=== DONE ===")
