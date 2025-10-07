CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  chain TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_signature TEXT,
  event_args JSONB,
  event_raw JSONB,
  timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_contract ON events(contract_address);
CREATE INDEX IF NOT EXISTS idx_events_block ON events(block_number);
CREATE INDEX IF NOT EXISTS idx_events_txhash ON events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_events_chain ON events(chain);

CREATE TABLE IF NOT EXISTS wallet_links (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  wallet_address TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracker_state (
  key TEXT PRIMARY KEY,
  value TEXT
);
