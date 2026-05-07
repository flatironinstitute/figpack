-- Migration number: 0005 	 2026-05-07T00:00:00.000Z

-- Add owner_email to buckets so non-admin users can create and manage their own buckets.
-- NULL means the bucket is admin/system-managed (legacy rows).
ALTER TABLE buckets ADD COLUMN owner_email TEXT;
CREATE INDEX idx_buckets_owner_email ON buckets(owner_email);
