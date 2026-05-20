import React, { useState } from 'react';
import { Settings, Plus, Trash2, Edit2, Video, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const CameraManagement = () => {
  const [cameras, setCameras] = useState([
    { id: 'CAM_01', name: 'Main Highway', type: 'RTSP', url: 'rtsp://admin:pass@192.168.1.100/stream', status: 'online' },
    { id: 'CAM_02', name: 'Downtown Intersection', type: 'Mobile IP', url: 'http://192.168.1.5:8080/video', status: 'online' },
    { id: 'CAM_03', name: 'North Bridge', type: 'Webcam', url: '0', status: 'offline' }
  ]);

  const [newCamera, setNewCamera] = useState({ name: '', type: 'RTSP', url: '' });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddCamera = () => {
    if (newCamera.name && newCamera.url) {
      setCameras([...cameras, { id: `CAM_0${cameras.length + 1}`, ...newCamera, status: 'offline' }]);
      setNewCamera({ name: '', type: 'RTSP', url: '' });
      setIsAdding(false);
    }
  };

  const removeCamera = (id) => {
    setCameras(cameras.filter(cam => cam.id !== id));
  };

  const toggleStatus = (id) => {
    setCameras(cameras.map(cam => {
      if (cam.id === id) {
        return { ...cam, status: cam.status === 'online' ? 'offline' : 'online' };
      }
      return cam;
    }));
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.8rem' }}>
            <Settings size={28} color="var(--ai-neon)" />
            Camera Management
          </h1>
          <p style={{ color: 'var(--ai-muted)', marginTop: '0.5rem' }}>
            Configure video sources for the AI Engine matrix.
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="ai-btn primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} /> Add Source
        </button>
      </div>

      {isAdding && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--ai-neon)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--ai-text)' }}>New Camera Source</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ai-muted)', marginBottom: '0.5rem' }}>Name / Location</label>
              <input 
                type="text" 
                value={newCamera.name}
                onChange={e => setNewCamera({...newCamera, name: e.target.value})}
                placeholder="e.g. West Toll Plaza"
                style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--ai-border)', color: 'white', padding: '0.75rem', borderRadius: '4px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ width: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ai-muted)', marginBottom: '0.5rem' }}>Type</label>
              <select 
                value={newCamera.type}
                onChange={e => setNewCamera({...newCamera, type: e.target.value})}
                style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--ai-border)', color: 'white', padding: '0.75rem', borderRadius: '4px', boxSizing: 'border-box' }}
              >
                <option value="RTSP">RTSP / CCTV</option>
                <option value="Mobile IP">Mobile IP</option>
                <option value="Webcam">USB/Webcam</option>
                <option value="Video">Video File</option>
              </select>
            </div>
            <div style={{ flex: 2, minWidth: '300px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ai-muted)', marginBottom: '0.5rem' }}>Endpoint / Path</label>
              <input 
                type="text" 
                value={newCamera.url}
                onChange={e => setNewCamera({...newCamera, url: e.target.value})}
                placeholder="URL or camera index"
                style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--ai-border)', color: 'white', padding: '0.75rem', borderRadius: '4px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="ai-btn" onClick={() => setIsAdding(false)}>Cancel</button>
            <button className="ai-btn primary" onClick={handleAddCamera} disabled={!newCamera.name || !newCamera.url}>Save Source</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {cameras.map(cam => (
          <div key={cam.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px' }}>
                <Video size={24} color={cam.status === 'online' ? 'var(--ai-success)' : 'var(--ai-muted)'} />
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ai-text)' }}>
                  {cam.name} 
                  <span className="glass-badge" style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)' }}>{cam.id}</span>
                </div>
                <div style={{ color: 'var(--ai-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                  {cam.type} • <span style={{ fontFamily: 'monospace' }}>{cam.url}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              {cam.status === 'online' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ai-success)', fontSize: '0.9rem' }}>
                  <CheckCircle size={16} /> Online
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ai-muted)', fontSize: '0.9rem' }}>
                  <AlertCircle size={16} /> Offline
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => toggleStatus(cam.id)}
                  title={cam.status === 'online' ? "Disconnect" : "Connect"}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '0.5rem', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                >
                  <RefreshCw size={16} />
                </button>
                <button 
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '0.5rem', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => removeCamera(cam.id)}
                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', padding: '0.5rem', borderRadius: '4px', color: 'var(--ai-danger)', cursor: 'pointer' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CameraManagement;
