#!/usr/bin/env python3
"""Hash all plain_password values with bcrypt and clear them."""
import sys
sys.path.insert(0, '/root/servicedesk/backend')
from passlib.hash import bcrypt
import sqlite3

DB_PATH = '/root/servicedesk/data/servicedesk.db'
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT id, email, plain_password FROM users WHERE plain_password IS NOT NULL AND plain_password != ''")
users = cursor.fetchall()
print(f"Found {len(users)} users with plain_password")

hashed = 0
for user_id, email, plain_pwd in users:
    if plain_pwd:
        hashed_pwd = bcrypt.hash(plain_pwd)
        cursor.execute("UPDATE users SET password = ? WHERE id = ?", (hashed_pwd, user_id))
        cursor.execute("UPDATE users SET plain_password = '' WHERE id = ?", ('', user_id))
        hashed += 1
        print(f"  Hashed password for user {email} (id={user_id})")

conn.commit()
conn.close()
print(f"Done. Hashed {hashed} passwords. plain_password fields cleared.")
