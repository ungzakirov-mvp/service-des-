from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text('ALTER TABLE tickets ADD COLUMN resolved_at TIMESTAMP'))
        conn.commit()
        print('added resolved_at')
    except Exception as e:
        print(f'resolved_at: {e}')
    try:
        conn.execute(text('ALTER TABLE tickets ADD COLUMN resolved_by INTEGER REFERENCES users(id)'))
        conn.commit()
        print('added resolved_by')
    except Exception as e:
        print(f'resolved_by: {e}')
    
    # Update statuses
    try:
        conn.execute(text("DELETE FROM ticket_statuses WHERE name='Решён'"))
        conn.commit()
        print('deleted Решён')
    except Exception as e:
        print(f'delete Решён: {e}')
    
    # Check if awaiting client exists
    result = conn.execute(text("SELECT id FROM ticket_statuses WHERE name='Ожидает клиента'"))
    row = result.fetchone()
    if not row:
        conn.execute(text("INSERT INTO ticket_statuses (tenant_id, name, color, `order`) VALUES (1, 'Ожидает клиента', '#8b5cf6', 3)"))
        conn.commit()
        print('added Ожидает клиента')
    else:
        print('Ожидает клиента already exists')

print('Done!')
