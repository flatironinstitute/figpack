-- Migration number: 0003  2025-12-02T21:22:00.000Z

-- Add native_bucket_name column to buckets table
-- This field stores the actual bucket name on Cloudflare/AWS, separate from the figpack bucket name
ALTER TABLE buckets ADD COLUMN native_bucket_name TEXT;
