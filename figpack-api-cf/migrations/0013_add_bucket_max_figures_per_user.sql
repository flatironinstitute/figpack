-- Migration number: 0013 	 2026-10-26T00:00:00.000Z

-- Per-bucket override for the maximum number of unexpired figures a user may have in the bucket.
--   NULL  → use system default (API_LIMITS.MAX_FIGURES_PER_USER)
--   0     → no limit
--   N > 0 → at most N figures per user
ALTER TABLE buckets ADD COLUMN max_figures_per_user INTEGER;
