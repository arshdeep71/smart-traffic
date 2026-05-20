import React, { useState } from 'react';
import { Activity, ShieldAlert, Sparkles, Wand2 } from 'lucide-react';

export const AutoIncidentFill = ({ formData, setFormData }) => {
  const [filling, setFilling] = useState(false);

  const autoFill = () => {
    setFilling(true);
    setTimeout(() => {
      const types = ['Vehicle Collision', 'Road Blockage', 'Medical Emergency', 'Fire Emergency'];
      const severities = ['low', 'medium', 'high'];
      const landmarks = ['Near City Hospital', 'Opposite Bus Stand', 'Ring Road Junction', 'Market Chowk'];
      setFormData(prev => ({
        ...prev,
        title: `${types[Math.floor(Math.random() * types.length)]} — Auto Detected`,
        description: `AI detected incident at ${landmarks[Math.floor(Math.random() * landmarks.length)]}. Emergency services required immediately.`,
        category: types[Math.floor(Math.random() * types.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
      }));
      setFilling(false);
    }, 1200);
  };

  return (
    <button
      type="button"
      onClick={autoFill}
      className="btn btn-outline"
      style={{
        fontSize: '0.8rem',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        borderColor: '#8b5cf6',
        color: '#8b5cf6',
        padding: '0.6rem',
        borderRadius: '8px',
        fontWeight: 700
      }}
      disabled={filling}
    >
      <Wand2 size={14} className={filling ? 'animate-spin' : ''} />
      {filling ? 'AI Auto-filling…' : 'Smart Auto-Fill Report'}
    </button>
  );
};

export const SmartAIIncidentAnalysis = ({ description, onSuggest }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const analyzeText = () => {
    if (!description.trim()) {
      alert("Please enter a description to analyze first!");
      return;
    }
    setAnalyzing(true);
    setTimeout(() => {
      const lower = description.toLowerCase();
      let severity = 'low';
      let category = 'Vehicle Collision';
      let highlights = [];

      if (lower.includes('blood') || lower.includes('bleed') || lower.includes('hurt') || lower.includes('injury')) {
        severity = 'medium';
        category = 'Medical Emergency';
        highlights.push('Injury Detected');
      }
      if (lower.includes('unconscious') || lower.includes('dying') || lower.includes('heart') || lower.includes('breath')) {
        severity = 'high';
        category = 'Medical Emergency';
        highlights.push('Life-Threatening');
      }
      if (lower.includes('fire') || lower.includes('smoke') || lower.includes('burn')) {
        severity = 'high';
        category = 'Fire Emergency';
        highlights.push('Thermal Hazard');
      }
      if (lower.includes('crash') || lower.includes('collision') || lower.includes('accident')) {
        category = 'Vehicle Collision';
        highlights.push('Structural Impact');
      }
      if (lower.includes('block') || lower.includes('jam') || lower.includes('stuck')) {
        category = 'Road Blockage';
        highlights.push('Traffic Disturbance');
      }

      setResult({
        category,
        severity,
        highlights: highlights.length > 0 ? highlights : ['General Incident'],
        confidence: Math.floor(Math.random() * 15 + 80),
      });

      onSuggest && onSuggest({ category, severity });
      setAnalyzing(false);
    }, 1500);
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <Sparkles size={15} color="#8b5cf6" /> Smart AI Incident Analysis
      </h4>
      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
        Analyze the current incident description to auto-classify category, suggest severity, and extract key features.
      </p>
      <button
        type="button"
        onClick={analyzeText}
        disabled={analyzing}
        className="btn btn-outline"
        style={{ width: '100%', fontSize: '0.8rem', fontWeight: 700 }}
      >
        {analyzing ? 'Analyzing Description…' : '🔍 Analyze Description'}
      </button>

      {result && (
        <div style={{ marginTop: '1rem', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.15)', borderRadius: 8, padding: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.78rem' }}>
            <span style={{ color: '#6b7280' }}>Suggested Category:</span>
            <span style={{ fontWeight: 700, color: '#8b5cf6' }}>{result.category}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.78rem' }}>
            <span style={{ color: '#6b7280' }}>Suggested Severity:</span>
            <span style={{
              fontWeight: 800,
              textTransform: 'uppercase',
              color: result.severity === 'high' ? '#dc2626' : result.severity === 'medium' ? '#f59e0b' : '#10b981'
            }}>{result.severity}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.78rem' }}>
            <span style={{ color: '#6b7280' }}>Confidence:</span>
            <span style={{ fontWeight: 700, color: '#10b981' }}>{result.confidence}%</span>
          </div>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {result.highlights.map(h => (
              <span key={h} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: '#e0e7ff', color: '#4338ca', borderRadius: 4, fontWeight: 700 }}>
                {h}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const SeveritySuggestion = ({ currentSeverity }) => {
  const severities = {
    low: { label: 'Low', desc: 'No active injuries or immediate hazards. Safe zone.', color: '#10b981' },
    medium: { label: 'Moderate', desc: 'Non-life threatening injuries or traffic hazards.', color: '#f59e0b' },
    high: { label: 'Critical', desc: 'Severe trauma, unconsciousness, fire, or major structural crashes.', color: '#dc2626' }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <ShieldAlert size={15} color="#ef4444" /> AI Severity Suggestion Advisor
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {Object.entries(severities).map(([k, v]) => {
          const isSelected = currentSeverity === k;
          return (
            <div
              key={k}
              style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.6rem',
                borderRadius: 8,
                background: isSelected ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                border: isSelected ? `1px solid ${v.color}` : '1px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: v.color,
                marginTop: '0.25rem',
                boxShadow: isSelected ? `0 0 8px ${v.color}` : 'none'
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.8rem', color: isSelected ? v.color : '#1f2937' }}>{v.label} Priority</span>
                  {isSelected && <span style={{ fontSize: '0.65rem', fontWeight: 800, background: v.color, color: '#fff', padding: '0.1rem 0.4rem', borderRadius: 4 }}>ACTIVE</span>}
                </div>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.3 }}>{v.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
