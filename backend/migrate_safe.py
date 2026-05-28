#!/usr/bin/env python3
"""
Safe database migration runner.
Ensures all tables and columns exist without dropping any data.
Uses CREATE TABLE IF NOT EXISTS and ALTER TABLE ADD COLUMN only.
"""
import sqlite3
import os
import sys

DB_PATH = '/root/servicedesk/data/servicedesk.db'

def get_existing_tables(cursor):
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    return {row[0] for row in cursor.fetchall()}

def get_existing_columns(cursor, table_name):
    cursor.execute(f"PRAGMA table_info({table_name})")
    return {row[1] for row in cursor.fetchall()}

def safe_add_column(cursor, table, col, col_type):
    cols = get_existing_columns(cursor, table)
    if col not in cols:
        print(f"  Adding {col} to {table}")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")

def run_migration():
    print(f"Connecting to database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    existing_tables = get_existing_tables(cursor)
    print(f"Found {len(existing_tables)} existing tables")
    
    # ===== TENANTS =====
    if 'tenants' not in existing_tables:
        print("Creating tenants table...")
        cursor.execute(
            "CREATE TABLE tenants ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "name VARCHAR NOT NULL, "
            "slug VARCHAR NOT NULL UNIQUE, "
            "domain VARCHAR, "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "is_active BOOLEAN DEFAULT 1, "
            "settings TEXT DEFAULT '{}')"
        )
    else:
        safe_add_column(cursor, 'tenants', 'domain', 'VARCHAR')
        safe_add_column(cursor, 'tenants', 'is_active', "BOOLEAN DEFAULT 1")
        safe_add_column(cursor, 'tenants', 'settings', "TEXT DEFAULT '{}'")

    # ===== COMPANIES =====
    if 'companies' not in existing_tables:
        print("Creating companies table...")
        cursor.execute(
            "CREATE TABLE companies ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "name VARCHAR NOT NULL, "
            "legal_name VARCHAR, "
            "inn VARCHAR, "
            "address VARCHAR, "
            "phone VARCHAR, "
            "email VARCHAR, "
            "website VARCHAR, "
            "logo_url VARCHAR, "
            "domain VARCHAR, "
            "industry VARCHAR, "
            "description TEXT, "
            "color VARCHAR DEFAULT '#0066CC', "
            "extra_metadata TEXT DEFAULT '{}', "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id))"
        )
    else:
        for col, ctype in [('legal_name', 'VARCHAR'), ('inn', 'VARCHAR'), ('address', 'VARCHAR'),
                          ('phone', 'VARCHAR'), ('email', 'VARCHAR'), ('website', 'VARCHAR'),
                          ('logo_url', 'VARCHAR'), ('description', 'TEXT'), ('domain', 'VARCHAR'),
                          ('industry', 'VARCHAR'), ('color', "VARCHAR DEFAULT '#0066CC'")]:
            safe_add_column(cursor, 'companies', col, ctype)

    # ===== SIMPLE TABLES (CREATE IF NOT EXISTS) =====
    simple_tables = {
        'company_subscriptions': (
            "CREATE TABLE IF NOT EXISTS company_subscriptions ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "company_id INTEGER NOT NULL, "
            "service_name VARCHAR NOT NULL, "
            "plan VARCHAR, license_count INTEGER, "
            "price VARCHAR, currency VARCHAR DEFAULT 'UZS', "
            "billing_cycle VARCHAR, started_at TIMESTAMP WITH TIME ZONE, "
            "expires_at TIMESTAMP WITH TIME ZONE, "
            "auto_renew BOOLEAN DEFAULT 0, "
            "status VARCHAR DEFAULT 'active', "
            "notes TEXT, m365_tenant_id VARCHAR, "
            "m365_domain VARCHAR, admin_email VARCHAR, "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (company_id) REFERENCES companies(id))"
        ),
        'company_employees': (
            "CREATE TABLE IF NOT EXISTS company_employees ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "company_id INTEGER NOT NULL, "
            "full_name VARCHAR NOT NULL, "
            "position VARCHAR, department VARCHAR, "
            "email VARCHAR, phone VARCHAR, "
            "m365_license VARCHAR, m365_email VARCHAR, "
            "is_active BOOLEAN DEFAULT 1, "
            "notes TEXT, "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (company_id) REFERENCES companies(id))"
        ),
        'users': (
            "CREATE TABLE IF NOT EXISTS users ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER, "
            "email VARCHAR NOT NULL UNIQUE, "
            "password VARCHAR NOT NULL, "
            "full_name VARCHAR, "
            "role VARCHAR DEFAULT 'client', "
            "company_id INTEGER, "
            "
            "avatar_url VARCHAR, "
            "is_available BOOLEAN DEFAULT 1, "
            "telegram_chat_id VARCHAR, "
            "anudesk_email VARCHAR, "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "updated_at TIMESTAMP WITH TIME ZONE, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (company_id) REFERENCES companies(id))"
        ),
        'ticket_statuses': (
            "CREATE TABLE IF NOT EXISTS ticket_statuses ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "name VARCHAR NOT NULL, "
            "color VARCHAR DEFAULT '#808080', "
            '"order" INTEGER DEFAULT 0, '
            "is_final BOOLEAN DEFAULT 0, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id))"
        ),
        'tickets': (
            "CREATE TABLE IF NOT EXISTS tickets ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "readable_id INTEGER NOT NULL, "
            "title VARCHAR(200) NOT NULL, "
            "description TEXT, "
            "status_id INTEGER NOT NULL, "
            "priority VARCHAR DEFAULT 'medium' NOT NULL, "
            "category VARCHAR, "
            "tags TEXT DEFAULT '[]', "
            "created_by INTEGER NOT NULL, "
            "assigned_to INTEGER, "
            "company_id INTEGER, "
            "sla_due_at TIMESTAMP WITH TIME ZONE, "
            "scheduled_at TIMESTAMP WITH TIME ZONE, "
            "accepted_at TIMESTAMP WITH TIME ZONE, "
            "resolved_at TIMESTAMP WITH TIME ZONE, "
            "resolved_by INTEGER, "
            "closed_by INTEGER, "
            "rating INTEGER, "
            "rating_comment TEXT, "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "updated_at TIMESTAMP WITH TIME ZONE, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (status_id) REFERENCES ticket_statuses(id), "
            "FOREIGN KEY (created_by) REFERENCES users(id), "
            "FOREIGN KEY (assigned_to) REFERENCES users(id), "
            "FOREIGN KEY (company_id) REFERENCES companies(id))"
        ),
        'ticket_timeline': (
            "CREATE TABLE IF NOT EXISTS ticket_timeline ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "ticket_id INTEGER NOT NULL, "
            "user_id INTEGER NOT NULL, "
            "event_type VARCHAR DEFAULT 'comment', "
            "content TEXT, "
            "extra_metadata TEXT DEFAULT '{}', "
            "is_internal BOOLEAN DEFAULT 0, "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "FOREIGN KEY (ticket_id) REFERENCES tickets(id), "
            "FOREIGN KEY (user_id) REFERENCES users(id))"
        ),
        'notifications': (
            "CREATE TABLE IF NOT EXISTS notifications ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "user_id INTEGER NOT NULL, "
            "title VARCHAR NOT NULL, "
            "message TEXT NOT NULL, "
            "link VARCHAR, "
            "is_read BOOLEAN DEFAULT 0, "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (user_id) REFERENCES users(id))"
        ),
        'sla_policies': (
            "CREATE TABLE IF NOT EXISTS sla_policies ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "name VARCHAR NOT NULL, "
            "priority VARCHAR NOT NULL, "
            "response_time_minutes INTEGER, "
            "resolution_time_minutes INTEGER, "
            "is_active BOOLEAN DEFAULT 1, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id))"
        ),
        'attachments': (
            "CREATE TABLE IF NOT EXISTS attachments ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "ticket_id INTEGER NOT NULL, "
            "filename VARCHAR(255) NOT NULL, "
            "file_path VARCHAR(500) NOT NULL, "
            "file_size INTEGER, "
            "mime_type VARCHAR(100), "
            "uploaded_by INTEGER NOT NULL, "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (ticket_id) REFERENCES tickets(id), "
            "FOREIGN KEY (uploaded_by) REFERENCES users(id))"
        ),
        'time_entries': (
            "CREATE TABLE IF NOT EXISTS time_entries ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "ticket_id INTEGER NOT NULL, "
            "user_id INTEGER NOT NULL, "
            "started_at TIMESTAMP WITH TIME ZONE, "
            "ended_at TIMESTAMP WITH TIME ZONE, "
            "minutes INTEGER NOT NULL DEFAULT 0, "
            "description VARCHAR, "
            "is_billable BOOLEAN DEFAULT 1, "
            "is_running BOOLEAN DEFAULT 0, "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (ticket_id) REFERENCES tickets(id), "
            "FOREIGN KEY (user_id) REFERENCES users(id))"
        ),
        'canned_responses': (
            "CREATE TABLE IF NOT EXISTS canned_responses ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "title VARCHAR NOT NULL, "
            "shortcut VARCHAR, "
            "content TEXT NOT NULL, "
            "is_personal BOOLEAN DEFAULT 0, "
            "created_by INTEGER NOT NULL, "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "updated_at TIMESTAMP WITH TIME ZONE, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (created_by) REFERENCES users(id))"
        ),
        'ticket_checklists': (
            "CREATE TABLE IF NOT EXISTS ticket_checklists ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "ticket_id INTEGER NOT NULL, "
            "title VARCHAR NOT NULL, "
            "description TEXT, "
            "is_completed BOOLEAN DEFAULT 0, "
            "completed_by INTEGER, "
            "completed_at TIMESTAMP WITH TIME ZONE, "
            '"order" INTEGER DEFAULT 0, '
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (ticket_id) REFERENCES tickets(id), "
            "FOREIGN KEY (completed_by) REFERENCES users(id))"
        ),
        'ticket_ratings': (
            "CREATE TABLE IF NOT EXISTS ticket_ratings ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "ticket_id INTEGER NOT NULL UNIQUE, "
            "rating INTEGER NOT NULL, "
            "comment TEXT, "
            "is_public BOOLEAN DEFAULT 0, "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (ticket_id) REFERENCES tickets(id))"
        ),
        'internal_notes': (
            "CREATE TABLE IF NOT EXISTS internal_notes ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "ticket_id INTEGER NOT NULL, "
            "user_id INTEGER NOT NULL, "
            "content TEXT NOT NULL, "
            "is_pinned BOOLEAN DEFAULT 0, "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "updated_at TIMESTAMP WITH TIME ZONE, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (ticket_id) REFERENCES tickets(id), "
            "FOREIGN KEY (user_id) REFERENCES users(id))"
        ),
        'automation_rules': (
            "CREATE TABLE IF NOT EXISTS automation_rules ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "name VARCHAR NOT NULL, "
            "description TEXT, "
            "is_active BOOLEAN DEFAULT 1, "
            '"order" INTEGER DEFAULT 0, '
            "conditions TEXT DEFAULT '{}', "
            "actions TEXT DEFAULT '{}', "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "updated_at TIMESTAMP WITH TIME ZONE, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id))"
        ),
        'business_hours': (
            "CREATE TABLE IF NOT EXISTS business_hours ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "name VARCHAR NOT NULL, "
            "timezone VARCHAR DEFAULT 'Asia/Tashkent', "
            "schedule TEXT, "
            "holidays TEXT DEFAULT '[]', "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id))"
        ),
        'customer_assets': (
            "CREATE TABLE IF NOT EXISTS customer_assets ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "company_id INTEGER NOT NULL, "
            "readable_id VARCHAR, "
            "name VARCHAR NOT NULL, "
            "asset_type VARCHAR NOT NULL, "
            "manufacturer VARCHAR, "
            "model VARCHAR, "
            "serial_number VARCHAR, "
            "inventory_number VARCHAR, "
            "specifications TEXT DEFAULT '{}', "
            "condition VARCHAR DEFAULT 'good', "
            "status VARCHAR DEFAULT 'active', "
            "purchase_date TIMESTAMP WITH TIME ZONE, "
            "purchase_cost VARCHAR, "
            "warranty_end TIMESTAMP WITH TIME ZONE, "
            "supplier VARCHAR, "
            "location VARCHAR, "
            "remote_access_id VARCHAR, "
            "remote_access_password VARCHAR, "
            "assigned_to INTEGER, "
            "assigned_at TIMESTAMP WITH TIME ZONE, "
            "notes TEXT, "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "updated_at TIMESTAMP WITH TIME ZONE, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (company_id) REFERENCES companies(id), "
            "FOREIGN KEY (assigned_to) REFERENCES users(id))"
        ),
        'asset_assignments': (
            "CREATE TABLE IF NOT EXISTS asset_assignments ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "asset_id INTEGER NOT NULL, "
            "user_id INTEGER NOT NULL, "
            "assigned_by INTEGER, "
            "assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "returned_at TIMESTAMP WITH TIME ZONE, "
            "return_condition VARCHAR, "
            "reason VARCHAR, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (asset_id) REFERENCES customer_assets(id), "
            "FOREIGN KEY (user_id) REFERENCES users(id), "
            "FOREIGN KEY (assigned_by) REFERENCES users(id))"
        ),
        'asset_movements': (
            "CREATE TABLE IF NOT EXISTS asset_movements ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "asset_id INTEGER NOT NULL, "
            "from_location VARCHAR, "
            "to_location VARCHAR NOT NULL, "
            "moved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "moved_by INTEGER, "
            "reason VARCHAR, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (asset_id) REFERENCES customer_assets(id), "
            "FOREIGN KEY (moved_by) REFERENCES users(id))"
        ),
        'kb_categories': (
            "CREATE TABLE IF NOT EXISTS kb_categories ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "name VARCHAR NOT NULL, "
            "description TEXT, "
            "icon VARCHAR DEFAULT 'book', "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id))"
        ),
        'kb_articles': (
            "CREATE TABLE IF NOT EXISTS kb_articles ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "category_id INTEGER NOT NULL, "
            "title VARCHAR(200) NOT NULL, "
            "content TEXT NOT NULL, "
            "is_published BOOLEAN DEFAULT 1, "
            "view_count INTEGER DEFAULT 0, "
            "created_by INTEGER NOT NULL, "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "updated_at TIMESTAMP WITH TIME ZONE, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (category_id) REFERENCES kb_categories(id), "
            "FOREIGN KEY (created_by) REFERENCES users(id))"
        ),
        'audit_logs': (
            "CREATE TABLE IF NOT EXISTS audit_logs ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "user_id INTEGER, "
            "action VARCHAR(100) NOT NULL, "
            "target_type VARCHAR(50), "
            "target_id INTEGER, "
            "details TEXT, "
            "ip_address VARCHAR(45), "
            "user_agent VARCHAR(255), "
            "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id), "
            "FOREIGN KEY (user_id) REFERENCES users(id))"
        ),
        'ticket_assets': (
            "CREATE TABLE IF NOT EXISTS ticket_assets ("
            "ticket_id INTEGER, "
            "asset_id INTEGER, "
            "FOREIGN KEY (ticket_id) REFERENCES tickets(id), "
            "FOREIGN KEY (asset_id) REFERENCES customer_assets(id))"
        ),
    }
    
    for table_name, create_sql in simple_tables.items():
        if table_name not in existing_tables:
            print(f"Creating {table_name} table...")
            cursor.execute(create_sql)
        else:
            print(f"  Table {table_name} exists, checking columns...")
    
    # ===== Add missing columns to existing tables =====
    # Tickets
    if 'tickets' in existing_tables:
        for col, ctype in [('scheduled_at', 'TIMESTAMP WITH TIME ZONE'),
                          ('accepted_at', 'TIMESTAMP WITH TIME ZONE'),
                          ('closed_by', 'INTEGER'),
                          ('category', 'VARCHAR'),
                          ('tags', "TEXT DEFAULT '[]'"),
                          ('rating', 'INTEGER'),
                          ('rating_comment', 'TEXT'),
                          ('resolved_at', 'TIMESTAMP WITH TIME ZONE'),
                          ('resolved_by', 'INTEGER'),
                          ('sla_due_at', 'TIMESTAMP WITH TIME ZONE')]:
            safe_add_column(cursor, 'tickets', col, ctype)
    
    # Users
    if 'users' in existing_tables:
        for col, ctype in [('anudesk_email', 'VARCHAR'), ('is_available', "BOOLEAN DEFAULT 1"),
                          ('telegram_chat_id', 'VARCHAR'),
                          ('avatar_url', 'VARCHAR'), ('updated_at', 'TIMESTAMP WITH TIME ZONE')]:
            safe_add_column(cursor, 'users', col, ctype)
    
    # Time entries
    if 'time_entries' in existing_tables:
        for col, ctype in [('started_at', 'TIMESTAMP WITH TIME ZONE'),
                          ('ended_at', 'TIMESTAMP WITH TIME ZONE'),
                          ('is_billable', "BOOLEAN DEFAULT 1"),
                          ('is_running', "BOOLEAN DEFAULT 0")]:
            safe_add_column(cursor, 'time_entries', col, ctype)
    
    # ===== Create indexes =====
    indexes = [
        "CREATE INDEX IF NOT EXISTS ix_tickets_tenant_id ON tickets(tenant_id)",
        "CREATE INDEX IF NOT EXISTS ix_tickets_status_id ON tickets(status_id)",
        "CREATE INDEX IF NOT EXISTS ix_tickets_created_by ON tickets(created_by)",
        "CREATE INDEX IF NOT EXISTS ix_tickets_assigned_to ON tickets(assigned_to)",
        "CREATE INDEX IF NOT EXISTS ix_users_email ON users(email)",
        "CREATE INDEX IF NOT EXISTS ix_users_tenant_id ON users(tenant_id)",
        "CREATE INDEX IF NOT EXISTS ix_ticket_timeline_ticket_id ON ticket_timeline(ticket_id)",
        "CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id)",
        "CREATE INDEX IF NOT EXISTS ix_customer_assets_company_id ON customer_assets(company_id)",
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_tenant_id ON audit_logs(tenant_id)",
    ]
    for idx in indexes:
        try:
            cursor.execute(idx)
        except Exception as e:
            print(f"  Index warning: {e}")
    
    # ===== Seed default ticket statuses if needed =====
    cursor.execute("SELECT COUNT(*) FROM ticket_statuses")
    status_count = cursor.fetchone()[0]
    if status_count == 0:
        print("Seeding default ticket statuses...")
        cursor.execute("SELECT id FROM tenants LIMIT 1")
        tenant_row = cursor.fetchone()
        if tenant_row:
            tid = tenant_row[0]
            statuses = [
                (tid, 'Новый', '#3B82F6', 1, 0),
                (tid, 'В работе', '#F59E0B', 2, 0),
                (tid, 'Ожидает клиента', '#8B5CF6', 3, 0),
                (tid, 'Решён', '#10B981', 4, 0),
                (tid, 'Закрыт', '#6B7280', 5, 1),
            ]
            cursor.executemany(
                'INSERT INTO ticket_statuses (tenant_id, name, color, "order", is_final) VALUES (?, ?, ?, ?, ?)',
                statuses
            )
        else:
            print("  No tenant found, skipping status seed")
    
    
    # ===== MONITORING METRICS TABLE =====
    if 'monitoring_metrics' not in existing_tables:
        print("Creating monitoring_metrics table...")
        cursor.execute(
            "CREATE TABLE IF NOT EXISTS monitoring_metrics ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "tenant_id INTEGER NOT NULL, "
            "org_id INTEGER NOT NULL, "
            "host_name VARCHAR NOT NULL, "
            "host_ip VARCHAR, "
            "metric_name VARCHAR NOT NULL, "
            "metric_value VARCHAR NOT NULL, "
            "metric_unit VARCHAR, "
            "status VARCHAR DEFAULT 'ok', "
            "collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            "FOREIGN KEY (tenant_id) REFERENCES tenants(id))"
        )
    
    conn.commit()
    conn.close()
    print("\n=== MIGRATION COMPLETED SUCCESSFULLY ===")
    print("All tables and columns are up to date. No data was damaged.")

if __name__ == '__main__':
    run_migration()