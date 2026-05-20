import React, { useState, useEffect } from 'react';
import { Camera, AlertTriangle, Activity, Database, Settings, LayoutGrid, FileVideo, Zap, Monitor, Film, Radio, Bot } from 'lucide-react';
import LiveCameraCard from '../components/LiveCameraCard';
import VideoProcessor from './VideoProcessor';
import LiveWebcam from './LiveWebcam';
import Analytics from './Analytics';
import AIAlerts from './AIAlerts';
import CameraManagement from './CameraManagement';
import AIReplay from './AIReplay';
import OpsCommandCenter from './OpsCommandCenter';
import AIAssistant from '../components/AIAssistant';
import { voiceManager } from '../services/voiceUtils';
import { getLiveAnalytics, getCameraFeeds } from '../services/aiApi';

const SurveillanceDashboard = () => {
  const [stats, setStats] = useState({
    activeCameras: 0,
    totalVehicles: 0,
    incidents: 0
  });
  
  const [cameras, setCameras] = useState([]);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('matrix'); 
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    let retryCount = 0;

    const fetchData = async () => {
      try {
        if (demoMode) {
          setCameras([
            { id: 'DEMO_CAM_1', name: 'Highway 101', location: 'North Bound', status: 'online', type: 'video' },
            { id: 'DEMO_CAM_2', name: 'Downtown Crossing', location: 'Main St', status: 'online', type: 'video' },
            { id: 'DRONE_ALPHA', name: 'AERIAL_DRONE_01', location: 'Sector 7 Airspace', status: 'online', type: 'drone' },
            { id: 'DEMO_CAM_4', name: 'Alley Cam', location: 'District 9', status: 'offline', type: 'video' }
          ]);
          setStats({
            activeCameras: 3,
            totalVehicles: Math.floor(Math.random() * 50) + 120,
            incidents: Math.random() > 0.8 ? 1 : 0
          });
          setIsBackendConnected(true);
          return;
        }

        const camRes = await getCameraFeeds();
        if (camRes.data && camRes.data.cameras) {
          setCameras(camRes.data.cameras);
        }

        const analyticsRes = await getLiveAnalytics(true, 'busy');
        if (analyticsRes.data && analyticsRes.data.data) {
          const d = analyticsRes.data.data;
          setStats({
            activeCameras: camRes.data.cameras ? camRes.data.cameras.length : 0,
            totalVehicles: d.total_vehicles || 0,
            incidents: d.critical_alerts || 0
          });
          
          if (d.critical_alerts > stats.incidents) {
            voiceManager.notify("Critical AI Alert Triggered. New incident detected in sector.");
          }
        }
        setIsBackendConnected(true);
        retryCount = 0;
      } catch (err) {
        console.error("Heartbeat failed. Retrying...");
        retryCount++;
        if (retryCount > 2) {
          if (isBackendConnected) voiceManager.notify("Warning. AI Backend connection lost.");
          setIsBackendConnected(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, demoMode ? 2000 : 3000); 
    return () => clearInterval(interval);
  }, [demoMode, stats.incidents]);

  const startDemo = () => {
    setDemoMode(!demoMode);
    voiceManager.notify(demoMode ? "Exiting simulation mode." : "Initializing futuristic smart city simulation.");
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'matrix':
        return (
          <div className="fade-in">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Live Surveillance Matrix</h1>
                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--ai-muted)' }}>Real-time object detection and neural tracking</p>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button 
                  onClick={startDemo}
                  className={`ai-btn ${demoMode ? 'primary' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: demoMode ? 'var(--ai-neon)' : 'transparent', border: '1px solid var(--ai-neon)', color: demoMode ? '#fff' : 'var(--ai-neon)' }}
                >
                  <Zap size={16} /> {demoMode ? 'Simulation Active' : 'Start Simulation'}
                </button>
                <div className="glass-badge">
                  <Camera size={16} color="var(--ai-neon)"/> {stats.activeCameras} Units
                </div>
                <div className={`glass-badge ${stats.incidents > 0 ? 'warning-state' : ''}`}>
                  <AlertTriangle size={16} color={stats.incidents > 0 ? "var(--ai-warning)" : "var(--ai-muted)"}/> {stats.incidents} Incidents
                </div>
              </div>
            </header>

            <div className="camera-grid">
              {cameras.length === 0 && <p style={{ color: 'var(--ai-muted)' }}>Waiting for camera feeds...</p>}
              {cameras.map(cam => (
                <LiveCameraCard key={cam.id} camera={cam} demoMode={demoMode} />
              ))}
            </div>
          </div>
        );
      case 'ops-center': return <OpsCommandCenter />;
      case 'replay': return <AIReplay />;
      case 'webcam': return <LiveWebcam />;
      case 'processor': return <VideoProcessor />;
      case 'analytics': return <Analytics />;
      case 'alerts': return <AIAlerts />;
      case 'config': return <CameraManagement />;
      default: return null;
    }
  };

  return (
    <div className="surveillance-container">
      {/* Sidebar Navigation */}
      <div className="ai-sidebar">
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--ai-border)' }}>
          <h2 style={{ margin: 0, color: 'var(--ai-neon)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity /> CITY OPS
          </h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--ai-muted)', marginTop: '0.5rem' }}>Operational Intelligence Node</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div onClick={() => setActiveTab('matrix')} className="glass-badge" style={{ background: activeTab === 'matrix' ? 'rgba(59,130,246,0.2)' : 'transparent', color: activeTab === 'matrix' ? 'var(--ai-neon)' : 'var(--ai-text)', padding: '0.75rem', cursor: 'pointer' }}>
            <LayoutGrid size={18}/> Live Matrix
          </div>
          <div onClick={() => setActiveTab('ops-center')} className="glass-badge" style={{ background: activeTab === 'ops-center' ? 'rgba(59,130,246,0.2)' : 'transparent', color: activeTab === 'ops-center' ? 'var(--ai-neon)' : 'var(--ai-text)', padding: '0.75rem', cursor: 'pointer' }}>
            <Radio size={18}/> Ops Center
          </div>
          <div onClick={() => setActiveTab('replay')} className="glass-badge" style={{ background: activeTab === 'replay' ? 'rgba(59,130,246,0.2)' : 'transparent', color: activeTab === 'replay' ? 'var(--ai-neon)' : 'var(--ai-text)', padding: '0.75rem', cursor: 'pointer' }}>
            <Film size={18}/> AI Replay
          </div>
          <div onClick={() => setActiveTab('processor')} className="glass-badge" style={{ background: activeTab === 'processor' ? 'rgba(59,130,246,0.2)' : 'transparent', color: activeTab === 'processor' ? 'var(--ai-neon)' : 'var(--ai-text)', padding: '0.75rem', cursor: 'pointer' }}>
            <FileVideo size={18}/> AI Processor
          </div>
          <div onClick={() => setActiveTab('webcam')} className="glass-badge" style={{ background: activeTab === 'webcam' ? 'rgba(59,130,246,0.2)' : 'transparent', color: activeTab === 'webcam' ? 'var(--ai-neon)' : 'var(--ai-text)', padding: '0.75rem', cursor: 'pointer' }}>
            <Camera size={18}/> Live Feed
          </div>
          <div onClick={() => setActiveTab('alerts')} className="glass-badge" style={{ background: activeTab === 'alerts' ? 'rgba(59,130,246,0.2)' : 'transparent', color: activeTab === 'alerts' ? 'var(--ai-neon)' : 'var(--ai-text)', padding: '0.75rem', cursor: 'pointer' }}>
            <AlertTriangle size={18}/> AI Alerts
          </div>
          <div onClick={() => setActiveTab('analytics')} className="glass-badge" style={{ background: activeTab === 'analytics' ? 'rgba(59,130,246,0.2)' : 'transparent', color: activeTab === 'analytics' ? 'var(--ai-neon)' : 'var(--ai-text)', padding: '0.75rem', cursor: 'pointer' }}>
            <Database size={18}/> Analytics
          </div>
          <div onClick={() => setActiveTab('config')} className="glass-badge" style={{ background: activeTab === 'config' ? 'rgba(59,130,246,0.2)' : 'transparent', color: activeTab === 'config' ? 'var(--ai-neon)' : 'var(--ai-text)', padding: '0.75rem', cursor: 'pointer' }}>
            <Settings size={18}/> Config
          </div>
        </nav>

        <div style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: `1px solid ${isBackendConnected ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--ai-muted)', marginBottom: '0.5rem' }}>OPERATIONAL STATUS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isBackendConnected ? 'var(--ai-success)' : 'var(--ai-danger)', fontSize: '0.9rem', fontWeight: 'bold' }}>
            <div className="live-dot" style={{ background: isBackendConnected ? 'var(--ai-success)' : 'var(--ai-danger)', boxShadow: `0 0 8px ${isBackendConnected ? 'var(--ai-success)' : 'var(--ai-danger)'}` }}></div>
            {isBackendConnected ? 'AI_NET_ACTIVE' : 'SYSTEM_OFFLINE'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--ai-muted)', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Intel Sync</span>
            <span style={{ color: 'var(--ai-text)' }}>OK</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="ai-main">
        {renderContent()}
      </div>

      {/* Floating AI Assistant */}
      <AIAssistant />
    </div>
  );
};

export default SurveillanceDashboard;
