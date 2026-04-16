import sqlite3
conn = sqlite3.connect('/code/servicedesk.db')
c = conn.cursor()
c.execute("SELECT email, role FROM users;")
print(c.fetchall())
conn.close()