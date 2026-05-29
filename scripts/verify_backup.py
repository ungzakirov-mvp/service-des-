#!/usr/bin/env python3
import sqlite3, gzip, os, json

BACKUP = "/root/servicedesk/backup/sqlite/servicedesk_20260529_053128.db.gz"
TEST_DB = "/tmp/verify_restore.db"

# Step 1: Verify backup gzip integrity
print("=== Step 1: Verify backup file ===")
assert os.path.getsize(BACKUP) > 0, "Backup file is empty!"
print(f"Backup file: {BACKUP} ({os.path.getsize(BACKUP)} bytes)")

# Step 2: Extract and verify SQLite integrity
print("\n=== Step 2: Extract and verify integrity ===")
with gzip.open(BACKUP, 'rb') as f:
    data = f.read()
with open(TEST_DB, 'wb') as f:
    f.write(data)

conn = sqlite3.connect(TEST_DB)
result = conn.execute("PRAGMA integrity_check").fetchone()[0]
assert result == "ok", f"Integrity check FAILED: {result}"
print("Integrity: OK")

# Step 3: Verify schema
print("\n=== Step 3: Verify schema ===")
tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()]
print(f"Tables ({len(tables)}): {', '.join(tables)}")
assert len(tables) >= 25, f"Expected 25+ tables, got {len(tables)}"
print("Schema: OK")

# Step 4: Verify data
print("\n=== Step 4: Verify data ===")
counts = {}
for t in ['users', 'tenants', 'tickets', 'ticket_statuses', 'companies', 'notifications']:
    if t in tables:
        cnt = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        counts[t] = cnt
        print(f"  {t}: {cnt} rows")

assert counts.get('users', 0) > 0, "No users found!"
assert counts.get('tenants', 0) > 0, "No tenants found!"
print("Data: OK")

# Step 5: Verify alembic version
print("\n=== Step 5: Verify alembic version ===")
av = conn.execute("SELECT version_num FROM alembic_version").fetchone()
print(f"Alembic version: {av[0] if av else 'NONE'}")
assert av is not None, "No alembic_version!"
print("Alembic: OK")

# Cleanup
conn.close()
os.remove(TEST_DB)
print("\n=== RESTORE VERIFICATION: BACKUP VALID ===")
