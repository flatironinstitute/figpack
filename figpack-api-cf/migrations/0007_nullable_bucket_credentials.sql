-- Make AWS credentials nullable so buckets can use client-side credential
-- resolution (e.g. boto3 with SSO/STS) instead of storing secrets in the DB.

-- SQLite doesn't support ALTER COLUMN, so we recreate the table.
-- The only change is that aws_access_key_id, aws_secret_access_key, and
-- s3_endpoint are now nullable (drop NOT NULL).

CREATE TABLE buckets_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  provider TEXT CHECK(provider IN ('cloudflare','aws')) NOT NULL,
  description TEXT NOT NULL,
  bucket_base_url TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  -- Flattened credentials (nullable for client-managed credential buckets)
  aws_access_key_id TEXT,
  aws_secret_access_key TEXT,
  aws_session_token TEXT,
  s3_endpoint TEXT,
  -- Authorization
  is_public INTEGER NOT NULL DEFAULT 0,
  authorized_users TEXT DEFAULT '[]',
  -- Native bucket name
  native_bucket_name TEXT,
  -- Region
  region TEXT,
  -- Owner
  owner_email TEXT
);

INSERT INTO buckets_new
  SELECT id, name, provider, description, bucket_base_url,
         created_at, updated_at,
         aws_access_key_id, aws_secret_access_key, aws_session_token, s3_endpoint,
         is_public, authorized_users,
         native_bucket_name, region, owner_email
  FROM buckets;

DROP TABLE buckets;
ALTER TABLE buckets_new RENAME TO buckets;

CREATE INDEX idx_buckets_name ON buckets(name);
CREATE INDEX idx_buckets_provider ON buckets(provider);
CREATE INDEX idx_buckets_created_at ON buckets(created_at);
CREATE INDEX idx_buckets_owner_email ON buckets(owner_email);
