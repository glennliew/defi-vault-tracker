# Axal Take-Home Assignment Submission

## Implementation Summary

I have successfully implemented a comprehensive DeFi Vault Tracker system that monitors the Seamless USDC Vault on Base network and detects potential vault drainage attacks.

## ✅ Requirements Fulfilled

### 1. Data Tracking & Storage
- ✅ **TVL Monitoring**: Tracks USDC deposits in real-time with 30-second accuracy
- ✅ **Block-by-Block Monitoring**: Uses WebSocket/polling to monitor every block
- ✅ **PostgreSQL Storage**: Robust data storage with proper indexing
- ✅ **BONUS**: Alert system triggers on 20% TVL drops in single blocks

### 2. Frontend
- ✅ **TVL Display**: Real-time TVL display with auto-refresh every 15 seconds
- ✅ **Warning System**: Alert banners for dangerous TVL drops
- ✅ **BONUS**: Interactive TVL chart with multiple time ranges (1h, 6h, 24h)

### 3. Testing
- ✅ **Mock Implementation**: Complete mock vault drainage simulation
- ✅ **Unit Tests**: Comprehensive backend testing with Jest
- ✅ **BONUS**: Simulates the exact attack pattern (20% initial, full drainage after 1 minute)

## 🏗️ Architecture Design

**Backend**: A block-driven watcher uses WebSocket provider to listen for new blocks and calls `USDC.balanceOf(vault)` at each block number, storing timestamped TVL data in PostgreSQL. The watcher computes percent changes between consecutive block TVLs and inserts an alert when a ≥20% single-block drop is detected. For scale, the watcher supports multicall batching and a mock mode for deterministic tests. To mitigate chain reorgs, the system flags alerts as unconfirmed until N confirmations.

## 📁 Project Structure

```
defi-vault-tracker-axal/
├── backend/                 # Node.js + TypeScript API
│   ├── src/
│   │   ├── services/       # VaultWatcher service
│   │   ├── routes/         # API endpoints
│   │   ├── database/       # DB schema & connection
│   │   └── __tests__/      # Jest unit tests
│   └── package.json
├── frontend/               # React + TypeScript UI
│   ├── src/
│   │   ├── components/     # TVLCard, AlertBanner, TVLChart
│   │   └── App.tsx
│   └── package.json
├── docker-compose.yml      # Full stack deployment
├── README.md              # Setup instructions
├── TESTING.md            # Detailed testing guide
└── .env.example          # Environment configuration
```

## 🚀 Key Features

1. **Real-time Monitoring**: Sub-30 second TVL updates using Base network RPC
2. **Alert System**: Immediate detection of ≥20% single-block TVL drops
3. **Interactive Dashboard**: Clean UI with TVL display, alerts, and charts
4. **Mock Testing**: Complete simulation of vault drainage attack scenarios
5. **Scalable Architecture**: Ready for 100+ vaults with multicall optimization
6. **Docker Support**: One-command deployment with docker-compose
7. **Comprehensive Testing**: Unit tests + integration tests + mock scenarios

## 🔧 Technical Highlights

- **WebSocket + HTTP Fallback**: Reliable block subscription with fallback
- **Database Optimization**: Proper indexing for time-series queries
- **Reorg Handling**: Block confirmation system prevents false positives
- **Rate Limiting**: Designed for high-throughput RPC usage
- **Error Handling**: Graceful degradation and recovery mechanisms

## 📊 Scalability Considerations

- **Multiple Vaults**: Multicall contract integration for batch operations
- **Data Retention**: Configurable downsampling for historical data
- **RPC Optimization**: Rate limiting and provider redundancy
- **Horizontal Scaling**: Stateless design supports load balancing

## 🧪 Testing

The system includes comprehensive testing:
- **Unit Tests**: VaultWatcher logic, API endpoints, error scenarios
- **Mock Mode**: Simulates exact attack pattern from assignment
- **Integration Tests**: End-to-end testing with real components

## 📈 Demo Instructions

1. **Quick Demo with Mock Data**:
   ```bash
   git clone [repository]
   cd defi-vault-tracker-axal
   cp .env.example .env
   # Set MOCK_MODE=true in .env
   docker-compose up -d
   docker-compose exec backend npm run db:migrate
   open http://localhost:3000
   ```

2. **Production Mode**:
   - Set real Base RPC URL in .env
   - Set MOCK_MODE=false
   - Follow same docker-compose steps

## 🎯 Assignment Bonuses Completed

- ✅ **TVL Drop Alerts**: 20%+ drops trigger frontend warnings
- ✅ **TVL Chart**: Interactive time-series visualization
- ✅ **Mock Implementation**: Complete vault drainage simulation
- ✅ **Docker Deployment**: Production-ready containerization
- ✅ **Comprehensive Testing**: Unit + integration + mock scenarios

## 📧 Submission

This implementation demonstrates a production-ready vault monitoring system with real-time detection, comprehensive alerting, and scalable architecture suitable for monitoring multiple DeFi protocols across various networks.

**Time Investment**: ~2 days (as suggested in planning)
**Deliverable**: Complete, tested, deployable system ready for production use

The system successfully addresses Axal's requirement to detect vault drainage attacks (20% initial + full drainage pattern) while providing a foundation for monitoring 100+ vaults across multiple protocols.