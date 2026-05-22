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
    <div className="glass-panel" style={{ padding: '1.25rem', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, display: 'flex', gap: '0.4rem', alignItems: 'center', color: '#191c1e' }}>
          {triggered ? <span className="silent-sos-dot" /> : <EyeOff size={15} color="#64748b" />}
          Silent SOS
        </h4>
        {triggered && <span className="badge badge-danger" style={{ background: '#ba1a1a', color: '#ffffff', borderRadius: 6, fontWeight: 700, padding: '0.1rem 0.4rem' }}>ACTIVE</span>}
      </div>
      <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.45 }}>
        Press button 3× rapidly to trigger a hidden emergency alert.
      </p>
      <button
        onClick={handlePress}
        className="btn btn-outline"
        style={{
          width: '100%',
          fontSize: '0.8rem',
          fontWeight: 700,
          borderColor: 'rgba(15, 23, 42, 0.08)',
          color: '#191c1e',
          borderRadius: '12px',
          padding: '0.65rem',
          background: '#ffffff',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem'
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = '#f1f5f9';
          e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.15)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = '#ffffff';
          e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
        }}
      >
        <Eye size={14} /> Hidden Trigger ({pressCount}/3)
      </button>
      {triggered && (
        <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#ba1a1a', fontWeight: 800 }}>
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
    <div className="glass-panel" style={{ padding: '1.25rem', fontFamily: 'Outfit, sans-serif' }}>
      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 800, display: 'flex', gap: '0.4rem', alignItems: 'center', color: '#191c1e' }}>
        <Radio size={16} color="#ba1a1a" /> Emergency Audio Evidence
      </h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: isRecording ? 'rgba(186, 26, 26, 0.06)' : 'rgba(15, 23, 42, 0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          border: `2px solid ${isRecording ? '#ba1a1a' : 'rgba(15, 23, 42, 0.08)'}`,
          transition: 'all 0.2s'
        }}>🎙</div>
        <div style={{ flex: 1 }}>
          {isRecording
            ? <div style={{ fontSize: '0.78rem', color: '#ba1a1a', fontWeight: 800 }}>● Capturing background audio…</div>
            : <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Starts automatically when recording</div>
          }
          {detected.map((d, i) => (
            <div key={i} className="pkg-item" style={{ marginTop: '0.4rem', fontSize: '0.78rem', fontWeight: 600, color: '#191c1e' }}>
              <span className="check" style={{ color: '#2170e4', marginRight: '0.3rem' }}>✓</span>{d}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
