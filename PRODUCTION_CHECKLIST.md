# Production Checklist

> **Project:** ServiceDesk  
> **Date:** 2026-05-29  
> **Phase:** E.2 Production Readiness Freeze  
> **Target:** First real client deployment

---

## Pre-Deployment

### Infrastructure

- [ ] **DNS records configured** — `app.novumtech.uz` (A/AAAA/CNAME), `api.novumtech.uz` (if separate)
- [ ] **SSL/TLS certificates** — Let's Encrypt via Certbot or reverse proxy. Auto-renewal configured
- [ ] **Server firewall** — ports 22, 80, 443 only. PostgreSQL port 5432 NOT exposed
- [ ] **Docker daemon** — running, auto-start enabled (`systemctl enable docker`)
- [ ] **Docker Compose** — latest stable version installed
- [ ] **Disk space** — verify `df -h`; SQLite DB + backups require < 1 GB initially
- [ ] **Swap** — configured if RAM < 2 GB

### Secrets & Credentials

- [ ] **JWT_SECRET_KEY** — generated (recommend: `openssl rand -hex 64`), stored in `.env`
- [ ] **POSTGRES_PASSWORD** — generated, stored in `.env` (even if using SQLite initially)
- [ ] **Telegram bot tokens** — configured for `@agent_novum_bot` and `@tickets_novum_bot`
- [ ] **Webhook secret** — `TELEGRAM_WEBHOOK_SECRET` set in `.env`
- [ ] **SMTP credentials** — if email notifications required
- [ ] **`.env` file permissions** — `chmod 600`, owned by service user

### Database

- [ ] **SQLite**: backup script installed via cron (verified in E.1)
- [ ] **PostgreSQL**: if deploying, run all 8 Alembic migrations, then seed with application
- [ ] **Migration check**: `alembic upgrade head` — no errors
- [ ] **Schema reconciliation**: if using PG, run `alembic check` and verify no drift

---

## Deployment

### Docker

- [ ] `docker compose build --no-cache` — clean build
- [ ] `docker compose up -d` — all services start cleanly
- [ ] `docker compose ps` — all services "Up" (backend, frontend, nginx, postgres if applicable)
- [ ] `docker compose logs --tail=50` — no ERROR log lines

### Health Checks

- [ ] `curl -f http://localhost:8000/health` — returns `{"status": "ok"}`
- [ ] `curl -f http://localhost:80/` — frontend loads (HTTP 200)
- [ ] `curl -f https://app.novumtech.uz/` — SSL works, redirects to HTTPS
- [ ] Login via browser — admin@novumtech.uz / admin123

### Functional Verification

- [ ] Create ticket — via UI and API
- [ ] Assign ticket — verify agent receives notification
- [ ] Add timeline entry — verify status change
- [ ] Link Telegram — `/start` on @agent_novum_bot, follow link
- [ ] Receive Telegram notification — on ticket assignment/update
- [ ] Run `make test` — all 56 integration tests pass

---

## Post-Deployment

### Monitoring

- [ ] **Health endpoint** monitored — set up uptime check (e.g., UptimeRobot, Prometheus)
- [ ] **Backup cron** verified — check `/var/log/cron` or equivalent for backup.sh execution
- [ ] **Log rotation** — Docker logs configured (`max-size: 10m`, `max-file: 3`)
- [ ] **Disk usage alert** — set threshold at 80%
- [ ] **Failed login alert** — monitor auth logs for brute force

### Backup

- [ ] **Daily backup** verified — check backup file exists in `backup/sqlite/`
- [ ] **Off-site backup** — optionally copy backup to S3/SCP (not yet automated)
- [ ] **Restore drill** — repeat restore verification monthly (use `scripts/restore_test.sh`)

### Security

- [ ] **Password policy** — enforce min 8 chars (bcrypt cost=14 already configured)
- [ ] **Rate limiting** — consider adding for login endpoint
- [ ] **CORS** — verify `CORS_ORIGINS` only includes trusted domains
- [ ] **Session expiry** — JWT tokens: access 30 min, refresh 7 days (default)

---

## Production Readiness Freeze Items

### Documented

- [x] `BACKUP_RESTORE_GUIDE.md` — DR procedures, restore decision tree, checklist
- [x] `POSTGRES_SANDBOX_PLAN.md` — migration strategy, risk assessment, decision gate
- [x] `OPERATIONAL_READINESS_REPORT.md` — consolidated readiness findings
- [x] `RESTORE_VERIFICATION_REPORT.md` — restore drill results
- [x] `POSTGRES_SANDBOX_REPORT.md` — migration compatibility results
- [x] `PRODUCTION_CHECKLIST.md` — this document
- [x] `KNOWN_ISSUES.md` — known issues register
- [x] `RELEASE_NOTES_v1.0.md` — changelog, known issues, upgrade notes

### Verified

- [x] Backup/restore cycle — functional (11/11 checks passed)
- [x] PostgreSQL migration — 8/8 applied, indexes handled
- [x] Telegram notification — link-token + webhook verified
- [x] CI/CD — `make validate` (smoke + test) passes
- [x] Lint baseline — 1699 errors documented, deferred

### Deferred

- [ ] Lint cleanup — 1699 errors; not blocking for initial deployment
- [ ] PostgreSQL cutover — sandbox only; production remains SQLite
- [ ] Off-site backup — manual SCP available; not automated
- [ ] Monitoring dashboard — Grafana / Prometheus not yet deployed
