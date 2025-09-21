import { Pool } from 'pg';

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface TvlPoint {
  id: number;
  vault_address: string;
  network: string;
  block_number: bigint;
  tvl_usdc: string;
  recorded_at: Date;
}

export interface Alert {
  id: number;
  vault_address: string;
  network: string;
  block_number: bigint;
  drop_pct: string;
  tvl_before: string;
  tvl_after: string;
  confirmed: boolean;
  created_at: Date;
}