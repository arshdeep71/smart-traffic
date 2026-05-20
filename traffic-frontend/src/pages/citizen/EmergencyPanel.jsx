import React, { useState, useEffect, useRef } from 'react';
import { Radio, EyeOff, Eye } from 'lucide-react';

export const SilentSOS = ({ onTrigger }) => {
  const [triggered, setTriggered] = useState(false);
  const [pressCount, setPressCount] = useState(0);
  const timer = useRef(null);

  const handlePress = () => {
    const c = pressCount + 1;
    setPressCount(c);
    clearTimeout(timer.current);
    if (c >= 3) {
      setTriggered(true);
      onTrigger && onTrigger();
      setPressCount(0);
      return;
    }
    timer.current = setTimeout(() => setPressCount(0), 1500);
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {triggered ? <span className="silent-sos-dot" /> : <EyeOff size={15} color="#6b7280" />}
          Silent SOS
        </h4>
        {triggered && <span className="badge badge-danger">ACTIVE</span>}
      </div>
      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
        Press button 3× rapidly to trigger a hidden emergency alert.
      </p>
      <button onClick={handlePress} className="btn btn-outline" style={{ width: '100%', fontSize: '0.8rem' }}>
        <Eye size={14} /> Hidden Trigger ({pressCount}/3)
      </button>
      {triggered && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
          Silent alert sent — authorities notified discreetly.
        </div>
      )}
    </div>
  );
};

export const AudioEvidence = ({ isRecording }) => {
  const [detected, setDetected] = useState([]);
  const sounds = ['Crash detected', 'Scream detected', 'Glass breaking', 'Tires screeching'];

  useEffect(() => {
    if (!isRecording) {
      setDetected([]);
      return;
    }
    const t = setTimeout(() => {
      setDetected([sounds[Math.floor(Math.random() * sounds.length)]]);
    }, 3000);
    return () => clearTimeout(t);
  }, [isRecording]);

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <Radio size={15} color="#ef4444" /> Emergency Audio Evidence
      </h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: isRecording ? '#fef2f2' : '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          border: `2px solid ${isRecording ? '#ef4444' : '#e5e7eb'}`
        }}>🎙</div>
        <div style={{ flex: 1 }}>
          {isRecording
            ? <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>● Capturing background audio…</div>
            : <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Starts automatically when recording</div>
          }
          {detected.map((d, i) => (
            <div key={i} className="pkg-item" style={{ marginTop: '0.4rem' }}>
              <span className="check">✓</span>{d}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
