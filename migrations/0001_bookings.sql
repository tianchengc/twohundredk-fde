CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  topic TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  timezone TEXT,
  notes TEXT,
  consent INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'website-form',
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings (status, created_at);
