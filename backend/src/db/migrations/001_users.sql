-- 001_users.sql: Users, Farmers and Administrators tables
CREATE TABLE users (
  user_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  firebase_uid TEXT    NOT NULL UNIQUE,
  user_type    TEXT    NOT NULL CHECK (user_type IN ('farmer','administrator')),
  name         TEXT    NOT NULL,
  email        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  phone        TEXT,
  address      TEXT,
  status       TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL
);

CREATE TABLE farmers (
  farmer_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  farm_count INTEGER NOT NULL DEFAULT 0 CHECK (farm_count >= 0)
);

CREATE TABLE administrators (
  admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  role     TEXT    NOT NULL
);

CREATE INDEX idx_users_type_status ON users (user_type, status, user_id);
