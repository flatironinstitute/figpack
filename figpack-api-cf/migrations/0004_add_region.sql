-- Migration number: 0004 	 2026-04-23T00:00:00.000Z

-- Add region column to buckets table
-- Required for AWS S3 buckets outside us-east-1 so presigned URLs are signed
-- with the correct SigV4 region. Cloudflare R2 uses 'auto'.
ALTER TABLE buckets ADD COLUMN region TEXT;
