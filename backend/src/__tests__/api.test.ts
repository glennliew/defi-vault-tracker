import request from 'supertest';
import app from '../index';
import { db } from '../database/connection';


// Mock database
jest.mock('../database/connection', () => ({
  db: {
    query: jest.fn(),
  },
}));

// Mock vault watcher to prevent it from starting
jest.mock('../services/vault-watcher');

describe('API Endpoints', () => {
  const vaultAddress = '0x616a4E1db48e22028f6bbf20444Cd3b8e3273738';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/vaults/:vaultAddress/tvl/latest', () => {
    it('should return latest TVL data', async () => {
      const mockTvlData = {
        vault_address: vaultAddress.toLowerCase(),
        block_number: '12345',
        tvl_usdc: '100000.50',
        recorded_at: new Date().toISOString(),
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockTvlData],
      });

      const response = await request(app)
        .get(`/api/v1/vaults/${vaultAddress}/tvl/latest`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        vault_address: vaultAddress.toLowerCase(),
        block_number: 12345,
        tvl_usdc: 100000.50,
        recorded_at: mockTvlData.recorded_at,
      });
    });

    it('should return 404 when no TVL data exists', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const response = await request(app)
        .get(`/api/v1/vaults/${vaultAddress}/tvl/latest`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No TVL data found for vault');
    });
  });

  describe('GET /api/v1/vaults/:vaultAddress/tvl', () => {
    it('should return TVL history with limit', async () => {
      const mockHistoryData = [
        {
          vault_address: vaultAddress.toLowerCase(),
          block_number: '12344',
          tvl_usdc: '99000',
          recorded_at: new Date(Date.now() - 60000).toISOString(),
        },
        {
          vault_address: vaultAddress.toLowerCase(),
          block_number: '12345',
          tvl_usdc: '100000',
          recorded_at: new Date().toISOString(),
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockHistoryData,
      });

      const response = await request(app)
        .get(`/api/v1/vaults/${vaultAddress}/tvl?limit=10`);

      expect(response.status).toBe(200);
      expect(response.body.vault_address).toBe(vaultAddress.toLowerCase());
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].block_number).toBe(12345);
    });
  });

  describe('GET /api/v1/vaults/:vaultAddress/alerts', () => {
    it('should return alerts for vault', async () => {
      const mockAlerts = [
        {
          id: 1,
          vault_address: vaultAddress.toLowerCase(),
          network: 'base',
          block_number: '12345',
          drop_pct: '0.25',
          tvl_before: '100000',
          tvl_after: '75000',
          confirmed: false,
          created_at: new Date().toISOString(),
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockAlerts,
      });

      const response = await request(app)
        .get(`/api/v1/vaults/${vaultAddress}/alerts`);

      expect(response.status).toBe(200);
      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].drop_pct).toBe(0.25);
      expect(response.body.alerts[0].block_number).toBe(12345);
    });
  });

  describe('GET /api/v1/vaults/health', () => {
    it('should return healthy status', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ '?column?': 1 }],
      });

      const response = await request(app)
        .get('/api/v1/vaults/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });

    it('should return unhealthy status on database error', async () => {
      (db.query as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

      const response = await request(app)
        .get('/api/v1/vaults/health');

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('unhealthy');
    });
  });
});