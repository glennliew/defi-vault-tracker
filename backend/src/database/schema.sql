-- TVL tracking table
CREATE TABLE tvl_points (
  id SERIAL PRIMARY KEY,
  vault_address TEXT NOT NULL,
  network TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  tvl_usdc NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Alerts table
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  vault_address TEXT NOT NULL,
  network TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  drop_pct NUMERIC NOT NULL,
  tvl_before NUMERIC NOT NULL,
  tvl_after NUMERIC NOT NULL,
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_vault_time ON tvl_points(vault_address, recorded_at DESC);
CREATE UNIQUE INDEX ux_vault_block ON tvl_points(vault_address, block_number);
CREATE INDEX idx_alerts_vault ON alerts(vault_address, created_at DESC);