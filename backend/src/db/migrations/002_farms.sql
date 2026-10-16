-- 002_farms.sql: Farms table with coordinates and triggers maintaining farmers.farm_count
CREATE TABLE farms (
  farm_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id  INTEGER NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  farm_name  TEXT    NOT NULL,
  location   TEXT    NOT NULL,
  area       REAL    NOT NULL CHECK (area > 0),
  latitude   REAL    NOT NULL,
  longitude  REAL    NOT NULL,
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL
);
CREATE INDEX idx_farms_farmer ON farms (farmer_id);

CREATE TRIGGER trg_farms_after_insert AFTER INSERT ON farms
BEGIN
  UPDATE farmers SET farm_count = farm_count + 1 WHERE farmer_id = NEW.farmer_id;
END;

CREATE TRIGGER trg_farms_after_delete AFTER DELETE ON farms
BEGIN
  UPDATE farmers SET farm_count = MAX(farm_count - 1, 0) WHERE farmer_id = OLD.farmer_id;
END;
