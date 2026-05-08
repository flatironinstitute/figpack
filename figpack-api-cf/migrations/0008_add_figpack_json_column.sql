-- Store figpack.json content in the figures table for client-managed
-- credential buckets (where the Worker cannot write to S3 directly).
ALTER TABLE figures ADD COLUMN figpack_json TEXT;
