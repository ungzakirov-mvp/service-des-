# Known Issues

> **Project:** ServiceDesk  
> **Date:** 2026-05-29  
> **Phase:** E.2 Production Readiness Freeze

---

## 1. Telegram Notifications Not Triggered From Web API

**Severity:** Medium  
**Status:** Accepted (feature gap)  
**Affects:** All users

Telegram notifications (ticket assignment, status change, new comment) are only triggered from within Telegram bot handlers. The web API routers (`create_ticket`, `update_ticket`, etc.) do NOT send Telegram notifications.

**Root cause:** The notification dispatch code evolved during Telegram bot development and was linked to command handlers rather than service-layer hooks.

**Workaround:** None for existing users. Future implementation should add notification dispatch to the service layer.

**Fix planned:** Add notification dispatch calls in service-layer methods (post-cutover).

---

## 2. SQLite Schema Drift — FK and Column Discrepancies

**Severity:** Low  
**Status:** Documented, deferred  
**Affects:** All SQLite deployments

The production SQLite database has foreign key constraints and columns that differ from Alembic migration definitions:

| Type | Detail |
|------|--------|
| FK ondelete | Migrations use cascade; models use `SET NULL` for some FKs |
| Missing columns | `tickets.company_id`, `tickets.resolved_by`, `tickets.closed_by` exist in DB but not in migrations |
| Dropped columns | `manufacturer`, `purchase_cost`, `supplier`, `plain_password` — dropped from models but no migration |
| Type change | `business_hours.business_days` — TEXT → JSON in model, no migration |

**Impact:** `make migrate-check` shows schema drift but is informational (exit 0). No functional impact on SQLite.

**Fix planned:** Reconciliation migration during PostgreSQL cutover.

---

## 3. Lint Baseline — 1699 Errors

**Severity:** Low  
**Status:** Deferred  
**Affects:** Development workflow

Running `ruff check` produces 1699 lint errors. These are pre-existing and unrelated to current work.

**Impact:** CI cannot gate on lint without a baseline. No functional impact.

**Fix planned:** Address incrementally post-cutover. Recommend setting a ruff baseline count.

---

## 4. Migration Index Creation Fails on PostgreSQL Without Autocommit Patch

**Severity:** Medium  
**Status:** Fixed  
**Affects:** PostgreSQL deployments only

Migration `53a04a859618` (add_performance_indexes) uses `except Exception: pass` around `op.create_index()`. On PostgreSQL, the caught exception leaves the transaction in an aborted state, causing the subsequent `UPDATE alembic_version` to fail.

**Fix applied:** The migration now uses a separate psycopg2 connection with `autocommit=True` on PostgreSQL, isolating each index creation in its own transaction.

**See:** `POSTGRES_SANDBOX_REPORT.md` §4

---

## 5. Application Tables Not Covered by Migrations

**Severity:** Low  
**Status:** Known, architectural  
**Affects:** PostgreSQL cutover

~26 of ~33 tables are created by application code (`Base.metadata.create_all()`) rather than Alembic migrations. On a fresh PostgreSQL database, only 7 tables exist after running all migrations.

**Impact:** PostgreSQL cutover requires running the application against the database first to create all tables, then running a reconciliation migration.

**Fix planned:** Generate reconciliation migration during PG cutover.

---

## 6. No Rate Limiting

**Severity:** Low  
**Status:** Feature gap  
**Affects:** All deployments

The login endpoint has no rate limiting. An attacker can brute-force credentials without throttling.

**Mitigation:** bcrypt cost=14 slows down attempts. JWT rotation mitigates session hijacking.

**Fix planned:** Add middleware-based rate limiting post-cutover.

---

## 7. No Automated Off-Site Backup

**Severity:** Low  
**Status:** Feature gap  
**Affects:** Disaster recovery

Backup is local to the server only (14-day retention). No automated off-site (S3, SCP, rsync) mechanism exists.

**Workaround:** Manual `scp backup/*.gz user@remote:backups/` available.

**Fix planned:** Add off-site sync via rclone/aws-cli post-cutover.

---

## 8. PostgreSQL Password in `.env` Unencrypted

**Severity:** Low  
**Status:** Accepted  
**Affects:** All deployments (if using PG)

PostgreSQL password is stored in plaintext in `.env` (`.env` file permissions set to 600).

**Mitigation:** `.env` is not checked into git. File permissions restrict access to service user.

**Fix planned:** Evaluate secrets manager (e.g., Docker secrets, HashiCorp Vault) for later phases.
