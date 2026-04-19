from app.database import SessionLocal
from app.models import TicketStatus
db = SessionLocal()
statuses = db.query(TicketStatus).all()
print([s.name for s in statuses])
db.close()