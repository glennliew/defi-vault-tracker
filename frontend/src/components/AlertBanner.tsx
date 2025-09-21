import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Alert {
  id: number;
  vault_address: string;
  network: string;
  block_number: number;
  drop_pct: number;
  tvl_before: number;
  tvl_after: number;
  confirmed: boolean;
  created_at: string;
}

interface AlertBannerProps {
  vaultAddress: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ vaultAddress }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:3001/api/v1/vaults/${vaultAddress}/alerts?limit=5`);
        setAlerts(response.data.alerts);
      } catch (err) {
        console.error('Error fetching alerts:', err);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    // Poll every 10 seconds for alerts
    const interval = setInterval(fetchAlerts, 10000);

    return () => clearInterval(interval);
  }, [vaultAddress]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (pct: number) => {
    return `${(pct * 100).toFixed(1)}%`;
  };

  const getTimeSince = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (loading) {
    return null;
  }

  // Show recent alerts (within last 24 hours)
  const recentAlerts = alerts.filter(alert => {
    const alertTime = new Date(alert.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - alertTime.getTime();
    return timeDiff < 24 * 60 * 60 * 1000; // 24 hours
  });

  if (recentAlerts.length === 0) {
    return (
      <div className="card">
        <h3>Vault Status</h3>
        <div className="status-indicator status-healthy">
          ✓ No dangerous activity detected
        </div>
      </div>
    );
  }

  const latestAlert = recentAlerts[0];
  const severity = latestAlert.drop_pct >= 0.5 ? 'critical' : 'warning';

  return (
    <>
      <div className={`alert-banner ${severity === 'critical' ? '' : 'warning'}`}>
        <h3>🚨 {severity === 'critical' ? 'CRITICAL ALERT' : 'WARNING'}: Vault Drainage Detected</h3>
        <p>
          <strong>TVL Drop:</strong> {formatPercentage(latestAlert.drop_pct)} in block #{latestAlert.block_number}
        </p>
        <p>
          <strong>Amount:</strong> {formatCurrency(latestAlert.tvl_before)} → {formatCurrency(latestAlert.tvl_after)}
        </p>
        <p>
          <strong>Time:</strong> {getTimeSince(latestAlert.created_at)}
        </p>
        {!latestAlert.confirmed && (
          <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
            ⚠️ Unconfirmed - waiting for block confirmation
          </p>
        )}
      </div>

      {recentAlerts.length > 1 && (
        <div className="card">
          <h3>Recent Alerts ({recentAlerts.length})</h3>
          {recentAlerts.slice(1).map(alert => (
            <div key={alert.id} style={{
              padding: '8px 0',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '0.9rem'
            }}>
              Block #{alert.block_number}: {formatPercentage(alert.drop_pct)} drop • {getTimeSince(alert.created_at)}
            </div>
          ))}
        </div>
      )}
    </>
  );
};