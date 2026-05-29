from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Company, Ticket, TicketStatus, CompanyEmployee


def get_db_stats(company: Company, db: Session) -> dict:
    tickets = db.query(Ticket).filter(Ticket.company_id == company.id).all()
    total = len(tickets)
    open_tickets = sum(1 for t in tickets if t.status_rel and not t.status_rel.is_final)
    resolved = sum(1 for t in tickets if t.status_rel and t.status_rel.is_final)
    closed = sum(1 for t in tickets if t.status_rel and t.status_rel.name == "Закрыт")
    critical_open = sum(1 for t in tickets if t.priority == "critical" and t.status_rel and not t.status_rel.is_final)

    sla_total = sum(1 for t in tickets if t.sla_due_at and t.status_rel and t.status_rel.is_final)
    sla_compliant = sum(1 for t in tickets if t.sla_due_at and t.status_rel and t.status_rel.is_final and t.updated_at and t.updated_at <= t.sla_due_at)
    sla_compliance = round((sla_compliant / sla_total) * 100, 1) if sla_total > 0 else None

    employees = db.query(CompanyEmployee).filter(CompanyEmployee.company_id == company.id).all()
    m365_users = sum(1 for e in employees if e.m365_license)

    return {
        "total": total,
        "open": open_tickets,
        "resolved": resolved,
        "closed": closed,
        "critical_open": critical_open,
        "sla_compliance": sla_compliance,
        "employees_total": len(employees),
        "employees_m365": m365_users,
    }


def generate_dashboard(company: Company, db: Session) -> dict:
    tix = get_db_stats(company, db)
    sla_compliance = tix.get("sla_compliance") if tix.get("total") > 0 else None

    return {
        "company": {
            "id": company.id,
            "name": company.name,
            "industry": company.industry or "",
            "color": company.color or "#6366f1",
            "description": company.description or "",
        },
        "network": {
            "total_devices": 0,
            "online": 0,
            "offline": 0,
            "categories": {},
        },
        "servers": {
            "total": 0,
            "physical": 0,
            "virtual": 0,
            "online": 0,
            "offline": 0,
            "os_distribution": {},
        },
        "m365": {
            "total_licenses": 0,
            "active_users": 0,
            "exchange_online": 0,
            "teams_active": 0,
            "onedrive_users": 0,
            "sharepoint_sites": 0,
        },
        "dlp": {
            "status": "offline",
            "total_incidents": 0,
            "prevented": 0,
            "open": 0,
        },
        "backup": {
            "status": "unknown",
            "success_rate": 0,
            "total_backups": 0,
            "storage_used_gb": 0,
            "last_backup": None,
        },
        "tickets": {
            "total": tix["total"],
            "open": tix["open"],
            "resolved": tix["resolved"],
            "closed": tix["closed"],
            "critical_open": tix["critical_open"],
            "sla_compliance": sla_compliance,
        },
        "security": {
            "score": 0,
            "level": "unknown",
            "vulnerabilities_critical": 0,
            "vulnerabilities_high": 0,
            "vulnerabilities_medium": 0,
            "patches_pending": 0,
        },
        "recent_events": [],
    }
