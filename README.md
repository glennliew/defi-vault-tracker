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

### Mock Mode Testing

To test TVL drop detection without waiting for real events:

1. Set `MOCK_MODE=true` in `.env`
2. Restart backend - it will simulate a 25% drop after initial data
3. Check frontend for alert banner

## Backend Design & Scalability

### Core Architecture

The backend follows a **modular, event-driven architecture** designed for reliable DeFi monitoring:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   VaultWatcher  │───▶│  DatabaseLayer  │───▶│   REST API      │
│   (Block Events)│    │  (PostgreSQL)   │    │   (Express)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│   RPC Provider  │    │  Alert Engine   │
│   (WebSocket)   │    │  (≥20% drops)   │
└─────────────────┘    └─────────────────┘
```

**Key Components:**
- **VaultWatcher**: Block-by-block TVL monitoring service
- **Database Layer**: Time-series data storage with proper indexing
- **Alert Engine**: Real-time anomaly detection (≥20% single-block drops)
- **REST API**: Clean endpoints for frontend consumption
- **Mock Mode**: Deterministic testing with simulated drainage scenarios

### Data Validity & Reliability

**Block Confirmation Strategy:**
- Alerts marked as `unconfirmed` initially
- Confirmed after N blocks to handle chain reorganizations
- Critical alerts (≥50% drops) get immediate notification + confirmation tracking

**Data Integrity:**
- TVL calculations use precise decimal arithmetic (BigNumber.js)
- Block number indexing prevents duplicate processing
- Graceful error handling with automatic retry mechanisms
- Database constraints ensure data consistency

### Scalability for 100+ Vaults

**1. Efficient Data Collection**
```typescript
// Multicall batching for 100+ vaults
const multicall = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL_ABI, provider);
const calls = vaults.map(vault => ({
  target: USDC_ADDRESS,
  callData: usdc.interface.encodeFunctionData('balanceOf', [vault.address])
}));
const results = await multicall.aggregate(calls);
```

**2. Database Optimization**
```sql
-- Partitioned tables by date for historical data
CREATE TABLE tvl_points_2024_01 PARTITION OF tvl_points
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Composite indexes for fast queries
CREATE INDEX idx_vault_block ON tvl_points (vault_address, block_number DESC);
CREATE INDEX idx_vault_time ON tvl_points (vault_address, recorded_at DESC);
```

**3. Horizontal Scaling Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vault Group A │    │   Vault Group B │    │   Vault Group C │
│   (Morpho)      │    │   (Aave)        │    │   (Compound)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Shared PostgreSQL                            │
│                  (Protocol-partitioned)                         │
└─────────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Unified REST API                           │
│                    (Load Balanced)                              │
└─────────────────────────────────────────────────────────────────┘
```

**4. Performance Optimizations**

**RPC Efficiency:**
- WebSocket connections for real-time block events
- Connection pooling and automatic reconnection
- Rate limiting with exponential backoff
- Fallback RPC providers for redundancy

**Memory Management:**
- Streaming data processing for large historical ranges
- LRU cache for frequently accessed vault data
- Periodic cleanup of old alert data

**Database Performance:**
- Time-series data downsampling (1min → 1hr → 1day aggregates)
- Automated partitioning by date ranges
- Read replicas for analytical queries

### Multi-Protocol Considerations

**Protocol Abstraction:**
```typescript
interface VaultAdapter {
  getTVL(blockNumber: number): Promise<BigNumber>;
  getProtocol(): ProtocolType;
  getUnderlyingAssets(): Token[];
}

class MorphoVaultAdapter implements VaultAdapter { /* ... */ }
class AaveVaultAdapter implements VaultAdapter { /* ... */ }
class CompoundVaultAdapter implements VaultAdapter { /* ... */ }
```

**Configuration Management:**
```yaml
# vault-config.yml
vaults:
  - address: "0x616a4E1db..."
    protocol: "morpho"
    asset: "USDC"
    network: "base"
    alertThreshold: 0.20
  - address: "0x742d35..."
    protocol: "aave"
    asset: "ETH"
    network: "ethereum"
    alertThreshold: 0.15
```

**Alert Customization:**
- Protocol-specific thresholds (stablecoins: 20%, volatile assets: 30%)
- Multi-asset vault support with weighted TVL calculations
- Cross-chain monitoring with network-specific optimizations

### Production Readiness

**Monitoring & Observability:**
- Structured logging with correlation IDs
- Prometheus metrics for system health
- Grafana dashboards for TVL trends and alert patterns
- Dead letter queues for failed alert processing

**Security:**
- Input validation and SQL injection protection
- Rate limiting on API endpoints
- Environment-based configuration management
- Secrets management for RPC keys

This architecture ensures the system can scale from 1 vault to 100+ vaults across multiple protocols while maintaining data integrity and real-time performance.

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