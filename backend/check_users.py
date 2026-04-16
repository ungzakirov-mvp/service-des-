import sqlite3

conn = sqlite3.connect('/code/servicedesk.db')
cursor = conn.cursor()
cursor.execute("SELECT email, role, plain_password FROM users;")
for row in cursor.fetchall():
    print(f"{row[0]} | {row[1]} | {row[2]}")
conn.close()