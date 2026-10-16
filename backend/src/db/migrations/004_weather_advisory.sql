-- 004_weather_advisory.sql: Weather data cache, crop advisories and advisory-weather links
CREATE TABLE weather_data (
  weather_id           INTEGER PRIMARY KEY AUTOINCREMENT,
  farm_id              INTEGER NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  type                 TEXT    NOT NULL CHECK (type IN ('current','forecast')),
  date                 TEXT    NOT NULL,
  temperature          REAL,
  temperature_max      REAL,
  temperature_min      REAL,
  humidity             REAL,
  rainfall             REAL,
  rainfall_probability REAL,
  wind_speed           REAL,
  weather_code         INTEGER,
  condition            TEXT,
  forecast             TEXT,
  fetched_at           TEXT    NOT NULL
);
CREATE INDEX idx_weather_lookup ON weather_data (farm_id, type, fetched_at);

CREATE TABLE crop_advisories (
  advisory_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  crop_id        INTEGER NOT NULL REFERENCES crops(crop_id) ON DELETE CASCADE,
  recommendation TEXT    NOT NULL,
  message        TEXT    NOT NULL,
  date           TEXT    NOT NULL,
  created_at     TEXT    NOT NULL
);
CREATE INDEX idx_advisories_crop ON crop_advisories (crop_id, advisory_id DESC);

CREATE TABLE advisory_weather (
  advisory_id INTEGER NOT NULL REFERENCES crop_advisories(advisory_id) ON DELETE CASCADE,
  weather_id  INTEGER NOT NULL REFERENCES weather_data(weather_id)     ON DELETE CASCADE,
  PRIMARY KEY (advisory_id, weather_id)
);
