import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

interface TVLDataPoint {
  vault_address: string;
  block_number: number;
  tvl_usdc: number;
  recorded_at: string;
}

interface TVLChartProps {
  vaultAddress: string;
}

export const TVLChart: React.FC<TVLChartProps> = ({ vaultAddress }) => {
  const [data, setData] = useState<TVLDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('1h');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const fromTime = new Date(now.getTime() - getTimeRangeMs(timeRange));

        const response = await axios.get(`/api/v1/vaults/${vaultAddress}/tvl`, {
          params: {
            from: fromTime.toISOString(),
            to: now.toISOString(),
            limit: 100
          }
        });

        setData(response.data.data);
      } catch (err) {
        console.error('Error fetching TVL history:', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, [vaultAddress, timeRange]);

  const getTimeRangeMs = (range: string) => {
    switch (range) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  };

  const formatXAxisTick = (tickItem: string) => {
    const date = new Date(tickItem);
    if (timeRange === '24h') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTooltipValue = (value: any) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatTooltipLabel = (label: string) => {
    return new Date(label).toLocaleString();
  };

  if (loading) {
    return (
      <div className="chart-container">
        <h3>TVL History</h3>
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#a0aec0' }}>
          Loading chart data...
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="chart-container">
        <h3>TVL History</h3>
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#a0aec0' }}>
          No data available for the selected time range
        </div>
      </div>
    );
  }

  // Calculate min/max for better Y-axis scaling
  const tvlValues = data.map(d => d.tvl_usdc);
  const minTVL = Math.min(...tvlValues);
  const maxTVL = Math.max(...tvlValues);
  const padding = (maxTVL - minTVL) * 0.1;

  return (
    <div className="chart-container">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3>TVL History</h3>
        <div>
          {(['1h', '6h', '24h'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                margin: '0 4px',
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                background: timeRange === range ? '#667eea' : '#e2e8f0',
                color: timeRange === range ? 'white' : '#4a5568',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="recorded_at"
            tickFormatter={formatXAxisTick}
            stroke="#718096"
            fontSize={12}
          />
          <YAxis
            domain={[minTVL - padding, maxTVL + padding]}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            stroke="#718096"
            fontSize={12}
          />
          <Tooltip
            formatter={(value) => [formatTooltipValue(value), 'TVL (USDC)']}
            labelFormatter={formatTooltipLabel}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          />
          <Line
            type="monotone"
            dataKey="tvl_usdc"
            stroke="#667eea"
            strokeWidth={2}
            dot={{ r: 3, fill: '#667eea' }}
            activeDot={{ r: 5, fill: '#667eea' }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div style={{
        fontSize: '0.8rem',
        color: '#a0aec0',
        textAlign: 'center',
        marginTop: '12px'
      }}>
        Last updated: {new Date().toLocaleTimeString()} • {data.length} data points
      </div>
    </div>
  );
};