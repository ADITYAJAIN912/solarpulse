import sqlite3

conn = sqlite3.connect('solarpulse.db')
cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor]
print("Tables:", tables)
conn.close()