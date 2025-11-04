-- Migration from MongoDB to D1
-- This migration creates tables matching the MongoDB schema structure

-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  research_description TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_api_key ON users(api_key);
CREATE INDEX idx_users_is_admin ON users(is_admin);

-- Figures table
CREATE TABLE figures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  figure_url TEXT NOT NULL UNIQUE,
  bucket TEXT,
  status TEXT CHECK(status IN ('uploading','completed','failed')) DEFAULT 'uploading',
  owner_email TEXT NOT NULL,
  upload_started INTEGER NOT NULL,
  upload_updated INTEGER NOT NULL,
  upload_completed INTEGER,
  expiration INTEGER NOT NULL,
  figpack_version TEXT NOT NULL,
  total_files INTEGER,
  total_size INTEGER,
  upload_progress TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  pinned INTEGER DEFAULT 0,
  title TEXT,
  -- Flattened pinInfo structure
  pin_name TEXT,
  pin_description TEXT,
  pinned_timestamp INTEGER,
  renewal_timestamp INTEGER,
  figure_management_url TEXT,
  figpack_manage_url TEXT,
  channel TEXT CHECK(channel IN ('default','ephemeral')) DEFAULT 'default',
  is_ephemeral INTEGER DEFAULT 0,
  source_url TEXT UNIQUE
);
CREATE INDEX idx_figures_figure_url ON figures(figure_url);
CREATE INDEX idx_figures_source_url ON figures(source_url);
CREATE INDEX idx_figures_bucket ON figures(bucket);
CREATE INDEX idx_figures_owner_email ON figures(owner_email);
CREATE INDEX idx_figures_status ON figures(status);
CREATE INDEX idx_figures_expiration ON figures(expiration);

-- Buckets table
-- MongoDB stores credentials and authorization as nested objects
-- D1 flattens these into top-level fields
CREATE TABLE buckets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  provider TEXT CHECK(provider IN ('cloudflare','aws')) NOT NULL,
  description TEXT NOT NULL,
  bucket_base_url TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  -- Flattened credentials
  aws_access_key_id TEXT NOT NULL,
  aws_secret_access_key TEXT NOT NULL,
  s3_endpoint TEXT NOT NULL,
  -- Flattened authorization
  is_public INTEGER NOT NULL DEFAULT 0,
  authorized_users TEXT DEFAULT '[]' -- JSON array of emails
);
CREATE INDEX idx_buckets_name ON buckets(name);
CREATE INDEX idx_buckets_provider ON buckets(provider);
CREATE INDEX idx_buckets_created_at ON buckets(created_at);

-- Figpack Documents table
-- MongoDB stores accessControl as nested object
-- D1 flattens these into top-level fields with descriptive names
CREATE TABLE figpack_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL UNIQUE,
  owner_email TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  figure_refs TEXT DEFAULT '[]', -- JSON array of figure URLs
  -- Flattened accessControl
  view_mode TEXT CHECK(view_mode IN ('owner-only','users','public')) DEFAULT 'owner-only',
  edit_mode TEXT CHECK(edit_mode IN ('owner-only','users')) DEFAULT 'owner-only',
  viewer_emails TEXT DEFAULT '[]', -- JSON array of emails
  editor_emails TEXT DEFAULT '[]', -- JSON array of emails
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_documents_document_id ON figpack_documents(document_id);
CREATE INDEX idx_documents_owner_email ON figpack_documents(owner_email);
CREATE INDEX idx_documents_created_at ON figpack_documents(created_at);
