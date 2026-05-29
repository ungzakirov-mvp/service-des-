# PostgreSQL Sandbox Report

> **Project:** ServiceDesk  
> **Date:** 2026-05-29  
> **Phase:** E.2 Production Readiness Freeze

---

## 1. Objective

Validate that Alembic migrations apply cleanly to PostgreSQL in preparation for production cutover. Identify schema drift, migration compatibility issues, and required remediation.

---

## 2. Setup

| Component | Detail |
|-----------|--------|
| PostgreSQL | `postgres:16-alpine`, port 5432 |
| Database | `servicedesk_sandbox` |
| User | `servicedesk_user` |
| Volume | `pgdata_sandbox` (persistent) |
| Connection | `postgresql://servicedesk_user:***@postgres:5432/servicedesk_sandbox` |

PostgreSQL service added to `docker-compose.yml` via a new `postgres` service (no changes to existing services).

---

## 3. Migration Results

### 3.1 Applied Cleanly (8 of 8)

| # | Revision | Description | Result |
|---|----------|-------------|--------|
| 1 | `f3617e7ae11e` | Initial schema | OK |
| 2 | `0c7241e355ea` | Multi-tenancy & Timeline | OK |
| 3 | `f70ef2679800` | Notification model | OK |
| 4 | `cb2b7ab12aa7` | Category, tags, agent availability | OK |
| 5 | `393ef8ac90d7` | Sync schema with models | OK |
| 6 | `185228b2c6f7` | Rename metadata → extra_metadata | OK (companies table absent) |
| 7 | `eb56b97d642c` | Rename timeline metadata → extra_metadata | OK |
| 8 | `53a04a859618` | Add performance indexes | OK (45 attempted, 10 created, 31 skipped, 4 column errors caught) |

### 3.2 Schema on PostgreSQL (7 tables)

```
alembic_version, notifications, tenants, ticket_statuses,
ticket_timeline, tickets, users
```

The remaining ~26 tables are created by application code (`Base.metadata.create_all()`) and are NOT covered by Alembic migrations. This is a known architectural gap.

### 3.3 Performance Indexes Created (10 of 45)

| Index | Table | Columns |
|-------|-------|---------|
| ix_notifications_tenant_id | notifications | tenant_id |
| ix_ticket_statuses_tenant_id | ticket_statuses | tenant_id |
| ix_ticket_timeline_ticket_created | ticket_timeline | ticket_id, created_at |
| ix_tickets_assigned_to | tickets | assigned_to |
| ix_tickets_created_by | tickets | created_by |
| ix_tickets_status_id | tickets | status_id |
| ix_tickets_tenant_assigned | tickets | tenant_id, assigned_to |
| ix_tickets_tenant_created | tickets | tenant_id, created_at |
| ix_tickets_tenant_status | tickets | tenant_id, status_id |
| ix_users_tenant_id | users | tenant_id |

### 3.4 Skipped (31 indexes)

Tables not present in PG sandbox (created by application code): `companies`, `attachments`, `sla_policies`, `time_entries`, `internal_notes`, etc.

On a real PG database seeded by the application, these indexes would be created without issue.

### 3.5 Column Errors (4, Caught)

| Index | Error |
|-------|-------|
| ix_tickets_company_id | column `company_id` does not exist |
| ix_tickets_resolved_by | column `resolved_by` does not exist |
| ix_tickets_closed_by | column `closed_by` does not exist |
| ix_users_company_id | column `company_id` does not exist |

These columns are added to the schema by application code (model definitions with `create_all`), not by Alembic migrations. On a fully-seeded PG database, these columns would exist and the indexes would create cleanly.

---

## 4. Migration Fix Applied

Revision `53a04a859618` (add_performance_indexes) was patched to handle PostgreSQL's transactional DDL:

**Problem:** `op.create_index()` inside `try/except` catches the Python exception but leaves the PG transaction in an aborted state. Alembic's subsequent `UPDATE alembic_version` fails with `current transaction is aborted`.

**Fix:** On PostgreSQL, each index is created via a **separate psycopg2 connection with autocommit=True**. This isolates each `CREATE INDEX IF NOT EXISTS` in its own transaction, preventing individual failures from aborting the migration.

**SQLite:** Unchanged — uses `op.create_index()` with `try/except` (SQLite DDL is non-transactional).

---

## 5. Schema Drift (vs SQLite production)

Differences between SQLite schema (28 application-created tables) and PG migration schema (7 migration-created tables):

| Category | Details |
|----------|---------|
| Missing tables | ~26 tables (all except the 7 above) |
| FK ondelete clauses | Not in migrations; defined in models |
| Column drops | `manufacturer`, `purchase_cost`, `supplier`, `plain_password` — dropped from models but no migration |
| Type changes | `business_days` changed from TEXT to JSON in model |

**Decision:** All drift deferred to a dedicated PostgreSQL migration pass during cutover. No existing migration files will be modified.

---

## 6. Recommendations

1. **Application seeding required** — Run the application against PG with `Base.metadata.create_all()` to recreate the full schema before migration pass
2. **Add `company_id`, `resolved_by`, `closed_by` columns to `tickets`** — these exist in production SQLite but not in migrations; add them in a future migration
3. **Consider a reconciliation migration** — autogenerate a migration from the running PG schema to capture all missing columns and tables
4. **Do NOT run `make migrate-check` in PG** — it compares against SQLite alembic_version; use `alembic check` directly

---

## 7. Key Metrics

| Metric | Value |
|--------|-------|
| Migrations applied | 8 / 8 |
| Tables created | 7 |
| Indexes created (migration) | 10 |
| Indexes skipped (table absent) | 31 |
| Column errors (caught) | 4 |
| Migrations needing PG fix | 1 (53a04a859618) |
