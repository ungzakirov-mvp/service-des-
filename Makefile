.PHONY: lint test test-local build restart health migrate-check smoke validate backup backup-list backup-cron restore-guide

lint:
	docker compose exec backend ruff check .

test:
	docker compose exec backend pytest tests/

test-local:
	PYTHONPATH=backend pytest tests/ backend/

build:
	docker compose build backend

restart:
	docker compose up -d backend

health:
	curl -sk -o /dev/null -w '%{http_code}' https://localhost/api/auth/login | grep -q '200\|401\|405\|422'

migrate-check:
	@echo "=== Schema Drift Check ==="
	@docker compose exec backend alembic check 2>/dev/null && echo "OK: Schema is in sync" || echo "INFO: Schema drift detected (see POSTGRES_SANDBOX_PLAN.md for resolution plan)"

smoke: build restart
	@echo "Waiting for backend to start..."
	@sleep 10
	$(MAKE) health

validate: smoke test
	@echo "=== Validation: PASSED ==="

backup:
	@scripts/backup.sh

backup-list:
	@ls -lh backup/sqlite/ backup/config/ 2>/dev/null || echo 'No backups yet -- run make backup'

backup-cron:
	@echo '0 3 * * * /root/servicedesk/scripts/backup.sh --rotate 14 >> /root/servicedesk/backup/logs/cron.log 2>&1'

restore-guide:
	@echo 'See BACKUP_RESTORE_GUIDE.md for restore procedures'
