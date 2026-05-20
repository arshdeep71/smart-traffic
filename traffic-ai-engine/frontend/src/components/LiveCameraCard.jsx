import React, { useState, useEffect, useRef } from 'react';
import { Video, AlertCircle, Activity, Plane, Target } from 'lucide-react';

const LiveCameraCard = ({ camera, demoMode }) => {
  const [vehicles, setVehicles] = useState([]);
  const [count, setCount] = useState(0);
  const videoRef = useRef(null);

  // Determine if it's a drone camera
  const isDrone = camera.type === 'drone' || camera.id?.includes('DRONE');

  // Simulate YOLO bounding box detections updating every 500ms
  useEffect(() => {
    const generateDetections = () => {
      const numVehicles = Math.floor(Math.random() * 5) + 2;
      const newVehicles = [];
      
      for (let i = 0; i < numVehicles; i++) {
        const width = Math.random() * 10 + 5;
        const height = width * 0.8;
        const top = Math.random() * (100 - height - 10) + 10;
        const left = Math.random() * (100 - width);
        const type = Math.random() > 0.8 ? 'Truck' : 'Car';
        const conf = (Math.random() * 0.2 + 0.75).toFixed(2);
        const id = Math.floor(Math.random() * 1000);

        newVehicles.push({ id, top, left, width, height, type, conf });
      }
      
      setVehicles(newVehicles);
      setCount(numVehicles);
    };

    if (camera.status !== 'offline') {
      generateDetections();
      const interval = setInterval(generateDetections, 1000);
      return () => clearInterval(interval);
    } else {
      setVehicles([]);
      setCount(0);
    }
  }, [camera.status]);

  const congestion = camera.congestion_state || (count > 4 ? 'heavy' : 'smooth');
  let status = camera.status || 'live';
  
  if (status !== 'offline') {
    if (congestion === 'critical') status = 'critical';
    if (congestion === 'heavy') status = 'warning';
  }

  const stateClass = status === 'critical' ? 'critical-state' : (status === 'warning' ? 'warning-state' : '');

  const demoVideoUrl = "https://www.w3schools.com/html/mov_bbb.mp4"; 
  
  return (
    <div className={`camera-card ${stateClass}`}>
      <div className="camera-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          {isDrone ? <Plane size={16} color="var(--ai-neon)" /> : <Video size={16} color={status === 'offline' ? 'var(--ai-muted)' : 'var(--ai-neon)'} />}
          {camera.name || camera.id}
          {isDrone && <span className="glass-badge" style={{ fontSize: '0.6rem', color: 'var(--ai-neon)', border: '1px solid var(--ai-neon)' }}>AERIAL</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
          <div className="live-dot" style={{ 
            background: status === 'offline' ? 'var(--ai-muted)' : (status === 'critical' ? 'var(--ai-danger)' : 'var(--ai-success)'),
            animation: status === 'offline' ? 'none' : 'pulse 1.5s infinite' 
          }}></div>
          {status === 'offline' ? 'OFFLINE' : (isDrone ? 'STREAMING' : 'LIVE')}
        </div>
      </div>

      <div className="video-container" style={{ position: 'relative', overflow: 'hidden' }}>
        {status === 'offline' ? (
          <div style={{ width: '100%', height: '100%', background: '#1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
             <AlertCircle size={32} style={{ marginBottom: '0.5rem' }} />
             Connection Lost
          </div>
        ) : (
          <>
            {demoMode ? (
              <video 
                ref={videoRef}
                src={demoVideoUrl}
                autoPlay 
                loop 
                muted 
                playsInline
                className="video-feed"
                style={{ filter: isDrone ? 'grayscale(50%) contrast(1.2) hue-rotate(180deg)' : 'grayscale(30%) contrast(1.1) sepia(10%) hue-rotate(180deg)' }} 
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
                 Awaiting Feed...
              </div>
            )}
            
            {/* Drone Scanning Effect */}
            {isDrone && (
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', background: 'radial-gradient(circle, transparent 70%, rgba(59, 130, 246, 0.1) 100%)' }}>
                 <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: '1px solid rgba(59, 130, 246, 0.3)', width: '60%', height: '60%', borderRadius: '50%' }}></div>
                 <Target size={30} color="var(--ai-neon)" style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.5, animation: 'pulse 2s infinite' }} />
              </div>
            )}

            {/* AI Bounding Boxes Overlay */}
            {vehicles.map((v) => (
              <div 
                key={v.id} 
                className="ai-bbox" 
                style={{ 
                  top: `${v.top}%`, 
                  left: `${v.left}%`, 
                  width: `${v.width}%`, 
                  height: `${v.height}%` 
                }}
              >
                <div className="ai-label">
                  {v.type} {v.conf}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="ai-stats-bar">
        <div>📍 {camera.location || 'Airspace Sector 7'}</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span style={{ color: status === 'offline' ? 'var(--ai-muted)' : 'var(--ai-neon)' }}>Vehicles: {status === 'offline' ? 0 : (camera.vehicle_count || count)}</span>
          {status !== 'offline' && (
            <span style={{ 
              color: congestion === 'critical' ? 'var(--ai-danger)' : 
                    (congestion === 'heavy' ? 'var(--ai-warning)' : 'var(--ai-success)') 
            }}>
              {congestion.toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveCameraCard;
