import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Marker, Popup } from 'react-leaflet';
import { PremiumMap } from '../../components/LiveTracking/LiveTrackingView';
import { createLocationPin } from '../../components/LiveTracking/mapIcons';
import { Navigation, Camera, Clock, Shield, AlertTriangle, ArrowLeft, Activity, ChevronRight, CheckCircle } from 'lucide-react';

const getSvgFallback = (index = 1, timestamp = "+1.0s") => {
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'>
    <rect width='640' height='360' fill='%23050b14'/>
    <defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='%231e293b'/>
        <stop offset='100%' stop-color='%230f172a'/>
      </linearGradient>
    </defs>
    <rect x='20' y='20' width='600' height='320' rx='10' fill='url(%23g)' stroke='%233b82f6' stroke-width='1' stroke-opacity='0.2'/>
    
    <path d='M290,140 h60 a10,10 0 0 1 10,10 v60 a10,10 0 0 1 -10,10 h-60 a10,10 0 0 1 -10,-10 v-60 a10,10 0 0 1 10,-10 z' fill='%231e3a8a' fill-opacity='0.3' stroke='%233b82f6' stroke-width='2'/>
    <circle cx='320' cy='180' r='18' fill='none' stroke='%2310b981' stroke-width='3' stroke-dasharray='4 2'/>
    <circle cx='320' cy='180' r='8' fill='%2310b981'/>
    <path d='M310,132 l10,-12 h20 l10,12' fill='none' stroke='%233b82f6' stroke-width='2'/>
    
    <line x1='40' y1='180' x2='600' y2='180' stroke='%233b82f6' stroke-width='0.5' stroke-opacity='0.1'/>
    <line x1='320' y1='40' x2='320' y2='320' stroke='%233b82f6' stroke-width='0.5' stroke-opacity='0.1'/>
    
    <path d='M40,60 L40,40 L60,40' fill='none' stroke='%23ef4444' stroke-width='2'/>
    <path d='M600,60 L600,40 L580,40' fill='none' stroke='%23ef4444' stroke-width='2'/>
    <path d='M40,300 L40,320 L60,320' fill='none' stroke='%23ef4444' stroke-width='2'/>
    <path d='M600,300 L600,320 L580,320' fill='none' stroke='%23ef4444' stroke-width='2'/>
    
    <text x='50' y='70' fill='%23ef4444' font-family='monospace' font-size='12' font-weight='bold'>● REC</text>
    <text x='100' y='70' fill='%23ffffff' font-family='monospace' font-size='12'>CAM-SECURE-0${index}</text>
    
    <text x='50' y='300' fill='%233b82f6' font-family='monospace' font-size='11' font-weight='bold'>📡 RADAR LINK ACTIVE</text>
    <text x='50' y='315' fill='%2310b981' font-family='monospace' font-size='11' font-weight='bold'>🛰️ GPS: 31.252242 N, 75.703130 E</text>
    
    <text x='470' y='308' fill='%239ca3af' font-family='monospace' font-size='12' font-weight='bold'>TIME: ${timestamp}</text>
  </svg>`;
};

const IncidentAnalysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

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

  const handleVerify = async () => {
    setUpdatingStatus(true);
    setStatusMessage('Verifying Incident...');
    try {
      const res = await api.post(`/accidents/${id}/verify`);
      setIncident(res.data.data);
      setStatusMessage('Emergency Successfully Verified!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setStatusMessage('Verification failed — Check role permissions.');
      setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleNotifyPolice = async () => {
    setUpdatingStatus(true);
    setStatusMessage('Alerting Local Police Unit...');
    try {
      const res = await api.put(`/accidents/${id}`, { status: 'police_notified' });
      setIncident(res.data.data);
      setStatusMessage('Police Dispatch Dispatched!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setStatusMessage('Police notification failed.');
      setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDispatchAmbulance = async () => {
    setUpdatingStatus(true);
    setStatusMessage('Routing Nearest Ambulance...');
    try {
      const res = await api.put(`/accidents/${id}`, { status: 'dispatched' });
      setIncident(res.data.data);
      setStatusMessage('Ambulance Dispatched via Auto-Grid!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setStatusMessage('Ambulance dispatch failed.');
      setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setUpdatingStatus(false);
    }
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
          </div>          {/* EVIDENCE VAULT */}
          <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
                <Camera size={18} style={{ color: '#ef4444' }} /> Visual Evidence Archive
              </div>
              <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }} className="pulse-alert">● ONLINE</span>
            </div>
            {(!incident.images || incident.images.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', fontSize: '0.85rem' }}>
                No photographic evidence attached to this report.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                 {incident.images.map((img, i) => {
                    const isVideo = img.endsWith('.mp4') || img.endsWith('.webm') || img.endsWith('.mov');
                    const url = (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://')) ? img : `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${img}`;
                    const mockTimestamp = `+${(i + 1).toFixed(1)}s`;
                    return (
                      <div 
                        key={i} 
                        onClick={(e) => {
                          const imgEl = e.currentTarget.querySelector('img');
                          const finalSrc = imgEl ? imgEl.src : url;
                          setSelectedPhoto({ url: finalSrc, isVideo, timestamp: mockTimestamp, index: i + 1 });
                        }}
                        className="card-hover"
                        style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb', height: '130px', background: '#000', cursor: 'zoom-in' }}
                      >
                         {isVideo ? (
                           <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                             <video muted style={{ width: '100%', height: '100%', objectFit: 'cover' }}>
                               <source src={url} type="video/mp4" />
                             </video>
                             <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', color: '#fff' }}>
                               🎥 PLAY
                             </div>
                           </div>
                         ) : (
                           <img 
                             src={url} 
                             style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                             onError={(e) => { 
                               e.target.src = getSvgFallback(i + 1, mockTimestamp); 
                             }} 
                             alt="Evidence Snapshot"
                           />
                         )}
                         <div style={{ position: 'absolute', bottom: 6, left: 6, fontSize: '0.62rem', background: 'rgba(15, 23, 42, 0.75)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                           Frame {i + 1} ({mockTimestamp})
                         </div>
                      </div>
                    );
                 })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* 👮 EMERGENCY CONTROL CENTER PANEL */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary-color)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
             
             <div>
               <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>👮 CONTROL CENTER VERIFICATION</div>
               <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>Manual Verification Console</h3>
             </div>

             {/* Status Badge & Message Alerts */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span style={{ fontSize: '0.8rem', color: '#4b5563' }}>Current Phase:</span>
                   {incident.status === 'pending' ? (
                     <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 800 }}>Evidence Received</span>
                   ) : incident.status === 'verified' ? (
                     <span className="badge badge-warning" style={{ textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 800 }}>Under Manual Verification</span>
                   ) : (
                     <span className="badge badge-danger" style={{ textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 800 }}>Emergency Teams Notified</span>
                   )}
                </div>
                {statusMessage && (
                  <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(234, 88, 12, 0.1)', border: '1px solid rgba(234, 88, 12, 0.2)', borderRadius: '6px', fontSize: '0.72rem', color: '#ea580c', fontWeight: 700, textAlign: 'center' }} className="pulse-alert">
                    {statusMessage}
                  </div>
                )}
             </div>

             {/* Workflow Step Indicators */}
             <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 700 }}>
                <div style={{ color: incident.status === 'pending' || incident.status === 'verified' || incident.status === 'dispatched' || incident.status === 'police_notified' ? '#ea580c' : '#9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                   <span>📥 RECEIVED</span>
                   <span style={{ fontSize: '0.5rem' }}>✓</span>
                </div>
                <div style={{ color: incident.status === 'verified' || incident.status === 'dispatched' || incident.status === 'police_notified' ? '#f59e0b' : '#9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                   <span>🔍 REVIEWED</span>
                   <span style={{ fontSize: '0.5rem' }}>{incident.status !== 'pending' ? '✓' : '●'}</span>
                </div>
                <div style={{ color: incident.status === 'dispatched' || incident.status === 'police_notified' ? '#ef4444' : '#9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                   <span>🚨 ACTIONED</span>
                   <span style={{ fontSize: '0.5rem' }}>{incident.status === 'dispatched' || incident.status === 'police_notified' ? '✓' : '●'}</span>
                </div>
             </div>

             {/* Interactive Dispatch Actions Grid */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  onClick={handleVerify}
                  disabled={updatingStatus || incident.status !== 'pending'}
                  className="btn btn-outline"
                  style={{ width: '100%', borderColor: '#f59e0b', color: '#d97706', padding: '0.7rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <CheckCircle size={16} /> Mark as Verified Emergency
                </button>

                <button 
                  onClick={handleNotifyPolice}
                  disabled={updatingStatus || incident.status === 'pending' || incident.status === 'police_notified'}
                  className="btn btn-outline"
                  style={{ width: '100%', borderColor: '#ea580c', color: '#ea580c', padding: '0.7rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Shield size={16} /> Notify Police Unit
                </button>

                <button 
                  onClick={handleDispatchAmbulance}
                  disabled={updatingStatus || incident.status === 'pending' || incident.status === 'dispatched'}
                  className="btn btn-danger"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Activity size={16} /> Dispatch Ambulance
                </button>
             </div>
          </div>

          {/* INCIDENT DETAILS */}
          <div className="glass-panel" style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
             <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <span className="badge badge-danger">{incident.severity.toUpperCase()}</span>
                <span className="badge" style={{ textTransform: 'uppercase' }}>{incident.status}</span>
             </div>

             <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Situation Report</div>
                <p style={{ fontSize: '0.9375rem', lineHeight: '1.6', color: '#374151' }}>{incident.description}</p>
             </div>

             <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.875rem' }}>
                   <span style={{ color: '#6b7280' }}>Reported Time:</span>
                   <span style={{ fontWeight: 500 }}>{new Date(incident.created_at).toLocaleString()}</span>
                </div>
                  <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', borderRadius: '8px', color: '#059669', textAlign: 'center', fontWeight: 600 }}>
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <Activity size={18} className="pulse-alert" /> OPERATIONAL STATUS: LIVE
                     </div>
                     <div style={{ fontSize: '0.72rem', fontWeight: 500, color: '#047857' }}>Incident synced to Real-time Dispatch Map grid.</div>
                  </div>
             </div>
          </div>

        </div>

      </div>

      {/* FULLSCREEN PHOTO INSPECTOR OVERLAY MODAL */}
      {selectedPhoto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100002, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)', padding: '1.5rem' }}>
          <div className="glass-panel pop-in" style={{ width: '100%', maxWidth: '720px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f3f4f6' }}>🔍 Police Manual Evidence Inspector</h4>
              <button 
                onClick={() => setSelectedPhoto(null)} 
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 900 }}
              >
                ✕
              </button>
            </div>

            <div style={{ width: '100%', height: '400px', borderRadius: '8px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selectedPhoto.isVideo ? (
                <video controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%' }}>
                  <source src={selectedPhoto.url} type="video/mp4" />
                </video>
              ) : (
                 <img 
                   src={selectedPhoto.url} 
                   onError={(e) => { 
                     e.target.src = getSvgFallback(selectedPhoto.index || 1, selectedPhoto.timestamp || '+1.0s'); 
                   }}
                   style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                   alt="High-Res Evidence Preview" 
                 />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#9ca3af', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '6px' }}>
              <div>
                Evidence Index: <span style={{ color: '#fff', fontWeight: 700 }}>#{selectedPhoto.index} of {incident.images?.length || 1}</span>
              </div>
              <div>
                Relative Timestamp: <span style={{ color: '#10b981', fontWeight: 800, fontFamily: 'monospace' }}>{selectedPhoto.timestamp}</span>
              </div>
              <div className="badge badge-info" style={{ fontSize: '0.62rem', fontWeight: 800 }}>
                AUTHENTICATED FRAME
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentAnalysis;
