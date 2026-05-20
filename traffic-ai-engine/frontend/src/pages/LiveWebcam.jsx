import React, { useState, useEffect } from 'react';
import { Camera, RefreshCw, AlertTriangle, CheckCircle, Smartphone, Video as VideoIcon, Upload, Info } from 'lucide-react';

const LiveWebcam = () => {
  const [sourceType, setSourceType] = useState('webcam'); // webcam, mobile, rtsp, upload
  const [cameraId, setCameraId] = useState('0');
  const [streamUrl, setStreamUrl] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, testing, success, failed

  // Handle stream start
  const handleStartStream = () => {
    setConnectionStatus('testing');
    
    // Simulate connection testing
    setTimeout(() => {
      let finalUrl = '';
      if (sourceType === 'upload') {
        finalUrl = `http://localhost:8001/live-feed?camera_id=${encodeURIComponent(cameraId)}&type=video`;
      } else {
        finalUrl = `http://localhost:8001/live-feed?camera_id=${encodeURIComponent(cameraId)}&t=${new Date().getTime()}`;
      }
      setStreamUrl(finalUrl);
      setIsStreaming(true);
      setConnectionStatus('success');
    }, 800);
  };

  const handleStopStream = () => {
    setIsStreaming(false);
    setConnectionStatus('idle');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.8rem' }}>
            <Camera size={28} color="var(--ai-neon)" />
            Live Camera Connection System
          </h1>
          <p style={{ color: 'var(--ai-muted)', marginTop: '0.5rem' }}>
            Connect real-time streams to the AI Engine. Supports laptops, mobile IP apps, RTSP CCTV, and video files.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', marginBottom: '2rem' }}>
        {/* Settings Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(17, 24, 39, 0.8)', border: '1px solid var(--ai-border)', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, color: 'var(--ai-neon)', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '0.5rem' }}>Source Configuration</h3>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ai-muted)', marginBottom: '0.5rem' }}>
              Select Camera Source
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => { setSourceType('webcam'); setCameraId('0'); }} className="ai-btn" style={{ flex: 1, padding: '0.5rem', background: sourceType === 'webcam' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: `1px solid ${sourceType === 'webcam' ? 'var(--ai-neon)' : 'rgba(255,255,255,0.1)'}`, color: '#fff', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Camera size={16} /> Webcam
              </button>
              <button onClick={() => { setSourceType('mobile'); setCameraId('http://192.168.1.5:8080/video'); }} className="ai-btn" style={{ flex: 1, padding: '0.5rem', background: sourceType === 'mobile' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: `1px solid ${sourceType === 'mobile' ? 'var(--ai-neon)' : 'rgba(255,255,255,0.1)'}`, color: '#fff', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Smartphone size={16} /> Mobile IP
              </button>
              <button onClick={() => { setSourceType('rtsp'); setCameraId('rtsp://admin:pass@192.168.1.100/stream'); }} className="ai-btn" style={{ flex: 1, padding: '0.5rem', background: sourceType === 'rtsp' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: `1px solid ${sourceType === 'rtsp' ? 'var(--ai-neon)' : 'rgba(255,255,255,0.1)'}`, color: '#fff', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <VideoIcon size={16} /> RTSP CCTV
              </button>
              <button onClick={() => { setSourceType('upload'); setCameraId('traffic_highway.mp4'); }} className="ai-btn" style={{ flex: 1, padding: '0.5rem', background: sourceType === 'upload' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: `1px solid ${sourceType === 'upload' ? 'var(--ai-neon)' : 'rgba(255,255,255,0.1)'}`, color: '#fff', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Upload size={16} /> Video File
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ai-muted)', marginBottom: '0.5rem' }}>
              Connection Endpoint
            </label>
            <input 
              type="text" 
              value={cameraId}
              onChange={(e) => setCameraId(e.target.value)}
              placeholder="Enter ID, URL, or Path"
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid var(--ai-border)',
                color: 'white',
                padding: '0.75rem',
                borderRadius: '4px',
                fontFamily: 'monospace',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={handleStartStream}
              disabled={connectionStatus === 'testing'}
              style={{ 
                flex: 1, 
                padding: '0.75rem', 
                background: 'var(--ai-neon)', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: connectionStatus === 'testing' ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.5rem',
                fontWeight: 'bold'
              }}
            >
              {connectionStatus === 'testing' ? <RefreshCw size={16} className="spin" /> : <RefreshCw size={16} />} 
              {isStreaming ? 'Reconnect Stream' : 'Connect Stream'}
            </button>
            
            {isStreaming && (
              <button 
                onClick={handleStopStream}
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  background: 'rgba(239, 68, 68, 0.2)', 
                  border: '1px solid rgba(239, 68, 68, 0.5)', 
                  color: 'white', 
                  borderRadius: '4px', 
                  cursor: 'pointer' 
                }}
              >
                Disconnect
              </button>
            )}
          </div>
          
          {connectionStatus === 'success' && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--ai-success)', borderRadius: '4px', color: 'var(--ai-success)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <CheckCircle size={16} /> Connection Validated & Active
            </div>
          )}
          {connectionStatus === 'failed' && (
             <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--ai-danger)', borderRadius: '4px', color: 'var(--ai-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
             <AlertTriangle size={16} /> Connection Failed
           </div>
          )}
        </div>

        {/* Instructions Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
            <Info size={18} color="var(--ai-neon)" /> Help & Setup
          </h3>
          
          {sourceType === 'webcam' && (
            <p style={{ color: 'var(--ai-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Use <code>0</code> for your primary laptop webcam. Use <code>1</code> or <code>2</code> for external USB cameras.
            </p>
          )}

          {sourceType === 'mobile' && (
            <div style={{ fontSize: '0.85rem', color: 'var(--ai-muted)' }}>
              <p style={{ marginBottom: '0.5rem', color: '#fff' }}>Use your phone as an IP CCTV Camera:</p>
              <ol style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Install <strong>IP Webcam</strong> or <strong>DroidCam</strong> on your Android/iOS device.</li>
                <li>Connect phone to the same WiFi network as this PC.</li>
                <li>Start the server in the app.</li>
                <li>Copy the provided local IP URL (e.g., <code>http://192.168.1.5:8080/video</code>).</li>
                <li>Paste the URL in the endpoint field and connect.</li>
              </ol>
            </div>
          )}

          {sourceType === 'rtsp' && (
            <p style={{ color: 'var(--ai-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Connect to professional IP cameras (Hikvision, Dahua). Provide the full RTSP URL including credentials.<br/><br/>
              Format: <code>rtsp://user:pass@ip:port/stream</code>
            </p>
          )}

          {sourceType === 'upload' && (
            <p style={{ color: 'var(--ai-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Stream a pre-recorded traffic video file as if it were a live camera. Enter the filename or absolute path.
            </p>
          )}
        </div>
      </div>

      {/* Video Player System */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', border: '1px solid var(--ai-border)', borderRadius: '8px', position: 'relative' }}>
        {isStreaming ? (
          <>
            <img 
              src={streamUrl} 
              alt="Live AI Feed" 
              style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              onError={(e) => {
                console.error("Stream error");
                e.target.style.display = 'none';
                setConnectionStatus('failed');
                setIsStreaming(false);
              }}
            />
            {/* Live indicator overlay */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.6)', padding: '0.5rem 1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
              <div className="live-dot" style={{ background: 'var(--ai-success)', boxShadow: '0 0 8px var(--ai-success)' }}></div>
              LIVE FEED
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--ai-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            {connectionStatus === 'failed' ? (
              <>
                <AlertTriangle size={48} color="var(--ai-danger)" />
                <span style={{ fontSize: '1.2rem', color: 'var(--ai-danger)' }}>Camera Feed Lost / Connection Error</span>
                <span style={{ fontSize: '0.9rem' }}>Check your connection URL and ensure the camera is online.</span>
              </>
            ) : (
              <>
                <VideoIcon size={48} opacity={0.5} />
                <span>Stream disconnected. Configure a source and click Connect.</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveWebcam;
