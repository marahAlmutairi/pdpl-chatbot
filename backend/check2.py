import sqlite3

DB = r"c:\Users\hp\OneDrive\سطح المكتب\pdpl-chatbot\backend\pdpl.db"
conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM messages")
print("total messages:", cur.fetchone()[0])
cur.execute("SELECT id, session_id, role, created_at FROM messages ORDER BY id DESC LIMIT 8")
for row in cur.fetchall():
    print(row)
conn.close()
