# PostgreSQL Sandbox Plan

> **Project:** ServiceDesk  
> **Date:** 2026-05-29  
> **Phase:** E.1 Operational Readiness — Risk Assessment & Planning

## Purpose

Evaluate the effort, risk, and approach for migrating from SQLite to PostgreSQL **without breaking** the existing production workflow. This is a **planning document only** — no migration is executed in this phase.

---

## 1. Motivation

| Current (SQLite) | Target (PostgreSQL) |
|---|---|
| Single-writer, file-level locking | Full MVCC, concurrent writers |
| No user/role management | Role-based access, connection pooling |
| Manual backup via `VACUUM INTO` | WAL archiving, point-in-time recovery |
| Schema enforcement at app layer | Schema enforcement at DB layer |
| Not suitable for >1 backend replica | Horizontal read scaling via replicas |
| No network access | Network-accessible, standard port 5432 |

For a production deployment serving multiple tenants, PostgreSQL is strongly recommended.

---

## 2. Architecture

### 2.1 Target Docker Compose Addition

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: servicedesk_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: servicedesk
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U servicedesk_user -d servicedesk"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - servicedesk-network

volumes:
  pgdata:
```

### 2.2 Backend Changes Required

| File | Change |
|---|---|
| `.env` | Add `POSTGRES_PASSWORD`, change `DATABASE_URL` |
| `docker-compose.yml` | Add `postgres` service, add `depends_on` to backend |
| `app/infrastructure/config.py` | Add `POSTGRES_*` env vars, update `DATABASE_URL` resolution |
| `alembic.ini` | Already configurable via `env.py` — no change needed |
| `requirements.txt` | Already has `psycopg2-binary==2.9.9` — no change |
| Any SQLite-specific SQL | Check for `sqlite://`-specific code (e.g., `random()`, `now`) |

### 2.3 Data Types That Differ

| SQLite | PostgreSQL | Risk Level |
|---|---|---|
| `BOOLEAN` stored as `INTEGER` 0/1 | Native `BOOLEAN` | Low (SQLAlchemy handles) |
| `DateTime` stored as text/real | Native `TIMESTAMP` | Low (SQLAlchemy handles) |
| `JSON` stored as text | Native `JSONB` | Low (SQLAlchemy handles) |
| Auto-increment via `ROWID` | `SERIAL` / `IDENTITY` | Low (SQLAlchemy handles) |
| `Enum` stored as text | Native `ENUM` or `VARCHAR` | **Medium** — check `app/models/*.py` |
| `FOREIGN KEY` not enforced by default | Enforced by default | **Low** — expect some constraint failures |

---

## 3. Migration Strategy

### 3.1 Approach Comparison

| Approach | Downtime | Complexity | Risk | Recommended |
|---|---|---|---|---|
| Alembic `--autogenerate` on fresh PG | Moderate (full export/import) | Medium | Medium | ✅ For initial migration |
| Dual-write (SQLite + PG) | Zero | High | Medium | ❌ Too complex for current scale |
| Alembic migrations on live SQLite | Low | Low | **High** | ❌ Schema drift already exists |
| Manual schema mapping + data dump | Moderate | Medium | Low | ✅ For production cutover |

### 3.2 Recommended: Alembic Autogenerate + Scripted Import

**Phase 1 (Sandbox — this plan)**
1. Add `postgres` service to `docker-compose.yml`
2. Deploy with empty PG database alongside existing SQLite
3. Run `alembic upgrade head` against PG (creates schema)
4. Validate: `make test` against PG
5. Document any schema incompatibilities found

**Phase 2 (Production Cutover — future)**
1. Stop backend (read-only mode)
2. Script: export SQLite data, transform to PG-compatible SQL
3. Import into PG
4. Switch `DATABASE_URL` to PG
5. Restart backend
6. Verify data integrity
7. Keep SQLite as fallback for 1 week

### 3.3 Data Export Script (Conceptual)

```python
#!/usr/bin/env python3
"""Export SQLite data to PostgreSQL-compatible SQL."""
import sqlite3
import psycopg2

# Connect to both
src = sqlite3.connect("/root/servicedesk/data/servicedesk.db")
dst = psycopg2.connect("dbname=servicedesk user=servicedesk_user")

# For each table:
# 1. SELECT * FROM sqlite_master WHERE type='table'
# 2. PRAGMA table_info(table_name)
# 3. SELECT * FROM table_name
# 4. INSERT INTO dst (..., ...) VALUES (..., ...)
# 5. Handle auto-increment: setval(pg_sequence, max(id))

src.close()
dst.close()
```

---

## 4. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Schema drift between SQLite and models | High | Medium | Run `alembic check --autogenerate` now, fix drift before PG |
| Data type incompatibility | Medium | High | Test with copy of production data in sandbox |
| Enum values differ | Medium | Medium | Verify all Enum classes map to consistent VARCHAR values |
| Foreign key constraint violations | Medium | High | `PRAGMA foreign_key_list` on SQLite; add `SET FOREIGN_KEY_CHECKS=0` during import |
| Performance regression | Low | Medium | Index PG after import; run EXPLAIN ANALYZE on key queries |
| Migration script failure | Low | High | Keep SQLite as fallback, test with copy first |

### 4.1 Current Schema Drift

```bash
# Run this to detect drift
docker compose exec backend alembic check --autogenerate
```

> **Note:** If this command shows "Target database is not up to date" or produces a migration,
> the SQLite DB schema does not match the SQLAlchemy models. This drift must be resolved
> before any PostgreSQL migration — or the resulting PG schema will match the models and
> the import from SQLite may fail due to column/constraint mismatches.

---

## 5. Rollback Plan

If PostgreSQL migration causes issues:

1. **Restore `.env`** to `DATABASE_URL=sqlite:///./servicedesk.db`
2. **Restart**: `docker compose up -d --build backend`
3. **Verify**: `make health && make test`
4. **Remove PG container** (data preserved in `pgdata` volume)

The SQLite database file is never deleted during migration — it remains as an instant fallback.

---

## 6. Implementation Timeline (Estimated)

| Step | Effort | Who |
|---|---|---|
| Add postgres service to docker-compose | 1 hour | DevOps |
| Fix schema drift (alembic) | 2–4 hours | Backend |
| Write data export script | 4–8 hours | Backend |
| Sandbox testing (stage copy of data) | 2 hours | QA |
| Production cutover | 2 hours scheduled | DevOps + Backend |
| Monitoring period | 1 week | All |

**Total: ~2-3 days elapsed for sandbox, ~1 day for production cutover**

---

## 7. Decision Gate

Before proceeding to Phase F (PostgreSQL Migration), the following must be true:

- [ ] Schema drift resolved: `alembic check --autogenerate` produces no output
- [ ] Sandbox PG instance runs all 56 integration tests (or updated count)
- [ ] Data export script tested with full production data copy
- [ ] Rollback drill completed successfully
- [ ] Monitoring in place (database connections, query performance, disk usage)
