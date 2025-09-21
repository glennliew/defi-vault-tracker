import { ethers } from 'ethers';
import { db } from '../database/connection';
import ERC20_ABI from '../abi/erc20.json';

export class VaultWatcher {
  private provider: ethers.providers.BaseProvider;
  private usdcContract: ethers.Contract;
  private lastBlockTvl: { block: number; tvl: number } | null = null;
  private vaultAddress: string;
  private network: string;
  private mockMode: boolean;
  private mockBlockNumber: number = 1000000;
  private mockBaseTvl: number = 100000; // $100k base TVL

  constructor(
    rpcUrl: string,
    usdcAddress: string,
    vaultAddress: string,
    network: string,
    mockMode: boolean = false
  ) {
    this.vaultAddress = vaultAddress.toLowerCase();
    this.network = network;
    this.mockMode = mockMode;

    if (!mockMode) {
      // Try WebSocket first, fallback to HTTP
      try {
        this.provider = new ethers.providers.WebSocketProvider(rpcUrl);
      } catch {
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      }
      this.usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, this.provider);
    } else {
      // Mock provider for testing
      this.provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
      this.usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI);
    }
  }

  async start() {
    if (this.mockMode) {
      console.log('Starting vault watcher in MOCK MODE');
      this.startMockWatcher();
    } else {
      console.log('Starting vault watcher for', this.vaultAddress);
      this.startRealWatcher();
    }
  }

  private startRealWatcher() {
    if (this.provider instanceof ethers.providers.WebSocketProvider) {
      this.provider.on('block', this.handleNewBlock.bind(this));
    } else {
      // Poll every 12 seconds (Base block time is ~2 seconds, but we don't want to spam)
      setInterval(async () => {
        try {
          const blockNumber = await this.provider.getBlockNumber();
          await this.handleNewBlock(blockNumber);
        } catch (error) {
          console.error('Error polling for new blocks:', error);
        }
      }, 12000);
    }
  }

  private startMockWatcher() {
    let blockCounter = 0;
    const mockBlocks = [
      { block: this.mockBlockNumber, tvl: this.mockBaseTvl },
      { block: this.mockBlockNumber + 1, tvl: this.mockBaseTvl * 1.02 }, // +2%
      { block: this.mockBlockNumber + 2, tvl: this.mockBaseTvl * 1.01 }, // +1%
      { block: this.mockBlockNumber + 3, tvl: this.mockBaseTvl * 0.75 }, // -25% DROP!
      { block: this.mockBlockNumber + 4, tvl: this.mockBaseTvl * 0.50 }, // -50% SECOND DROP!
      { block: this.mockBlockNumber + 5, tvl: this.mockBaseTvl * 0.48 }, // -52%
    ];

    const interval = setInterval(async () => {
      if (blockCounter >= mockBlocks.length) {
        clearInterval(interval);
        console.log('Mock simulation complete');
        return;
      }

      const mockData = mockBlocks[blockCounter];
      console.log(`Mock block ${mockData.block}: TVL $${mockData.tvl.toLocaleString()}`);

      await this.processTvlData(mockData.block, mockData.tvl);
      blockCounter++;
    }, 5000); // 5 second intervals
  }

  private async handleNewBlock(blockNumber: number) {
    try {
      const tvl = await this.getTvlAtBlock(blockNumber);
      await this.processTvlData(blockNumber, tvl);
    } catch (error) {
      console.error(`Error handling block ${blockNumber}:`, error);
    }
  }

  private async getTvlAtBlock(blockNumber: number): Promise<number> {
    const balance = await this.usdcContract.balanceOf(this.vaultAddress, { blockTag: blockNumber });
    const decimals = await this.usdcContract.decimals();
    return parseFloat(ethers.utils.formatUnits(balance, decimals));
  }

  private async processTvlData(blockNumber: number, tvl: number) {
    try {
      // Store TVL data
      await db.query(
        `INSERT INTO tvl_points (vault_address, network, block_number, tvl_usdc)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (vault_address, block_number) DO NOTHING`,
        [this.vaultAddress, this.network, blockNumber, tvl.toString()]
      );

      // Check for dangerous drops
      if (this.lastBlockTvl && this.lastBlockTvl.tvl > 0) {
        const dropPercent = (this.lastBlockTvl.tvl - tvl) / this.lastBlockTvl.tvl;

        if (dropPercent >= 0.20) {
          console.log(`🚨 ALERT: TVL drop of ${(dropPercent * 100).toFixed(2)}% detected in block ${blockNumber}`);
          console.log(`TVL: $${this.lastBlockTvl.tvl.toLocaleString()} → $${tvl.toLocaleString()}`);

          // Store alert
          await db.query(
            `INSERT INTO alerts (vault_address, network, block_number, drop_pct, tvl_before, tvl_after)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              this.vaultAddress,
              this.network,
              blockNumber,
              dropPercent.toString(),
              this.lastBlockTvl.tvl.toString(),
              tvl.toString()
            ]
          );
        }
      }

      this.lastBlockTvl = { block: blockNumber, tvl };

      if (!this.mockMode) {
        console.log(`Block ${blockNumber}: TVL $${tvl.toLocaleString()}`);
      }

    } catch (error) {
      console.error('Error processing TVL data:', error);
    }
  }

  async stop() {
    if (this.provider instanceof ethers.providers.WebSocketProvider) {
      await this.provider.removeAllListeners();
    }
  }
}