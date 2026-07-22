PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  center_lat REAL NOT NULL,
  center_lon REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL REFERENCES regions(id),
  name TEXT NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('full', 'light', 'fence')),
  latitude REAL,
  longitude REAL,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'warning', 'critical')),
  firmware_version TEXT,
  battery_v REAL,
  battery_pct REAL,
  signal_rssi REAL,
  signal_snr REAL,
  gateway_id TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS telemetry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id TEXT NOT NULL REFERENCES nodes(id),
  device_timestamp TEXT,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  temp_5 REAL,
  temp_15 REAL,
  temp_30 REAL,
  temp_45 REAL,
  co REAL,
  co2 REAL,
  ch4 REAL,
  moisture REAL,
  water_table REAL,
  ambient_temp REAL,
  ambient_rh REAL,
  battery_v REAL,
  battery_pct REAL,
  signal_rssi REAL,
  signal_snr REAL,
  source TEXT NOT NULL CHECK (source IN ('mqtt', 'websocket', 'http', 'seed')),
  raw_payload TEXT
) STRICT;

CREATE INDEX IF NOT EXISTS telemetry_by_node_time ON telemetry(node_id, received_at DESC);
CREATE INDEX IF NOT EXISTS telemetry_by_received_at ON telemetry(received_at DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL REFERENCES nodes(id),
  telemetry_id INTEGER REFERENCES telemetry(id),
  level TEXT NOT NULL CHECK (level IN ('monitoring', 'suspicious', 'warning')),
  state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'acknowledged', 'investigating', 'resolved', 'false_positive')),
  explanation TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TEXT,
  acknowledged_by TEXT,
  resolved_at TEXT,
  resolution_note TEXT
) STRICT;

CREATE INDEX IF NOT EXISTS alerts_by_state_time ON alerts(state, created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_by_node_state ON alerts(node_id, state);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL REFERENCES regions(id),
  alert_id TEXT REFERENCES alerts(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'contained', 'monitoring', 'resolved')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  latitude REAL,
  longitude REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

INSERT OR IGNORE INTO regions (id, name, code, description, center_lat, center_lon)
VALUES ('region-uminh', 'U Minh Forest', 'UM', 'EmberRoot pilot monitoring area', 9.6600, 105.0400);

INSERT OR IGNORE INTO nodes (
  id, region_id, name, node_type, latitude, longitude, status, firmware_version,
  battery_v, battery_pct, signal_rssi, signal_snr, gateway_id, last_seen_at
) VALUES (
  'node_01', 'region-uminh', 'U Minh Forest - Full Station 01', 'full', 9.6600, 105.0400,
  'online', '0.1.0', 4.08, 92, -82, 7.5, 'gateway-01', CURRENT_TIMESTAMP
);
