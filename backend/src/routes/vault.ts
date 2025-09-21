import express from 'express';
import { db } from '../database/connection';

const router = express.Router();

// Get latest TVL for a vault
router.get('/:vaultAddress/tvl/latest', async (req, res) => {
  try {
    const { vaultAddress } = req.params;

    const result = await db.query(
      `SELECT vault_address, block_number, tvl_usdc, recorded_at
       FROM tvl_points
       WHERE vault_address = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [vaultAddress.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No TVL data found for vault' });
    }

    const tvlData = result.rows[0];
    res.json({
      vault_address: tvlData.vault_address,
      block_number: parseInt(tvlData.block_number),
      tvl_usdc: parseFloat(tvlData.tvl_usdc),
      recorded_at: tvlData.recorded_at
    });
  } catch (error) {
    console.error('Error fetching latest TVL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get TVL history for a vault
router.get('/:vaultAddress/tvl', async (req, res) => {
  try {
    const { vaultAddress } = req.params;
    const { from, to, limit = '100' } = req.query;

    let query = `
      SELECT vault_address, block_number, tvl_usdc, recorded_at
      FROM tvl_points
      WHERE vault_address = $1
    `;
    const params = [vaultAddress.toLowerCase()];

    if (from) {
      query += ` AND recorded_at >= $${params.length + 1}`;
      params.push(from as string);
    }

    if (to) {
      query += ` AND recorded_at <= $${params.length + 1}`;
      params.push(to as string);
    }

    query += ` ORDER BY recorded_at DESC LIMIT $${params.length + 1}`;
    params.push(limit as string);

    const result = await db.query(query, params);

    const tvlHistory = result.rows.map(row => ({
      vault_address: row.vault_address,
      block_number: parseInt(row.block_number),
      tvl_usdc: parseFloat(row.tvl_usdc),
      recorded_at: row.recorded_at
    }));

    res.json({
      vault_address: vaultAddress.toLowerCase(),
      data: tvlHistory.reverse() // Return in chronological order
    });
  } catch (error) {
    console.error('Error fetching TVL history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get alerts for a vault
router.get('/:vaultAddress/alerts', async (req, res) => {
  try {
    const { vaultAddress } = req.params;
    const { limit = '10' } = req.query;

    const result = await db.query(
      `SELECT * FROM alerts
       WHERE vault_address = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [vaultAddress.toLowerCase(), limit]
    );

    const alerts = result.rows.map(row => ({
      id: row.id,
      vault_address: row.vault_address,
      network: row.network,
      block_number: parseInt(row.block_number),
      drop_pct: parseFloat(row.drop_pct),
      tvl_before: parseFloat(row.tvl_before),
      tvl_after: parseFloat(row.tvl_after),
      confirmed: row.confirmed,
      created_at: row.created_at
    }));

    res.json({
      vault_address: vaultAddress.toLowerCase(),
      alerts
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

export default router;