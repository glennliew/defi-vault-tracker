import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface TVLData {
  vault_address: string;
  block_number: number;
  tvl_usdc: number;
  recorded_at: string;
}

interface TVLCardProps {
  vaultAddress: string;
}

export const TVLCard: React.FC<TVLCardProps> = ({ vaultAddress }) => {
  const [tvlData, setTvlData] = useState<TVLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTVL = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:3001/api/v1/vaults/${vaultAddress}/tvl/latest`);
        setTvlData(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch TVL data');
        console.error('Error fetching TVL:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTVL();

    // Poll every 15 seconds to meet the 30-second requirement
    const interval = setInterval(fetchTVL, 15000);

    return () => clearInterval(interval);
  }, [vaultAddress]);

  const formatTVL = (tvl: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(tvl);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="card">
      <h3>Total Value Locked (TVL)</h3>

      {loading && <div className="loading">Loading...</div>}

      {error && <div className="error">Error: {error}</div>}

      {tvlData && (
        <>
          <div className="tvl-value">
            {formatTVL(tvlData.tvl_usdc)}
          </div>
          <div className="tvl-label">USDC in Seamless Vault</div>
          <div className="timestamp">
            Block #{tvlData.block_number} • {formatTimestamp(tvlData.recorded_at)}
          </div>
        </>
      )}
    </div>
  );
};