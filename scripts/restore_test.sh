#!/bin/bash
set -e
cd /root/servicedesk

echo "=== 1. Stop backend ==="
docker compose stop backend

echo "=== 2. Simulate DB corruption (rename) ==="
mv data/servicedesk.db data/servicedesk.db.pre_restore

echo "=== 3. Restore from backup ==="
gunzip -c backup/sqlite/servicedesk_20260529_053128.db.gz > data/servicedesk.db

echo "=== 4. Verify integrity ==="
sqlite3 data/servicedesk.db "PRAGMA integrity_check;"

echo "=== 5. Start backend ==="
docker compose up -d backend

echo "=== 6. Wait for readiness ==="
sleep 10

echo "=== 7. Health check ==="
curl -sk -o /dev/null -w "Health: HTTP %{http_code}\n" https://localhost/api/auth/login

echo "=== RESTORE COMPLETE ==="
