CREATE TABLE IF NOT EXISTS debug_logs (
  id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL,
  level TEXT NOT NULL,
  source TEXT NOT NULL,
  app TEXT,
  product TEXT,
  environment TEXT,
  session_id TEXT,
  install_id TEXT,
  user_id TEXT,
  region_id TEXT,
  route TEXT,
  message TEXT,
  payload TEXT,
  user_agent TEXT,
  os TEXT,
  os_version TEXT,
  device TEXT,
  app_version TEXT,
  request_id TEXT,
  tags TEXT
);

CREATE INDEX IF NOT EXISTS idx_debug_logs_received_at ON debug_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_app_received_at ON debug_logs(app, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_source_received_at ON debug_logs(source, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_level_received_at ON debug_logs(level, received_at DESC);
