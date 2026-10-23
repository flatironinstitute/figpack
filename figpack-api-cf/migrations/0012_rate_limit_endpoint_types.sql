-- Migration number: 0012 	 2026-10-23T00:00:00.000Z

-- Allow every endpoint type used by checkRateLimit (types.ts EndpointType) in rate_limits.
-- The CHECK from 0002 only allowed general/upload/create_figure/admin, so inserts for
-- send_api_key and request_account failed and checkRateLimit let those requests through.
-- SQLite doesn't support ALTER COLUMN, so we recreate the table.

CREATE TABLE rate_limits_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL, -- User email or IP address
  identifier_type TEXT CHECK(identifier_type IN ('user','ip')) NOT NULL,
  endpoint_type TEXT CHECK(endpoint_type IN ('general','upload','create_figure','admin','send_api_key','request_account','copy_figure')) NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start INTEGER NOT NULL, -- Timestamp when the current window started
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

INSERT INTO rate_limits_new SELECT * FROM rate_limits;
DROP TABLE rate_limits;
ALTER TABLE rate_limits_new RENAME TO rate_limits;

CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, identifier_type, endpoint_type);
CREATE INDEX idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX idx_rate_limits_created_at ON rate_limits(created_at);
