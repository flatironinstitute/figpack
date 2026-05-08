-- Migration number: 0007 	 2026-05-07T00:00:00.000Z

-- Per-bucket override for the default figure expiration (seconds).
--   NULL  → use system default (24 hours for regular uploads)
--   0     → figures from this bucket never expire
--   N > 0 → figures expire N seconds after creation
ALTER TABLE buckets ADD COLUMN default_expiration_seconds INTEGER;
