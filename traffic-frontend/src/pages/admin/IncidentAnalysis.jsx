import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Marker, Popup } from 'react-leaflet';
import { PremiumMap } from '../../components/LiveTracking/LiveTrackingView';
import { createLocationPin } from '../../components/LiveTracking/mapIcons';
import { Navigation, Camera, Clock, Shield, AlertTriangle, ArrowLeft, Activity, ChevronRight, CheckCircle } from 'lucide-react';

const IncidentAnalysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    const fetchIncident = async () => {
      try {
        const res = await api.get(`/accidents/${id}`);
        setIncident(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchIncident();
  }, [id]);

  const handleDispatch = async () => {
    // Legacy manual dispatch - now handled by Auto-Broadcast Sockets!
    alert('This system now uses zero-authorization Auto-Broadcast. The incident is already live on the Smart City Grid!');
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f9fafb' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
         <Activity size={32} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
         <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280' }}>Loading Incident Analytics...</div>
      </div>
    </div>
  );

  if (!incident) return <div style={{ textAlign: 'center', marginTop: '5rem', color: '#6b7280' }}>Report not found.</div>;

  const coords = incident.location?.coordinates || [0, 0];

  return (
    <div className="fade-in" style={{ padding: '1.5rem', background: '#f3f4f6', minHeight: 'calc(100vh - 64px)', zoom: '0.9' }}>
      
      {/* PROFESSIONAL HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
              <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>Operations</button>
              <span>/</span>
              <span style={{ color: '#111827', fontWeight: 500 }}>Incident Analysis</span>
           </div>
           <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em' }}>{incident.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
           <div className="glass-badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }}>
              <CheckCircle size={14} /> LIVE_SYSTEM
           </div>
           <div className="glass-badge" style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }}>
              ID: {id.substring(0,8)}
           </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* MAP PANEL */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                <Navigation size={18} style={{ color: 'var(--primary-color)' }} /> Location Data
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{coords[1].toFixed(5)}, {coords[0].toFixed(5)}</div>
            </div>
            <div style={{ height: '300px', borderRadius: '8px', overflow: 'hidden' }}>
              <PremiumMap center={[coords[1], coords[0]]} zoom={15}>
                <Marker position={[coords[1], coords[0]]} icon={createLocationPin()}>
                   <Popup className="uber-popup"><div style={{padding:'0.5rem', fontWeight:800}}>{incident.title}</div></Popup>
                </Marker>
              </PremiumMap>
            </div>
          </div>

          {/* EVIDENCE VAULT */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>
              <Camera size={18} style={{ color: '#ef4444' }} /> Visual Evidence
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
               {incident.images?.map((img, i) => {
                  const isVideo = img.endsWith('.mp4') || img.endsWith('.webm') || img.endsWith('.mov');
                  const url = `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${img}`;
                  return (
                    <div key={i} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #f3f4f6', height: '140px', background: '#f9fafb' }}>
                       {isVideo ? (
                         <video controls style={{ width: '100%', height: '100%', objectFit: 'cover' }}>
                           <source src={url} type="video/mp4" />
                         </video>
                       ) : (
                         <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://via.placeholder.com/300x200?text=No+Preview'; }} />
                       )}
                    </div>
                  );
               })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* AI TRUST SCORE */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary-color)' }}>
             <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>AI Validation Score</div>
             <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827' }}>{incident.trust_score || 72}%</span>
                <span style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 600 }}>● Confirmed</span>
             </div>
             <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px', marginTop: '1rem', overflow: 'hidden' }}>
                <div style={{ width: `${incident.trust_score || 72}%`, height: '100%', background: 'var(--primary-color)' }}></div>
             </div>
          </div>

          {/* INCIDENT DETAILS */}
          <div className="glass-panel" style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
             <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <span className="badge badge-danger">{incident.severity.toUpperCase()}</span>
                <span className="badge">{incident.status.toUpperCase()}</span>
             </div>

             <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Situation Report</div>
                <p style={{ fontSize: '0.9375rem', lineHeight: '1.6', color: '#374151' }}>{incident.description}</p>
             </div>

             <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.875rem' }}>
                   <span style={{ color: '#6b7280' }}>Reported:</span>
                   <span style={{ fontWeight: 500 }}>{new Date(incident.created_at).toLocaleString()}</span>
                </div>
                 <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', color: '#059669', textAlign: 'center', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                       <Activity size={18} className="pulse-alert" /> AUTO-BROADCASTED TO CITY GRID
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 500 }}>Zero-authorization protocol active. Awaiting driver acceptance.</div>
                 </div>
             </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default IncidentAnalysis;
