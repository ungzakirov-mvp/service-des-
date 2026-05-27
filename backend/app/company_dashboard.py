import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import Company, Ticket, CompanyEmployee

random.seed(42)

EVENT_TYPES = [
    ("\u2705 \u0418\u043d\u0446\u0438\u0434\u0435\u043d\u0442 DLP \u043f\u0440\u0435\u0434\u043e\u0442\u0432\u0440\u0430\u0449\u0451\u043d", "success"),
    ("\u26a1 \u041a\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0435 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043e", "success"),
    ("\U0001f504 \u0420\u0435\u0437\u0435\u0440\u0432\u043d\u043e\u0435 \u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e", "success"),
    ("\U0001f4ca \u041e\u0442\u0447\u0451\u0442 SLA \u0437\u0430 \u043f\u0435\u0440\u0438\u043e\u0434 \u0441\u0444\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d", "info"),
    ("\U0001f514 \u041e\u0431\u043d\u0430\u0440\u0443\u0436\u0435\u043d\u0430 \u043f\u043e\u0434\u043e\u0437\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "warning"),
    ("\U0001f6e1\ufe0f \u041c\u0435\u0436\u0441\u0435\u0442\u0435\u0432\u043e\u0439 \u044d\u043a\u0440\u0430\u043d: \u043f\u0440\u0430\u0432\u0438\u043b\u0430 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u044b", "info"),
    ("\U0001f4e7 M365: \u043d\u043e\u0432\u044b\u0439 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043d", "success"),
    ("\U0001f310 \u0421\u0435\u0442\u0435\u0432\u043e\u0435 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435: \u043f\u043b\u0430\u043d\u043e\u0432\u0430\u044f \u043f\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0430", "info"),
    ("\U0001f4be \u0412\u0438\u0440\u0442\u0443\u0430\u043b\u044c\u043d\u044b\u0439 \u0441\u0435\u0440\u0432\u0435\u0440 \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u0440\u0430\u0437\u0432\u0435\u0440\u043d\u0443\u0442", "success"),
    ("\U0001f50d \u0421\u043a\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0443\u044f\u0437\u0432\u0438\u043c\u043e\u0441\u0442\u0435\u0439 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e", "info"),
    ("\u26a0\ufe0f \u0412\u044b\u0441\u043e\u043a\u0430\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0430 CPU \u043d\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435 DB-01", "warning"),
    ("\U0001f6a8 \u041e\u0431\u043d\u0430\u0440\u0443\u0436\u0435\u043d\u0430 \u043f\u043e\u043f\u044b\u0442\u043a\u0430 \u043d\u0435\u0441\u0430\u043d\u043a\u0446\u0438\u043e\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u043e\u0433\u043e \u0434\u043e\u0441\u0442\u0443\u043f\u0430", "critical"),
    ("\u2705 \u0410\u043d\u0442\u0438\u0432\u0438\u0440\u0443\u0441\u043d\u044b\u0435 \u0431\u0430\u0437\u044b \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u044b", "success"),
    ("\U0001f4c1 SharePoint: \u0441\u043e\u0437\u0434\u0430\u043d \u043d\u043e\u0432\u044b\u0439 \u0441\u0430\u0439\u0442 \u043f\u0440\u043e\u0435\u043a\u0442\u0430", "info"),
    ("\U0001f504 \u041c\u0438\u0433\u0440\u0430\u0446\u0438\u044f \u043f\u043e\u0447\u0442\u044b \u0432 M365 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0430", "success"),
]

DEFAULT_SETTINGS = {
    "network": {
        "total_devices": 35, "online": 33,
        "categories": {"router": 2, "switch": 5, "access_point": 4, "firewall": 1},
    },
    "servers": {
        "total": 12, "physical": 5, "virtual": 7,
        "os_distribution": {"Windows Server": 4, "Linux (Ubuntu)": 4, "Linux (CentOS)": 2, "Proxmox/VMware": 2},
    },
    "m365": {
        "total_licenses": 50, "active_users": 42, "exchange_online": 45,
        "teams_active": 30, "onedrive_users": 38, "sharepoint_sites": 8,
    },
    "dlp": {
        "status": "online", "total_incidents": 85, "prevented": 78, "open": 7,
    },
    "backup": {
        "status": "ok", "success_rate": 99.2, "total_backups": 1500, "storage_used_gb": 450.0,
    },
    "security": {
        "score": 88, "vulnerabilities_critical": 1, "vulnerabilities_high": 3,
        "vulnerabilities_medium": 8, "patches_pending": 4,
    },
}


def merge_settings(saved, defaults):
    result = {}
    for key, default_val in defaults.items():
        if isinstance(saved, dict) and key in saved:
            val = saved[key]
            if isinstance(default_val, dict) and isinstance(val, dict):
                result[key] = merge_settings(val, default_val)
            else:
                result[key] = val
        else:
            result[key] = default_val
    return result


def get_db_stats(company: Company, db: Session) -> dict:
    all_tickets = db.query(Ticket).filter(Ticket.company_id == company.id).all()
    total_tickets = len(all_tickets)
    open_tickets = sum(1 for t in all_tickets if t.status_rel and t.status_rel.name in ("\u041d\u043e\u0432\u044b\u0439", "\u0412 \u0440\u0430\u0431\u043e\u0442\u0435"))
    resolved = sum(1 for t in all_tickets if t.status_rel and t.status_rel.name == "\u0420\u0435\u0448\u0451\u043d")
    closed = sum(1 for t in all_tickets if t.status_rel and t.status_rel.name == "\u0417\u0430\u043a\u0440\u044b\u0442")
    critical_open = sum(1 for t in all_tickets if t.priority == "critical" and t.status_rel and t.status_rel.name not in ("\u0420\u0435\u0448\u0451\u043d", "\u0417\u0430\u043a\u0440\u044b\u0442"))

    employees = db.query(CompanyEmployee).filter(CompanyEmployee.company_id == company.id).all()
    m365_users = sum(1 for e in employees if e.m365_license)

    return {
        "tickets": {"total": total_tickets, "open": open_tickets, "resolved": resolved, "closed": closed, "critical_open": critical_open},
        "employees": {"total": len(employees), "m365_users": m365_users},
    }


def generate_dashboard(company: Company, db: Session) -> dict:
    saved = (company.extra_metadata or {}).get("dashboard", {})
    settings = merge_settings(saved, DEFAULT_SETTINGS)
    db_stats = get_db_stats(company, db)

    net = settings["network"]
    total_devices = net["total_devices"]
    online = min(net["online"], total_devices)

    sv = settings["servers"]
    total_servers = sv["total"]
    servers_online = max(1, total_servers - random.randint(0, 2))

    m = settings["m365"]
    m365_total = m["total_licenses"]
    m365_active = m["active_users"]
    if db_stats["employees"]["m365_users"] > 0:
        m365_active = max(m365_active, db_stats["employees"]["m365_users"])
        m365_total = max(m365_total, db_stats["employees"]["total"])

    dlp = settings["dlp"]
    total_incidents = dlp["total_incidents"]
    prevented = dlp["prevented"]
    dlp_open = dlp.get("open", total_incidents - prevented)

    bk = settings["backup"]
    sec = settings["security"]

    if db_stats["tickets"]["total"] > 0:
        ticket_total = db_stats["tickets"]["total"]
        ticket_open = db_stats["tickets"]["open"]
        ticket_resolved = db_stats["tickets"]["resolved"]
        sla = round(random.uniform(90.0, 100.0), 1)
    else:
        ticket_total = total_incidents + random.randint(10, 50)
        ticket_resolved = random.randint(int(ticket_total * 0.7), ticket_total)
        ticket_open = ticket_total - ticket_resolved
        sla = round(random.uniform(94.0, 99.8), 1)

    events = saved.get("events")
    if not events:
        events = []
        for _ in range(random.randint(4, 7)):
            ev = random.choice(EVENT_TYPES)
            events.append({
                "time": (datetime.now() - timedelta(hours=random.randint(1, 72))).isoformat(),
                "text": ev[0],
                "type": ev[1],
            })
        events.sort(key=lambda x: x["time"], reverse=True)

    sec_score = sec["score"]
    return {
        "company": {
            "id": company.id, "name": company.name,
            "industry": company.industry or "", "color": company.color or "#6366f1",
            "description": company.description or "",
        },
        "network": {
            "total_devices": total_devices, "online": online,
            "offline": total_devices - online,
            "categories": net["categories"],
        },
        "servers": {
            "total": total_servers, "physical": sv["physical"], "virtual": sv["virtual"],
            "online": servers_online, "offline": total_servers - servers_online,
            "os_distribution": sv["os_distribution"],
        },
        "m365": {
            "total_licenses": m365_total, "active_users": m365_active,
            "exchange_online": m["exchange_online"], "teams_active": m["teams_active"],
            "onedrive_users": m["onedrive_users"], "sharepoint_sites": m["sharepoint_sites"],
        },
        "dlp": {
            "status": dlp.get("status", "online"), "total_incidents": total_incidents,
            "prevented": prevented, "open": dlp_open,
        },
        "backup": {
            "status": bk.get("status", "ok"), "success_rate": bk["success_rate"],
            "last_backup": (datetime.now() - timedelta(hours=random.randint(0, 12))).isoformat(),
            "total_backups": bk["total_backups"], "storage_used_gb": float(bk["storage_used_gb"]),
        },
        "tickets": {
            "total": ticket_total, "resolved": ticket_resolved, "open": ticket_open,
            "sla_compliance": sla, "critical_open": db_stats["tickets"]["critical_open"],
        },
        "security": {
            "score": sec_score,
            "level": "high" if sec_score >= 90 else ("medium" if sec_score >= 75 else "low"),
            "vulnerabilities_critical": sec["vulnerabilities_critical"],
            "vulnerabilities_high": sec["vulnerabilities_high"],
            "vulnerabilities_medium": sec["vulnerabilities_medium"],
            "patches_pending": sec["patches_pending"],
        },
        "recent_events": events,
    }
