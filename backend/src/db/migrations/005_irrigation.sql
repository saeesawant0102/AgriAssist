-- Migration 005_irrigation.sql (Phase 5 - Irrigation Scheduling)
-- Requirement: Irrigation.Generate, Irrigation.View, Irrigation.Update, Irrigation.Skip, BR-5

CREATE TABLE irrigation_schedules (
  schedule_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  crop_id          INTEGER NOT NULL REFERENCES crops(crop_id) ON DELETE CASCADE,
  start_date       TEXT    NOT NULL,
  end_date         TEXT    NOT NULL,
  frequency        TEXT    NOT NULL,
  water_required   TEXT    NOT NULL,
  skip_recommended INTEGER NOT NULL DEFAULT 0 CHECK (skip_recommended IN (0,1)),
  note             TEXT    NOT NULL DEFAULT '',
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL
);
CREATE INDEX idx_schedules_crop ON irrigation_schedules (crop_id, schedule_id DESC);

CREATE TABLE irrigation_schedule_dates (
  schedule_id INTEGER NOT NULL REFERENCES irrigation_schedules(schedule_id) ON DELETE CASCADE,
  date        TEXT    NOT NULL,
  is_skipped  INTEGER NOT NULL CHECK (is_skipped IN (0,1)),
  PRIMARY KEY (schedule_id, date)
);

CREATE TABLE schedule_weather (
  schedule_id INTEGER NOT NULL REFERENCES irrigation_schedules(schedule_id) ON DELETE CASCADE,
  weather_id  INTEGER NOT NULL REFERENCES weather_data(weather_id)          ON DELETE CASCADE,
  PRIMARY KEY (schedule_id, weather_id)
);
