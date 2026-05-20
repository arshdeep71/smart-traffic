import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CloudRain, Clock, Shield, BarChart3, FileText, Zap, Sun, Cloud, Moon } from 'lucide-react';

const OpsCommandCenter = () => {
  const [weather, setWeather] = useState('clear'); // clear, rain, fog, night
  const [timeline, setTimeline] = useState([
    { id: 1, time: '06:10:45', type: 'anomaly', severity: 'warning', text: 'Unusual stopping pattern detected at North Bridge.' },
    { id: 2, time: '06:08:12', type: 'congestion', severity: 'critical', text: 'Severe congestion spike on Highway 101 North.' },
    { id: 3, time: '06:05:00', type: 'emergency', severity: 'danger', text: 'Ambulance Unit A dispatched to Sector 7.' },
  ]);

  const [predictions, setPredictions] = useState([
    { road: 'Main St Crossing', time: '12 mins', probability: 'High', score: 82 },
    { road: 'Exit 44 Ramp', time: '5 mins', probability: 'Critical', score: 94 },
    { road: 'Valley Blvd', time: '25 mins', probability: 'Low', score: 24 },
  ]);

  // Simulate timeline updates
  useEffect(() => {
    const interval = setInterval(() => {
      const types = ['anomaly', 'congestion', 'emergency', 'system'];
      const severities = ['info', 'warning', 'danger', 'critical'];
      const texts = [
        'AI predicted buildup at Intersection 4.',
        'Possible wrong-way movement identified.',
        'Weather impact increasing congestion risk.',
        'Green Corridor automated for Emergency Unit B.',
        'Drone surveillance sweep complete in Sector 2.'
      ];

      const newEvent = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        type: types[Math.floor(Math.random() * types.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        text: texts[Math.floor(Math.random() * texts.length)]
      };

      setTimeline(prev => [newEvent, ...prev].slice(0, 10));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (sev) => {
    switch(sev) {
      case 'critical': return 'var(--ai-danger)';
      case 'danger': return '#ef4444';
      case 'warning': return 'var(--ai-warning)';
      case 'info': return 'var(--ai-neon)';
      default: return 'var(--ai-muted)';
    }
  };

  const handleGenerateReport = () => {
    alert("Generating Operational Incident Report PDF...\nSummary: Sector 7 Event Log\nTimestamp: " + new Date().toISOString());
  };

  return (
    <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
      
      {/* Left Column: Intelligence & Predictions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Weather & Risk Section */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(17, 24, 39, 0.6)' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CloudRain size={20} color="var(--ai-neon)" /> Smart City Environment
            </h3>
            <p style={{ color: 'var(--ai-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>AI visibility and risk factor adjustments</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setWeather('clear')} style={{ background: weather === 'clear' ? 'var(--ai-neon)' : 'rgba(255,255,255,0.05)', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', color: 'white' }}><Sun size={18}/></button>
            <button onClick={() => setWeather('rain')} style={{ background: weather === 'rain' ? 'var(--ai-neon)' : 'rgba(255,255,255,0.05)', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', color: 'white' }}><CloudRain size={18}/></button>
            <button onClick={() => setWeather('fog')} style={{ background: weather === 'fog' ? 'var(--ai-neon)' : 'rgba(255,255,255,0.05)', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', color: 'white' }}><Cloud size={18}/></button>
            <button onClick={() => setWeather('night')} style={{ background: weather === 'night' ? 'var(--ai-neon)' : 'rgba(255,255,255,0.05)', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', color: 'white' }}><Moon size={18}/></button>
          </div>
        </div>

        {/* Predictive Congestion Engine */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ai-neon)' }}>
            <Zap size={20} /> Predictive Congestion Engine
          </h3>
          <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
            {predictions.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: `4px solid ${p.score > 80 ? 'var(--ai-danger)' : 'var(--ai-warning)'}` }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{p.road}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ai-muted)' }}>Estimated impact in {p.time}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: p.score > 80 ? 'var(--ai-danger)' : 'var(--ai-warning)', fontWeight: 'bold' }}>{p.probability} Probability</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ai-muted)' }}>Confidence Score: {p.score}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Anomaly & Risk Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
             <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={18} color="var(--ai-warning)"/> Anomaly Detection</h4>
             <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>08 <span style={{ fontSize: '1rem', color: 'var(--ai-muted)', fontWeight: 'normal' }}>Active Alerts</span></div>
             <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--ai-warning)' }}>+12% unusual behavior increase today</div>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
             <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarChart3 size={18} color="var(--ai-danger)"/> City Risk Score</h4>
             <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--ai-danger)' }}>74.2 <span style={{ fontSize: '1rem', color: 'var(--ai-muted)', fontWeight: 'normal' }}>Elevated</span></div>
             <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--ai-danger)' }}>Critical hazard zones identified in Sector 4</div>
          </div>
        </div>

        <button 
          onClick={handleGenerateReport}
          className="ai-btn primary" 
          style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <FileText size={20} /> Generate Automated Operational Incident Report
        </button>

      </div>

      {/* Right Column: Live Timeline */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ai-neon)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
          <Activity size={20} /> Operational Timeline
        </h3>
        <div style={{ flex: 1, overflowY: 'auto', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {timeline.map(event => (
            <div key={event.id} style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
              <div style={{ position: 'absolute', left: '-5px', top: '0', width: '8px', height: '8px', borderRadius: '50%', background: getSeverityColor(event.severity), boxShadow: `0 0 10px ${getSeverityColor(event.severity)}` }}></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ai-muted)', marginBottom: '0.25rem' }}>{event.time} • {event.type.toUpperCase()}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--ai-text)', lineHeight: '1.4' }}>{event.text}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default OpsCommandCenter;
