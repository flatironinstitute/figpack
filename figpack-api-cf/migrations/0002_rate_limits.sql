-- Migration number: 0002 	 2025-11-12T13:31:00.000Z

-- Rate limiting table for tracking API request counts
-- Stores request counts per user/IP per endpoint type with time windows
CREATE TABLE rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL, -- User email or IP address
  identifier_type TEXT CHECK(identifier_type IN ('user','ip')) NOT NULL,
  endpoint_type TEXT CHECK(endpoint_type IN ('general','upload','create_figure','admin')) NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start INTEGER NOT NULL, -- Timestamp when the current window started
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, identifier_type, endpoint_type);
CREATE INDEX idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX idx_rate_limits_created_at ON rate_limits(created_at);

-- Ephemeral figure tracking for global rate limiting
CREATE TABLE ephemeral_figures_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  window_start INTEGER NOT NULL, -- Timestamp when the current window started
  figure_count INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_ephemeral_tracking_window ON ephemeral_figures_tracking(window_start);
