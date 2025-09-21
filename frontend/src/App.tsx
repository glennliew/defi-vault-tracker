import React from 'react';
import { TVLCard } from './components/TVLCard';
import { AlertBanner } from './components/AlertBanner';
import { TVLChart } from './components/TVLChart';

// Target vault from the assignment
const VAULT_ADDRESS = '0x616a4E1db48e22028f6bbf20444Cd3b8e3273738';

function App() {
  return (
    <div className="container">
      <header className="header">
        <h1>DeFi Vault Tracker</h1>
        <p>Monitoring Seamless USDC Vault on Base Network</p>
        <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '8px' }}>
          {VAULT_ADDRESS}
        </div>
      </header>

      <main>
        <div className="dashboard">
          <TVLCard vaultAddress={VAULT_ADDRESS} />
          <AlertBanner vaultAddress={VAULT_ADDRESS} />
        </div>

        <TVLChart vaultAddress={VAULT_ADDRESS} />

        <div style={{
          textAlign: 'center',
          marginTop: '40px',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '0.9rem'
        }}>
          <p>🔄 Auto-refreshing every 15 seconds • Built for Axal</p>
          <p style={{ marginTop: '8px' }}>
            Detects TVL drops ≥20% in single blocks • Base Network • Morpho Protocol
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;