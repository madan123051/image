from pathlib import Path
import sqlite3


schema = Path("database/schema.sql").read_text(encoding="utf-8")
database = sqlite3.connect(":memory:")
database.executescript(schema)
table_count = database.execute(
    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table'"
).fetchone()[0]
print(f"SQLite schema valid: {table_count} tables")
