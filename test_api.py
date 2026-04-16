import requests
r = requests.post("http://localhost:8000/auth/login", json={"email": "admin@novumtech.uz", "password": "admin123"})
print(f"Status: {r.status_code}")
print(f"Response: {r.text[:200]}")