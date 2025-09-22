import React from "react";
import { TVLCard } from "./components/TVLCard";
import { AlertBanner } from "./components/AlertBanner";
import { TVLChart } from "./components/TVLChart";

// Target vault from the assignment
const VAULT_ADDRESS = "0x616a4E1db48e22028f6bbf20444Cd3b8e3273738";

function App() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <header className="header">
        <h1>DeFi Vault Tracker</h1>
        <p>Real-time monitoring of Seamless USDC Vault on Base Network</p>
      </header>

      <main>
        <div className="dashboard">
          <TVLCard vaultAddress={VAULT_ADDRESS} />
          <AlertBanner vaultAddress={VAULT_ADDRESS} />
        </div>

        <div
          style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}
        >
          <TVLChart vaultAddress={VAULT_ADDRESS} />
        </div>
      </main>

      <footer className="footer">
        <p> Real-time monitoring • Built by Glenn</p>
        <p>Detects TVL drops ≥20% • Base Network • Morpho Protocol</p>
      </footer>
    </div>
  );
}

export default App;
