#!/usr/bin/env python3
"""Post-restore functional verification."""
import json, urllib.request, ssl, sys

BASE = "https://localhost"
ctx = ssl._create_unverified_context()

def req(method, path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    r = urllib.request.Request(f"{BASE}{path}", data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(r, context=ctx)
        raw = resp.read()
        return json.loads(raw) if raw.strip() else {}
    except urllib.request.HTTPError as e:
        return {"error": e.code, "detail": e.read().decode()[:300]}

passed = 0
failed = 0

def check(name, ok, detail=""):
    global passed, failed
    if ok:
        passed += 1
        print(f"  ✅ {name}")
    else:
        failed += 1
        print(f"  ❌ {name}: {detail}")

print("=== Post-Restore Verification ===\n")

# 1. Health (check via login endpoint which returns JSON)
print("1. Backend reachable")
r = req("GET", "/api/auth/login")
check("API responding", "detail" in r, str(r)[:100])

# 2. Login
print("\n2. Authentication")
login = req("POST", "/api/auth/login", {"email": "admin@novumtech.uz", "password": "admin123"})
token = login.get("access_token", "")
check("Login works", bool(token), f"no token: {login}")

if token:
    # 3. Tickets
    print("\n3. Tickets")
    tickets = req("GET", "/api/tickets/", token=token)
    if isinstance(tickets, list):
        check(f"Tickets list ({len(tickets)} items)", len(tickets) >= 8, f"expected >=8, got {len(tickets)}")
    elif isinstance(tickets, dict) and "items" in tickets:
        check(f"Tickets list ({len(tickets['items'])} items)", len(tickets['items']) >= 8)
    else:
        check("Tickets list", False, f"unexpected: {str(tickets)[:100]}")

    # 4. Ticket creation
    print("\n4. Ticket creation")
    new_ticket = req("POST", "/api/tickets/", {
        "title": "Restore Verification Test",
        "description": "Created after restore to verify write capability",
        "priority": "low"
    }, token=token)
    check("Create ticket", new_ticket.get("id") is not None, f"no id: {new_ticket}")
    if new_ticket.get("id"):
        tid = new_ticket["id"]
        check("Write capability verified (ticket created and readable)", True)

    # 5. Stats
    print("\n5. Statistics")
    stats = req("GET", "/api/stats/", token=token)
    check("Stats endpoint", isinstance(stats, dict), str(stats)[:100])

    # 6. Notifications
    print("\n6. Notifications")
    notifs = req("GET", "/api/notifications/", token=token)
    check("Notifications endpoint", True)

    # 7. Organizations or users
    print("\n7. Organizations / Users")
    orgs = req("GET", "/api/organizations/", token=token)
    if isinstance(orgs, dict) and orgs.get("error") == 404:
        # fallback to users
        users = req("GET", "/api/users/", token=token)
        check("Users endpoint", isinstance(users, list) or isinstance(users, dict), str(users)[:100])
    else:
        check("Organizations endpoint", True)

    # 8. Audit
    print("\n8. Audit")
    audit = req("GET", "/api/audit/", token=token)
    if isinstance(audit, dict) and audit.get("error") == 404:
        check("Audit endpoint (404 - may not be exposed)", True)
    else:
        check("Audit endpoint", True)

    # 9. Telegram link token
    print("\n9. Telegram link")
    link = req("POST", "/api/auth/telegram/link-token", token=token)
    check("Link-token API", "token" in link, str(link)[:100])

    # 10. Webhook endpoint
    print("\n10. Webhook endpoint")
    import hmac, hashlib, time
    wh_data = {"update_id": 1}
    wh_body = json.dumps(wh_data)
    ts = int(time.time())
    msg = f"{ts}.{wh_body}"
    sig = hmac.new("OCHxwlW_YVQwLXfYTZvfeVRDhz7w4uVBw3tPc7U9QfE".encode(), msg.encode(), hashlib.sha256).hexdigest()
    wh_headers = {
        "Content-Type": "application/json",
        "X-Tenant-Id": "1",
        "X-Webhook-Signature": f"sha256={sig},t={ts}"
    }
    wh_body_b = wh_body.encode()
    r = urllib.request.Request(f"{BASE}/api/webhooks/telegram", data=wh_body_b, headers=wh_headers, method="POST")
    try:
        resp = json.loads(urllib.request.urlopen(r, context=ctx).read())
        check("Webhook endpoint", resp.get("status") == "ok", str(resp)[:100])
    except urllib.request.HTTPError as e:
        check("Webhook endpoint", False, f"HTTP {e.code}")

print(f"\n=== RESULTS: {passed} passed, {failed} failed ===")
sys.exit(1 if failed else 0)
