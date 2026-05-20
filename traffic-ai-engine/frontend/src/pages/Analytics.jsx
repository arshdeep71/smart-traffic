import React, { useState, useEffect } from 'react';
import { Database, Activity, TrendingUp, Car, Truck, Clock } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Analytics = () => {
  const [dataPoints, setDataPoints] = useState([]);
  const [stats, setStats] = useState({
    fps: 120,
    totalVehicles: 342,
    density: 'High',
    activeStreams: 4
  });

  useEffect(() => {
    // Generate initial dummy data
    const initialData = Array.from({ length: 20 }, (_, i) => ({
      time: new Date(Date.now() - (20 - i) * 3000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' }),
      vehicles: Math.floor(Math.random() * 50) + 10,
      congestion: Math.random() * 100
    }));
    setDataPoints(initialData);

    const interval = setInterval(() => {
      setDataPoints(prev => {
        const newPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' }),
          vehicles: Math.floor(Math.random() * 50) + 20,
          congestion: Math.random() * 100
        };
        return [...prev.slice(1), newPoint];
      });
      setStats({
        fps: Math.floor(Math.random() * 10) + 115,
        totalVehicles: Math.floor(Math.random() * 500) + 300,
        density: Math.random() > 0.7 ? 'Critical' : 'High',
        activeStreams: 4
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: 'rgba(255,255,255,0.7)' }
      }
    },
    scales: {
      x: {
        ticks: { color: 'rgba(255,255,255,0.5)' },
        grid: { color: 'rgba(255,255,255,0.1)' }
      },
      y: {
        ticks: { color: 'rgba(255,255,255,0.5)' },
        grid: { color: 'rgba(255,255,255,0.1)' }
      }
    }
  };

  const lineData = {
    labels: dataPoints.map(d => d.time),
    datasets: [
      {
        label: 'Traffic Congestion (%)',
        data: dataPoints.map(d => d.congestion),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const barData = {
    labels: dataPoints.map(d => d.time),
    datasets: [
      {
        label: 'Vehicle Count',
        data: dataPoints.map(d => d.vehicles),
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }
    ]
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.8rem' }}>
          <Database size={28} color="var(--ai-neon)" />
          Live Traffic Analytics
        </h1>
        <p style={{ color: 'var(--ai-muted)', marginTop: '0.5rem' }}>
          Real-time metrics aggregated across all active AI surveillance streams.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--ai-border)' }}>
          <div style={{ color: 'var(--ai-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={16}/> Processing FPS</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--ai-success)' }}>{stats.fps}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--ai-border)' }}>
          <div style={{ color: 'var(--ai-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Car size={16}/> Total Vehicles</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--ai-neon)' }}>{stats.totalVehicles}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--ai-border)' }}>
          <div style={{ color: 'var(--ai-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={16}/> Global Density</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stats.density === 'Critical' ? 'var(--ai-danger)' : 'var(--ai-warning)' }}>{stats.density}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--ai-border)' }}>
          <div style={{ color: 'var(--ai-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={16}/> Active Streams</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--ai-text)' }}>{stats.activeStreams}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', height: '400px' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', background: 'rgba(17, 24, 39, 0.6)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--ai-text)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Congestion Trend</h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Line data={lineData} options={chartOptions} />
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', background: 'rgba(17, 24, 39, 0.6)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--ai-text)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Vehicle Count (Live)</h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
