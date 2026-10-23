-- Migration number: 0010 	 2026-10-23T00:00:00.000Z

-- One row per LLM request forwarded to OpenRouter by /llm/chat-completions
CREATE TABLE llm_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0, -- usage.cost from the OpenRouter response
  purpose TEXT, -- Optional client-supplied label, e.g. 'remix'
  generation_id TEXT, -- OpenRouter generation id, for reconciling with the OpenRouter dashboard
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_llm_usage_user_created ON llm_usage(user_email, created_at);
CREATE INDEX idx_llm_usage_created ON llm_usage(created_at);
