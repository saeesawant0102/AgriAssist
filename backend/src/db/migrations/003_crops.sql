-- 003_crops.sql: Crops table with harvest_date constraint and foreign key cascade to farms
CREATE TABLE crops (
  crop_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  farm_id      INTEGER NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  crop_name    TEXT    NOT NULL,
  variety      TEXT,
  sowing_date  TEXT    NOT NULL,
  harvest_date TEXT,
  growth_stage TEXT    NOT NULL DEFAULT 'Sowing',
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL,
  CHECK (harvest_date IS NULL OR harvest_date >= sowing_date)
);
CREATE INDEX idx_crops_farm ON crops (farm_id);
