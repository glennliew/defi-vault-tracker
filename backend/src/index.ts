import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import vaultRoutes from './routes/vault';
import { VaultWatcher } from './services/vault-watcher';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/vaults', vaultRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'DeFi Vault Tracker API',
    version: '1.0.0',
    description: 'Monitoring Seamless USDC Vault on Base network'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize vault watcher
const initializeWatcher = async () => {
  const rpcUrl = process.env.RPC_WS_URL || process.env.RPC_URL;
  const usdcAddress = process.env.USDC_ADDRESS;
  const vaultAddress = process.env.VAULT_ADDRESS;
  const network = process.env.NETWORK || 'base';
  const mockMode = process.env.MOCK_MODE === 'true';

  if (!rpcUrl || !usdcAddress || !vaultAddress) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log('- Network:', network);
  console.log('- Vault:', vaultAddress);
  console.log('- USDC:', usdcAddress);
  console.log('- Mock Mode:', mockMode);
  console.log('- RPC:', rpcUrl.includes('wss') ? 'WebSocket' : 'HTTP');

  const watcher = new VaultWatcher(rpcUrl, usdcAddress, vaultAddress, network, mockMode);

  try {
    await watcher.start();
  } catch (error) {
    console.error('Failed to start watcher:', error);
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await watcher.stop();
    process.exit(0);
  });
};

// Start watcher after server starts
setTimeout(initializeWatcher, 1000);

export default app;