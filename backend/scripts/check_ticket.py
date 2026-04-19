from app.database import SessionLocal
from app.models import Ticket, TicketStatus
db = SessionLocal()
t = db.query(Ticket).get(1)
if t:
    print(f"Ticket status_id: {t.status_id}")
    s = db.query(TicketStatus).get(t.status_id)
    if s:
        print(f"Status: {s.name}, is_final: {s.is_final}")
    else:
        print(f"Status not found for id: {t.status_id}")
else:
    print("Ticket not found")
db.close()