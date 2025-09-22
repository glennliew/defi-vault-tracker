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
- Base network RPC access 

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

## Switching Between Mock and Live Modes

The system supports two operational modes for development and production use:

### 🧪 **Mock Mode** (Development/Testing)
Simulates vault drainage attacks for testing and demonstration.

**Features:**
- Generates predictable TVL data sequence (100k → 75k → 50k → 48k)
- Triggers alerts for 25% and 33% drops
- No real network calls required
- Perfect for demos and testing

**How to enable:**
```bash
# Edit your .env file
MOCK_MODE=true
# Remove or comment out RPC_URL (not needed in mock mode)
# RPC_URL=https://your-rpc-url

# Restart backend
docker compose restart backend
```

**Expected output:**
```
Configuration:
- Mock Mode: true
- RPC: Mock
Starting vault watcher in MOCK MODE
Mock block 1000000: TVL $100,000
Mock block 1000003: TVL $75,000
🚨 ALERT: TVL drop of 25.0% detected
```

### 🌐 **Live Mode** (Production)
Monitors real Base network for actual vault activity.

**Features:**
- Real-time Base network monitoring
- Actual TVL data from Seamless USDC Vault
- HTTP polling every 12 seconds
- Detects real vault drainage attacks

**Requirements:**
- Base network RPC provider (Alchemy, QuickNode, etc.)
- Stable internet connection
- Valid API key

**How to enable:**
```bash
# Edit your .env file
MOCK_MODE=false
RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY

# Restart backend
docker compose restart backend
```

**Expected output:**
```
Configuration:
- Mock Mode: false
- RPC: HTTP
Starting vault watcher for 0x616a4e1db...
Block 35872167: TVL $5.634
```

### 🔄 **Quick Mode Switching**

**Mock → Live:**
```bash
# 1. Update environment
sed -i '' 's/MOCK_MODE=true/MOCK_MODE=false/' .env
sed -i '' 's/# RPC_URL=/RPC_URL=/' .env

# 2. Restart backend
docker compose restart backend

# 3. Verify mode
docker compose logs backend | grep "Mock Mode"
```

**Live → Mock:**
```bash
# 1. Update environment
sed -i '' 's/MOCK_MODE=false/MOCK_MODE=true/' .env

# 2. Clear existing data (optional)
docker compose exec postgres psql -U vault_user -d vault_tracker -c "DELETE FROM tvl_points; DELETE FROM alerts;"

# 3. Restart backend
docker compose restart backend
```

### 🚨 **Important Notes**

**Before switching modes:**
- Always restart the backend service after changing `MOCK_MODE`
- Consider clearing database data when switching to avoid mixed data
- Live mode requires a valid RPC_URL with sufficient rate limits
- Mock mode generates the same sequence each time - clear data for fresh runs


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