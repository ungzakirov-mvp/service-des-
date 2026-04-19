from app.database import SessionLocal
from app.models import Ticket
db = SessionLocal()
t = db.query(Ticket).get(1)
print(f"status_id={t.status_id}, accepted_at={t.accepted_at}")
db.close()