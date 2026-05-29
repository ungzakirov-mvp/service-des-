# Backup & Restore Guide

> **Project:** ServiceDesk  
> **Date:** 2026-05-29  
> **Phase:** E.1 Operational Readiness

---

## Table of Contents

1. [Current State](#1-current-state)
2. [SQLite Backup (Production Now)](#2-sqlite-backup)
3. [PostgreSQL Backup (Future)](#3-postgresql-backup)
4. [Restore Procedures](#4-restore-procedures)
5. [Disaster Recovery Checklist](#5-dr-checklist)
6. [Automation: Cron & Make](#6-automation)

---

## 1. Current State

| Item | Value |
|------|-------|
| Database engine | SQLite (`/root/servicedesk/data/servicedesk.db`) |
| Database size | ~630 KB |
| Backup mechanism | **NONE** (this document establishes it) |
| Rollback directory | `/root/servicedesk/backup/` |
| Retention policy | 7 daily backups (configurable) |

**Immediate risk:** Zero backup infrastructure exists. A single `docker compose down -v` or disk failure destroys all data.

---

## 2. SQLite Backup

### 2.1 Manual Backup

```bash
# Safe hot backup (no app downtime)
sqlite3 /root/servicedesk/data/servicedesk.db \
  "VACUUM INTO '/root/servicedesk/backup/servicedesk_$(date +%Y%m%d_%H%M%S).db'"
```

> `VACUUM INTO` creates a consistent snapshot without locking the database for writes.
> Do **NOT** use plain `cp` — it produces a corrupt copy if a write occurs mid-copy.

### 2.2 Automated Backup (Recommended)

A backup script is provided at `scripts/backup.sh`. Install it via cron:

```bash
# Edit crontab
crontab -e

# Add: daily at 03:00
0 3 * * * /root/servicedesk/scripts/backup.sh --rotate 14 >> /root/servicedesk/backup/logs/cron.log 2>&1
```

The script performs:
1. SQLite VACUUM INTO → gzip → dated filename
2. Config files archive (`.env`, `docker-compose.yml`, `nginx.conf`, `Dockerfile`, `requirements.txt`)
3. Rotation: keeps only the N most recent backups (default 7)

### 2.3 Backup Layout

```
/root/servicedesk/backup/
├── sqlite/
│   ├── servicedesk_20260529_030000.db.gz
│   ├── servicedesk_20260528_030000.db.gz
│   └── ...
├── config/
│   ├── config_20260529_030000.tar.gz
│   └── ...
└── logs/
    └── backup_20260529_030000.log
```

### 2.4 Integrity Verification

```bash
# After each backup, verify integrity
for f in backup/sqlite/*.gz; do
  db="$(basename "$f" .gz)"
  gunzip -c "$f" > "/tmp/$db"
  sqlite3 "/tmp/$db" "PRAGMA integrity_check;"
  rm "/tmp/$db"
done
```

---

## 3. PostgreSQL Backup

### 3.1 Pre-Requisites

- `psycopg2-binary==2.9.9` already in `requirements.txt`
- `pg_dump` must be installed on the backup host
- PostgreSQL must be accessible (host/port/user/password)

### 3.2 Manual Dump

```bash
PGPASSWORD="<password>" pg_dump \
  -h localhost -p 5432 \
  -U postgres -d servicedesk \
  --no-owner --no-acl \
  | gzip > backup/pg/servicedesk_$(date +%Y%m%d).sql.gz
```

### 3.3 With the Backup Script

```bash
# Pass --pg flag to include PostgreSQL dump
PGHOST=localhost PGPASSWORD=secret ./scripts/backup.sh --pg
```

### 3.4 Logical vs Physical Backup

| Method | Tool | When |
|--------|------|------|
| Logical (SQL) | `pg_dump` | Daily, small DB (under 50 GB) |
| Physical (WAL) | `pg_basebackup` | Large DB, point-in-time recovery |
| Continuous | WAL archiving | Production HA setup |

For current scale (< 1 GB), `pg_dump` is sufficient.

---

## 4. Restore Procedures

### 4.1 SQLite Restore

```bash
# 1. Stop the backend
cd /root/servicedesk && docker compose stop backend

# 2. Backup the current (corrupted) DB just in case
cp data/servicedesk.db data/servicedesk.db.corrupted

# 3. Restore from backup
gunzip -c backup/sqlite/servicedesk_20260529_030000.db.gz > data/servicedesk.db

# 4. Verify integrity
sqlite3 data/servicedesk.db "PRAGMA integrity_check;"

# 5. Restart
docker compose up -d backend
```

### 4.2 Docker Rebuild After Schema Change

If the restored DB has a different schema than the Docker image expects:

```bash
# Option A: Rebuild image to match old schema (if possible)
docker compose build backend

# Option B: Run pending migrations
docker compose exec backend alembic upgrade head
```

### 4.3 Full System Restore (From Scratch)

```bash
# 1. Restore config files
tar xzf backup/config/config_20260529_030000.tar.gz -C /root/servicedesk/

# 2. Restore database
gunzip -c backup/sqlite/servicedesk_20260529_030000.db.gz > /root/servicedesk/data/servicedesk.db

# 3. Rebuild and start
cd /root/servicedesk
docker compose up -d --build

# 4. Verify
make health
make test
```

### 4.4 PostgreSQL Restore

```bash
# 1. Create database
createdb -U postgres servicedesk

# 2. Restore from dump
gunzip -c backup/pg/servicedesk_20260529.sql.gz | \
  psql -U postgres -d servicedesk

# 3. Run migrations to head
docker compose exec backend alembic upgrade head

# 4. Verify
make health
```

---

## 5. DR Checklist

Use this checklist when responding to a data-loss incident.

### Immediate Response

- [ ] **Stop write operations**: `docker compose stop backend`
- [ ] **Preserve evidence**: `cp data/servicedesk.db data/servicedesk.db.crash`
- [ ] **Assess damage**: Check error logs, recent activity
- [ ] **Identify RPO**: What is the latest valid backup? When was it taken?
- [ ] **Notify stakeholders**: If customer data is affected

### Restore Decision Tree

```
Is the DB file missing or corrupted?
├── YES → SQLite Restore (section 4.1)
│         └── Is the data recent enough?
│             ├── YES → Restore and verify
│             └── NO → Rebuild from code + seed data
└── NO  → Is the schema out of sync?
          ├── YES → `alembic upgrade head`
          └── NO  → Is the app crashing?
                    ├── YES → Check logs, rollback Docker image
                    └── NO  → Problem is elsewhere
```

### Post-Restore Verification

- [ ] `make health` returns exit 0
- [ ] `make test` passes all tests
- [ ] Login as admin works (POST `/api/auth/login`)
- [ ] Ticket list loads (GET `/api/tickets/`)
- [ ] Stats endpoint returns data (GET `/api/stats`)
- [ ] Telegram bots are polling (check `docker logs backend`)
- [ ] Notifications can be created and read

### Post-Incident

- [ ] Root cause identified
- [ ] Fix applied (e.g., disk monitoring, backup frequency increase)
- [ ] DR plan updated with lessons learned
- [ ] Team briefed on changes

---

## 6. Automation

### 6.1 Makefile Targets Added

```makefile
backup:
	@scripts/backup.sh

backup-list:
	@ls -lh backup/sqlite/ backup/config/

restore:
	@echo "Usage: manually follow BACKUP_RESTORE_GUIDE.md section 4"
```

### 6.2 Cron Installation

```bash
# Add to crontab (runs daily at 03:00, keeps 14 backups)
echo '0 3 * * * /root/servicedesk/scripts/backup.sh --rotate 14 >> /root/servicedesk/backup/logs/cron.log 2>&1' | crontab -
```

### 6.3 Monitoring

Add a simple Nagios/Icinga check:

```bash
#!/bin/bash
# check_backup_age.sh - warn if newest backup is older than 48h
NEWEST=$(ls -1t /root/servicedesk/backup/sqlite/ | head -1)
if [ -z "$NEWEST" ]; then
  echo "CRITICAL: No backups found"
  exit 2
fi
AGE=$(( ($(date +%s) - $(stat -c %Y "/root/servicedesk/backup/sqlite/$NEWEST")) / 3600 ))
if [ "$AGE" -gt 48 ]; then
  echo "CRITICAL: Newest backup is ${AGE}h old"
  exit 2
elif [ "$AGE" -gt 24 ]; then
  echo "WARNING: Newest backup is ${AGE}h old"
  exit 1
fi
echo "OK: Newest backup is ${AGE}h old"
exit 0
```
