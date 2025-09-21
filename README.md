# DeFi Vault Tracker - Axal Take-Home Assignment

A system that monitors Seamless USDC Vault on Base network, tracking TVL (Total Value Locked) and detecting potential vault drainage attacks.

## Architecture

**Backend Design**: A block-driven watcher uses WebSocket provider to listen for new blocks and calls `USDC.balanceOf(vault)` at each block number, storing timestamped TVL data in PostgreSQL. The watcher computes percent changes between consecutive block TVLs and inserts an alert when a ≥20% single-block drop is detected. For scale, the watcher supports multicall batching and a mock mode for deterministic tests. To mitigate chain reorgs, the system flags alerts as unconfirmed until N confirmations.

## Features

- **Real-time TVL Monitoring**: Tracks USDC deposits within 30 seconds of on-chain state
- **Drainage Detection**: Alerts when TVL drops 20% or more in a single block
- **Frontend Dashboard**: Displays current TVL with warnings for dangerous activity
- **Historical Data**: TVL charts and time-series data
- **Mock Testing**: Simulates vault drainage scenarios for testing

## Quick Start

### Prerequisites

- Node.js 16+
- PostgreSQL 12+
- Base network RPC access (recommended: Alchemy, QuickNode)

### Option 1: Docker Compose (Recommended)

```bash
# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Wait for services to start, then run migration
docker-compose exec backend npm run db:migrate

# Access the application
open http://localhost:3000
```

### Option 2: Manual Setup

1. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database and RPC URLs
   ```

2. **Start PostgreSQL**:
   ```bash
   # Using Docker
   docker run -d --name vault-tracker-db \
     -e POSTGRES_USER=vault_user \
     -e POSTGRES_PASSWORD=vault_pass \
     -e POSTGRES_DB=vault_tracker \
     -p 5432:5432 postgres:14
   ```

3. **Setup backend**:
   ```bash
   cd backend
   npm install
   npm run db:migrate  # Create database tables
   npm run dev
   ```

4. **Setup frontend**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

5. **Access the application**: Open http://localhost:3000

### Mock Mode Testing

To test TVL drop detection without waiting for real events:

1. Set `MOCK_MODE=true` in `.env`
2. Restart backend - it will simulate a 25% drop after initial data
3. Check frontend for alert banner

## Scalability Considerations

- **Multiple Vaults**: Use multicall contracts to batch `balanceOf` calls for 100+ vaults
- **Data Retention**: Implement downsampling (hourly averages) for historical data
- **Reorg Handling**: Wait for block confirmations before finalizing alerts
- **RPC Limits**: Use rate limiting and reliable providers for high-throughput monitoring

## API Endpoints

- `GET /api/v1/vaults/{vault}/tvl/latest` - Current TVL
- `GET /api/v1/vaults/{vault}/tvl?from=&to=&interval=` - Historical data
- `GET /api/v1/vaults/{vault}/alerts` - Recent alerts

## Testing

### Unit Tests
```bash
cd backend
npm test
```

### Mock TVL Drop Demo
See [TESTING.md](TESTING.md) for detailed testing instructions including the mock vault drainage simulation.

## Target Vault

- **Contract**: `0x616a4E1db48e22028f6bbf20444Cd3b8e3273738`
- **Network**: Base
- **Protocol**: Morpho (Seamless USDC Vault)