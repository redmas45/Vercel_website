CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS clone_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_url TEXT NOT NULL UNIQUE,
  local_path TEXT NOT NULL UNIQUE,
  status_code INTEGER NOT NULL,
  content_type TEXT,
  html_content TEXT,
  url_hash TEXT NOT NULL UNIQUE,
  response_headers JSONB,
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clone_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_url TEXT NOT NULL UNIQUE,
  local_path TEXT NOT NULL UNIQUE,
  status_code INTEGER NOT NULL,
  content_type TEXT,
  binary_content BYTEA,
  response_headers JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pages_url_hash ON clone_pages (url_hash);
CREATE INDEX IF NOT EXISTS idx_assets_url_hash ON clone_assets (source_url);
