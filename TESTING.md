# Testing Guide

This document explains how to test the DeFi Vault Tracker system, including the mock TVL drop functionality.

## Backend Tests

Run unit tests for the backend:

```bash
cd backend
npm test
```

The test suite includes:
- **VaultWatcher Tests**: Mock mode simulation, TVL calculation, alert detection
- **API Tests**: All endpoints with various scenarios
- **Mock TVL Drop Simulation**: Automated testing of the 20% drop detection

## Mock Mode Testing

The system includes a mock mode that simulates a vault drainage attack scenario as described in the assignment.

### How to Run Mock Mode

1. **Set environment variable**:
   ```bash
   MOCK_MODE=true
   ```

2. **Start the backend**:
   ```bash
   cd backend
   npm run dev
   ```

3. **Watch the console output** - you'll see:
   ```
   Starting vault watcher in MOCK MODE
   Mock block 1000000: TVL $100,000
   Mock block 1000001: TVL $102,000
   Mock block 1000002: TVL $101,000
   🚨 ALERT: TVL drop of 25.0% detected in block 1000003
   TVL: $100,000 → $75,000
   🚨 ALERT: TVL drop of 33.3% detected in block 1000004
   TVL: $75,000 → $50,000
   Mock simulation complete
   ```

### Mock Scenario Details

The mock mode simulates the exact attack pattern described:

1. **Initial State**: $100,000 TVL
2. **Normal Activity**: Small fluctuations (+2%, +1%)
3. **First Attack**: 25% drop (simulating initial 20% drain + additional loss)
4. **Second Attack**: Additional 33% drop (simulating final drainage after 1 minute)
5. **Continued Monitoring**: Further small drops

### Frontend Testing with Mock Mode

1. **Start backend in mock mode** (see above)
2. **Start frontend**:
   ```bash
   cd frontend
   npm start
   ```
3. **Open browser** to `http://localhost:3000`
4. **Observe the interface**:
   - TVL starts at $100,000
   - After ~15 seconds, alert banner appears
   - Chart shows dramatic TVL drops
   - Multiple alerts are displayed

### How to Restart Mock Simulation

To rerun the mock simulation and see fresh vault drainage data:

#### Quick Restart (Recommended)
```bash
# Step 1: Clear existing data
docker compose exec postgres psql -U vault_user -d vault_tracker -c "DELETE FROM tvl_points; DELETE FROM alerts;"

# Step 2: Restart backend service
docker compose restart backend
```

#### Full System Reset (Alternative)
```bash
# Stop all services
docker compose down

# Start services fresh
docker compose up -d

# Verify database tables (if needed)
docker compose exec backend npm run db:migrate
```

**What happens after restart:**
- ✅ All previous TVL data and alerts are cleared
- ✅ Mock simulation starts from beginning (100k TVL)
- ✅ Fresh vault drainage scenario runs (100k → 75k → 50k → 48k)
- ✅ New alerts generated for TVL drops ≥20%
- ✅ Live data updates visible in frontend dashboard

**When to use:**
- Testing the complete drainage detection flow
- Demonstrating the system to stakeholders
- Clearing old test data before new demos
- Verifying alert timing and accuracy

### API Testing

You can also test the mock data via API:

```bash
# Get latest TVL during simulation
curl http://localhost:3001/api/v1/vaults/0x616a4E1db48e22028f6bbf20444Cd3b8e3273738/tvl/latest

# Get recent alerts
curl http://localhost:3001/api/v1/vaults/0x616a4E1db48e22028f6bbf20444Cd3b8e3273738/alerts

# Get TVL history
curl http://localhost:3001/api/v1/vaults/0x616a4E1db48e22028f6bbf20444Cd3b8e3273738/tvl
```

## Production Mode Testing

For testing with real Base network data:

1. **Get Base RPC URL** (Alchemy, QuickNode, or public)
2. **Set environment variables**:
   ```bash
   MOCK_MODE=false
   RPC_URL=https://your-base-rpc-url
   DATABASE_URL=postgresql://user:pass@localhost:5432/vault_tracker
   ```
3. **Run database migration**:
   ```bash
   cd backend
   npm run db:migrate
   ```
4. **Start the system**:
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Frontend
   cd frontend && npm start
   ```

## Expected Test Results

### Mock Mode Success Criteria

✅ **Console Output**: Shows mock blocks and detected alerts
✅ **Database**: Alerts table contains entries with drop_pct >= 0.20
✅ **Frontend**: Alert banner appears with red/orange styling
✅ **API**: Returns mock data with proper formatting
✅ **Chart**: Shows dramatic drops in TVL visualization

### Unit Test Success Criteria

✅ **Alert Detection**: Triggers for ≥20% drops, ignores <20% drops
✅ **TVL Calculation**: Properly formats USDC with 6 decimals
✅ **API Endpoints**: Return proper JSON responses
✅ **Error Handling**: Graceful degradation on failures

## Troubleshooting

### Mock Mode Not Working
- Check `MOCK_MODE=true` is set correctly
- Ensure database is running and migrated
- Look for console output starting with "Mock block"

### Database Connection Issues
- Verify PostgreSQL is running on port 5432
- Check DATABASE_URL format
- Run `npm run db:migrate` to create tables

### Frontend Not Updating
- Check browser console for errors
- Verify backend is running on port 3001
- Clear browser cache and reload

### RPC Connection Issues (Production)
- Test RPC URL manually: `curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' YOUR_RPC_URL`
- Check rate limits on your RPC provider
- Try switching to HTTP if WebSocket fails