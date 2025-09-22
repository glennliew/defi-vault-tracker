import { VaultWatcher } from '../services/vault-watcher';
import { db } from '../database/connection';
import { ethers } from 'ethers';

// Mock ethers
jest.mock('ethers');

// Mock database
jest.mock('../database/connection', () => ({
  db: {
    query: jest.fn(),
  },
}));

describe('VaultWatcher', () => {
  const mockProvider = {
    on: jest.fn(),
    call: jest.fn(),
    getBlockNumber: jest.fn(),
  };

  const mockContract = {
    balanceOf: jest.fn(),
    decimals: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ethers.providers.WebSocketProvider as unknown as jest.Mock).mockImplementation(() => mockProvider);
    (ethers.Contract as unknown as jest.Mock).mockImplementation(() => mockContract);
    (ethers.utils.formatUnits as unknown as jest.Mock).mockImplementation((value, decimals) => '100000');
    mockContract.decimals.mockResolvedValue(6);
  });

  describe('Mock Mode', () => {
    it('should start in mock mode and simulate TVL drops', (done) => {
      const watcher = new VaultWatcher(
        'http://localhost:8545',
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        '0x616a4E1db48e22028f6bbf20444Cd3b8e3273738',
        'base',
        true // mock mode
      );

      let insertCalls = 0;
      (db.query as jest.Mock).mockImplementation((query, params) => {
        if (query.includes('INSERT INTO tvl_points')) {
          insertCalls++;
          const tvl = parseFloat(params[3]);

          // Check for the expected TVL drop simulation
          if (insertCalls === 4) { // 4th insert should be the 25% drop
            expect(tvl).toBe(75000); // 25% drop from 100,000
          }

          if (insertCalls >= 4) {
            done(); // Test complete after detecting the drop
          }
        }

        if (query.includes('INSERT INTO alerts')) {
          const dropPct = parseFloat(params[3]);
          expect(dropPct).toBeGreaterThanOrEqual(0.20); // At least 20% drop
        }

        return Promise.resolve({ rows: [] });
      });

      watcher.start();
    }, 30000); // 30 second timeout for mock simulation
  });

  describe('TVL Calculation', () => {
    it('should correctly format USDC balance with 6 decimals', async () => {
      const mockBalance = ethers.BigNumber.from('100000000000'); // 100,000 USDC with 6 decimals
      mockContract.balanceOf.mockResolvedValue(mockBalance);
      (ethers.utils.formatUnits as jest.Mock).mockReturnValue('100000.0');

      const watcher = new VaultWatcher(
        'http://localhost:8545',
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        '0x616a4E1db48e22028f6bbf20444Cd3b8e3273738',
        'base',
        false
      );

      // Test the private method via reflection (for testing purposes)
      const tvl = await (watcher as any).getTvlAtBlock(12345);
      expect(tvl).toBe(100000);
    });
  });

  describe('Alert Detection', () => {
    it('should detect 20% or greater TVL drops', async () => {
      let alertInserted = false;

      (db.query as jest.Mock).mockImplementation((query, params) => {
        if (query.includes('INSERT INTO alerts')) {
          alertInserted = true;
          const dropPct = parseFloat(params[3]);
          expect(dropPct).toBeGreaterThanOrEqual(0.20);
        }
        return Promise.resolve({ rows: [] });
      });

      const watcher = new VaultWatcher(
        'http://localhost:8545',
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        '0x616a4E1db48e22028f6bbf20444Cd3b8e3273738',
        'base',
        false
      );

      // Simulate consecutive blocks with TVL drop
      await (watcher as any).processTvlData(1000, 100000); // Initial TVL
      await (watcher as any).processTvlData(1001, 75000);  // 25% drop

      expect(alertInserted).toBe(true);
    });

    it('should not trigger alerts for drops less than 20%', async () => {
      let alertInserted = false;

      (db.query as jest.Mock).mockImplementation((query, params) => {
        if (query.includes('INSERT INTO alerts')) {
          alertInserted = true;
        }
        return Promise.resolve({ rows: [] });
      });

      const watcher = new VaultWatcher(
        'http://localhost:8545',
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        '0x616a4E1db48e22028f6bbf20444Cd3b8e3273738',
        'base',
        false
      );

      // Simulate consecutive blocks with small TVL drop
      await (watcher as any).processTvlData(1000, 100000); // Initial TVL
      await (watcher as any).processTvlData(1001, 85000);  // 15% drop (below threshold)

      expect(alertInserted).toBe(false);
    });
  });
});