import React, { useState } from 'react';
import { Film, Play, Download, AlertTriangle, Shield, Clock, Camera } from 'lucide-react';

const AIReplay = () => {
  const [selectedVideo, setSelectedVideo] = useState(null);

  const replays = [
    { id: 1, title: 'Sudden Congestion Spike', source: 'Highway 101 Northbound', time: '14:32:10 Today', conf: '0.94', type: 'congestion', file: 'https://www.w3schools.com/html/mov_bbb.mp4' },
    { id: 2, title: 'Suspected Collision', source: 'Downtown Intersection', time: '09:15:00 Today', conf: '0.88', type: 'accident', file: 'https://www.w3schools.com/html/mov_bbb.mp4' },
    { id: 3, title: 'Abnormal Stopping', source: 'Toll Plaza Entry', time: '22:45:12 Yesterday', conf: '0.91', type: 'anomaly', file: 'https://www.w3schools.com/html/mov_bbb.mp4' }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.8rem', color: 'var(--ai-neon)' }}>
            <Film size={28} />
            AI Incident Replay System
          </h1>
          <p style={{ color: 'var(--ai-muted)', marginTop: '0.5rem' }}>
            Auto-generated ±15 second operational clips surrounding critical AI detections.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {replays.map((replay) => (
          <div key={replay.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${replay.type === 'accident' ? 'var(--ai-danger)' : 'var(--ai-warning)'}` }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '8px', position: 'relative', cursor: 'pointer' }} onClick={() => setSelectedVideo(replay)}>
                <Play size={24} color="var(--ai-neon)" />
                <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: 'var(--ai-danger)', color: 'white', fontSize: '0.6rem', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>REC</div>
              </div>
              
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {replay.type === 'accident' && <AlertTriangle size={16} color="var(--ai-danger)" />}
                  {replay.type === 'anomaly' && <Shield size={16} color="var(--ai-warning)" />}
                  {replay.title}
                </h3>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--ai-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Camera size={12}/> {replay.source}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Clock size={12}/> {replay.time}</span>
                  <span style={{ color: 'var(--ai-danger)' }}>Confidence: {(replay.conf * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setSelectedVideo(replay)} className="ai-btn primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Play size={16} /> Review
              </button>
              <button className="ai-btn" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <Download size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedVideo && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <div className="glass-panel" style={{ width: '80%', maxWidth: '900px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Film size={20} color="var(--ai-neon)" /> Replay Viewer: {selectedVideo.title}</h3>
              <button onClick={() => setSelectedVideo(null)} className="ai-btn" style={{ padding: '0.5rem 1rem' }}>Close</button>
            </div>
            
            <div style={{ width: '100%', background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
              <video src={selectedVideo.file} autoPlay controls style={{ width: '100%', display: 'block', filter: 'grayscale(30%) contrast(1.1)' }} />
              <div style={{ position: 'absolute', top: '20px', left: '20px', color: 'var(--ai-danger)', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.2rem', textShadow: '0 0 5px black' }}>
                REC / T -15s AI INCIDENT
              </div>
            </div>
            
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
               <button className="ai-btn" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--ai-success)', border: '1px solid var(--ai-success)' }}>Generate Auto-Report</button>
               <button className="ai-btn" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--ai-danger)', border: '1px solid var(--ai-danger)' }}>Escalate to Dispatch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIReplay;
