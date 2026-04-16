import sys
sys.path.insert(0, '/code')
from app.database import SessionLocal
from app.models import User

db = SessionLocal()
user = db.query(User).filter(User.email == "admin@novumtech.uz").first()
if user:
    print(f"User found: {user.email}, role: {user.role}")
    print(f"Password hash starts with: {user.password[:20]}...")
    from app.security import verify_password
    result = verify_password("admin123", user.password)
    print(f"Password verify result: {result}")
else:
    print("User not found")
db.close()