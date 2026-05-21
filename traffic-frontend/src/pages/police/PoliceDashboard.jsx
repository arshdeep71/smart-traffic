import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Marker, Popup } from 'react-leaflet';
import api from '../../services/api';
import { PremiumMap } from '../../components/LiveTracking/LiveTrackingView';
import { createLocationPin, createAmbulanceIcon } from '../../components/LiveTracking/mapIcons';
import L from 'leaflet';
import { 
  Shield, CheckCircle, Clock, ArrowLeft, AlertTriangle, User, Mail, MapPin, 
  Activity, Phone, ExternalLink, ShieldCheck, Eye, Compass, RefreshCw, X, Radio, Server, ShieldAlert
} from 'lucide-react';

// Custom Police Icon creation
export function createPoliceIcon(bearing = 0) {
  return L.divIcon({
    className: "ltv-custom-div-icon",
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    html: `
      <div style="
        position: relative;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid rgba(59,130,246,0.5);
          animation: pulse-ring-police 2s ease-out infinite;
        "></div>
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 0 15px rgba(59,130,246,0.6);
          transform: rotate(${bearing}deg);
          position: relative;
          z-index: 1;
        ">🚓</div>
      </div>
    `,
  });
}

export const PoliceDashboard = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'complaints';

  const [accidents, setAccidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Moving Timeline Simulation States
  const [timelineStep, setTimelineStep] = useState(0); 
  const [policeCoords, setPoliceCoords] = useState(null);
  const timelineInterval = useRef(null);

  const fetchAccidents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accidents');
      const rawAcc = res.data?.data;
      const accArray = Array.isArray(rawAcc) ? rawAcc : (Array.isArray(rawAcc?.data) ? rawAcc.data : []);
      setAccidents(accArray);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccidents();
    return () => {
      if (timelineInterval.current) clearInterval(timelineInterval.current);
    };
  }, []);

  // Sync timeline and police location when selecting an incident
  useEffect(() => {
    if (selectedIncident) {
      if (selectedIncident.status === 'police_notified' || selectedIncident.status === 'dispatched') {
        setTimelineStep(4);
        const lat = selectedIncident.location?.coordinates?.[1] || 31.2522427094373;
        const lng = selectedIncident.location?.coordinates?.[0] || 75.70313062579577;
        setPoliceCoords([lat, lng]);
      } else {
        setTimelineStep(0);
        setPoliceCoords(null);
      }
    } else {
      setTimelineStep(0);
      setPoliceCoords(null);
      if (timelineInterval.current) clearInterval(timelineInterval.current);
    }
  }, [selectedIncident]);

  const startPoliceDispatch = async (incidentId) => {
    if (!selectedIncident) return;
    setUpdatingStatus(true);
    try {
      const res = await api.put(`/accidents/${incidentId}`, { status: 'police_notified' });
      const updatedIncident = res.data?.data;
      if (updatedIncident) {
        setAccidents(prev => prev.map(a => (a.id === updatedIncident.id || a._id === updatedIncident._id) ? updatedIncident : a));
        setSelectedIncident(updatedIncident);
      }

      // Start dynamic dispatch timeline
      setTimelineStep(1);
      const startLat = 31.2592;
      const startLng = 75.6980;
      const destLat = selectedIncident.location?.coordinates?.[1] || 31.2522427094373;
      const destLng = selectedIncident.location?.coordinates?.[0] || 75.70313062579577;
      
      setPoliceCoords([startLat, startLng]);

      let step = 1;
      if (timelineInterval.current) clearInterval(timelineInterval.current);
      
      timelineInterval.current = setInterval(() => {
        step += 1;
        setTimelineStep(step);
        
        // Linear path interpolation
        const pct = (step - 1) / 3;
        const curLat = startLat + (destLat - startLat) * pct;
        const curLng = startLng + (destLng - startLng) * pct;
        setPoliceCoords([curLat, curLng]);
        
        if (step >= 4) {
          clearInterval(timelineInterval.current);
        }
      }, 3000);
      
    } catch (e) {
      alert('Failed to dispatch Police response team.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleVerify = async (incidentId) => {
    setUpdatingStatus(true);
    try {
      const res = await api.post(`/accidents/${incidentId}/verify`);
      const updatedIncident = res.data?.data;
      if (updatedIncident) {
        setAccidents(prev => prev.map(a => (a.id === updatedIncident.id || a._id === updatedIncident._id) ? updatedIncident : a));
        setSelectedIncident(updatedIncident);
        alert('Accident verified and flagged as under investigation!');
      }
    } catch (e) {
      alert('Verification failed.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleResolve = async (incidentId) => {
    setUpdatingStatus(true);
    try {
      const res = await api.put(`/accidents/${incidentId}`, { status: 'resolved' });
      const updatedIncident = res.data?.data;
      if (updatedIncident) {
        setAccidents(prev => prev.map(a => (a.id === updatedIncident.id || a._id === updatedIncident._id) ? updatedIncident : a));
        setSelectedIncident(null);
        alert('Case marked as resolved and logged in history archive.');
      }
    } catch (e) {
      alert('Resolution failed.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Filters
  const activeComplaints = accidents.filter(a => ['pending', 'verified', 'police_notified', 'dispatched'].includes(a.status));
  const historyComplaints = accidents.filter(a => ['resolved', 'rejected'].includes(a.status));

  const getStatusBadgeClass = (status) => {
    return {
      pending: 'badge-info',
      verified: 'badge-warning',
      police_notified: 'badge-danger',
      dispatched: 'badge-danger',
      resolved: 'badge-success',
      rejected: 'badge-dark'
    }[status] || 'badge-dark';
  };

  const getStatusLabel = (status) => {
    return {
      pending: 'Pending Verification',
      verified: 'Under Investigation',
      police_notified: 'Emergency Dispatched',
      dispatched: 'Emergency Dispatched',
      resolved: 'Resolved Cases',
      rejected: 'Closed / Rejected'
    }[status] || status;
  };

  return (
    <div className="command-center-root fade-in">
      
      {/* COMMAND CENTER HEADER & DIAGNOSTICS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#090d16', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px', padding: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#3b82f6', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.1em' }} className="pulse-alert">
            <Radio size={14} /> LIVE SATELLITE COMMS LINKED
          </div>
          <h2 style={{ margin: '0.2rem 0 0 0', color: '#fff', fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
            🚨 Traffic Police Command Center
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }} className="telemetry-diagnostics">
          {[
            ['📟 CHANNEL', 'PATROLS: ACTIVE', '#3b82f6'],
            ['🛰️ GNSS LOCK', 'LPU BLOCK 38', '#10b981'],
            ['📡 BANDWIDTH', '148.95 MHz', '#8b5cf6'],
            ['🛡️ SECURITY', 'AES-256-GCM', '#f59e0b']
          ].map(([k, v, color]) => (
            <div key={k} style={{ borderLeft: '2px solid rgba(255,255,255,0.06)', paddingLeft: '1rem' }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#6b7280', letterSpacing: '0.05em' }}>{k}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: color, marginTop: '0.1rem' }}>{v}</div>
            </div>
          ))}
          <button onClick={fetchAccidents} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', width: '32px', height: '32px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: INCIDENT COMPLAINTS LIST */}
        <div className="glass-panel" style={{ padding: '1.25rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
              <ShieldAlert size={18} style={{ color: activeTab === 'complaints' ? '#3b82f6' : '#6b7280' }} />
              {activeTab === 'complaints' ? 'Active Emergency Complaints' : 'Historical Accident Archive'}
            </h3>
            <span className="badge badge-info" style={{ fontSize: '0.62rem', fontWeight: 800 }}>
              {activeTab === 'complaints' ? activeComplaints.length : historyComplaints.length} CASES
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '640px', overflowY: 'auto', paddingRight: '0.2rem' }}>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <Activity size={24} className="animate-spin" style={{ color: '#3b82f6', margin: '0 auto 0.75rem auto' }} />
                <span style={{ fontSize: '0.8rem' }}>Loading emergency data...</span>
              </div>
            ) : (activeTab === 'complaints' ? activeComplaints : historyComplaints).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280', fontSize: '0.82rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.06)' }}>
                No records listed in this sector queue.
              </div>
            ) : (
              (activeTab === 'complaints' ? activeComplaints : historyComplaints).map((acc) => {
                const isSelected = selectedIncident?.id === acc.id || selectedIncident?._id === acc._id;
                return (
                  <div 
                    key={acc.id || acc._id}
                    onClick={() => setSelectedIncident(acc)}
                    className="card-hover-police"
                    style={{ 
                      padding: '1rem', 
                      background: isSelected ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)', 
                      border: isSelected ? '1.5px solid #3b82f6' : '1px solid rgba(255,255,255,0.05)', 
                      borderRadius: '10px', 
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Glowing Accent */}
                    {acc.severity === 'high' && (
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: '#ef4444' }} />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#6b7280', fontFamily: 'monospace' }}>
                        ID: {(acc.id || acc._id || '').slice(-6).toUpperCase()}
                      </span>
                      <span className={`badge ${getStatusBadgeClass(acc.status)}`} style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.1rem 0.4rem' }}>
                        {getStatusLabel(acc.status)}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                      {acc.title}
                    </h4>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.6rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <User size={10} /> {acc.category}
                      </span>
                      <span style={{ color: acc.severity === 'high' ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>
                        {acc.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: ACTIVE INVESTIGATION & TELEMETRY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {!selectedIncident ? (
            <div className="glass-panel" style={{ padding: '3.5rem 2rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', height: '100%', minHeight: '450px', textAlign: 'center' }}>
              <div className="pulse-alert" style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(59,130,246,0.05)', border: '2px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                <ShieldAlert size={34} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1rem', fontWeight: 800 }}>Awaiting Incident Telemetry Escalation</h4>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.78rem', maxWidth: '320px', lineHeight: '1.5' }}>
                  Select an active complaint ticket in the dispatch queue to deploy police patrols, track real-time units, and review visual canvas frame archives.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* COMPLAINT DETAILS BOX */}
              <div className="glass-panel" style={{ padding: '1.5rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', position: 'relative' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#6b7280', fontFamily: 'monospace' }}>
                      CASE: {selectedIncident.id || selectedIncident._id}
                    </span>
                    <h3 style={{ margin: '0.2rem 0 0 0', color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
                      {selectedIncident.title}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedIncident(null)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <User size={14} style={{ color: '#3b82f6' }} />
                      <span>Citizen: <strong style={{ color: '#fff' }}>{selectedIncident.user?.name || 'Authorized Citizen'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Mail size={14} style={{ color: '#3b82f6' }} />
                      <span>Email: <span style={{ color: '#fff' }}>{selectedIncident.user?.email || 'citizen@safety.gov'}</span></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={14} style={{ color: '#3b82f6' }} />
                      <span>GPS: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{selectedIncident.location?.coordinates?.[1].toFixed(5)}, {selectedIncident.location?.coordinates?.[0].toFixed(5)}</span></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      Category: <strong style={{ color: '#fff' }}>{selectedIncident.category}</strong>
                    </div>
                    <div>
                      Severity Level: <span style={{ color: selectedIncident.severity === 'high' ? '#ef4444' : '#f59e0b', fontWeight: 800 }}>{selectedIncident.severity.toUpperCase()}</span>
                    </div>
                    <div>
                      Logged At: <span style={{ color: '#fff' }}>{new Date(selectedIncident.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Incident Description</div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#d1d5db', lineHeight: '1.5' }}>
                    {selectedIncident.description}
                  </p>
                </div>

                {/* DYNAMIC TIMELINE STATUS PROGRESS UI */}
                {selectedIncident.status !== 'pending' && selectedIncident.status !== 'resolved' && (
                  <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '10px', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.6rem' }} className="pulse-alert">
                      <span>🚓 DISPATCH TRACKER OVER GNSS LINK</span>
                      <span>{timelineStep >= 4 ? 'UNIT DEPLOYED' : 'EN ROUTE'}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#9ca3af', marginBottom: '0.5rem', fontWeight: 700 }}>
                      <span style={{ color: timelineStep >= 1 ? '#3b82f6' : '#4b5563' }}>1. Patrol Alerted</span>
                      <span style={{ color: timelineStep >= 2 ? '#3b82f6' : '#4b5563' }}>2. En Route</span>
                      <span style={{ color: timelineStep >= 3 ? '#3b82f6' : '#4b5563' }}>3. Approaching</span>
                      <span style={{ color: timelineStep >= 4 ? '#10b981' : '#4b5563' }}>4. Active</span>
                    </div>

                    <div style={{ height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          background: timelineStep >= 4 ? 'linear-gradient(90deg, #3b82f6, #10b981)' : '#3b82f6', 
                          width: `${(timelineStep / 4) * 100}%`,
                          transition: 'width 0.8s ease-in-out'
                        }} 
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* MAP AND EVIDENCE SUBGRID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem' }}>
                
                {/* LIVE EMBEDDED MAP */}
                <div className="glass-panel" style={{ padding: '1rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', height: '340px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={16} style={{ color: '#3b82f6' }} /> Live Incident Map Grid
                  </div>
                  <div style={{ width: '100%', height: 'calc(100% - 25px)', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <PremiumMap center={[selectedIncident.location?.coordinates?.[1] || 31.25224, selectedIncident.location?.coordinates?.[0] || 75.70313]} zoom={15}>
                      {/* Incident Pin */}
                      <Marker 
                        position={[selectedIncident.location?.coordinates?.[1] || 31.25224, selectedIncident.location?.coordinates?.[0] || 75.70313]} 
                        icon={createLocationPin(selectedIncident.title)}
                      >
                        <Popup className="uber-popup"><div style={{padding:'0.2rem'}}>{selectedIncident.title}</div></Popup>
                      </Marker>

                      {/* Police patrol movement marker */}
                      {policeCoords && (
                        <Marker position={policeCoords} icon={createPoliceIcon()}>
                          <Popup className="uber-popup"><div style={{padding:'0.2rem'}}>Traffic Police Patrol Unit 08</div></Popup>
                        </Marker>
                      )}

                      {/* Ambulance marker if dispatched */}
                      {(selectedIncident.status === 'dispatched' || selectedIncident.status === 'police_notified') && (
                        <Marker position={[selectedIncident.location?.coordinates?.[1] - 0.001, selectedIncident.location?.coordinates?.[0] + 0.001]} icon={createAmbulanceIcon()}>
                          <Popup className="uber-popup"><div style={{padding:'0.2rem'}}>Smart Ambulance Unit 14</div></Popup>
                        </Marker>
                      )}
                    </PremiumMap>
                  </div>
                </div>

                {/* EVIDENCE GALLERY VIEWER */}
                <div className="glass-panel" style={{ padding: '1rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
                    📸 Evidence Vault ({selectedIncident.images?.length || 0} Frames)
                  </div>
                  
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', overflowY: 'auto', contentVisibility: 'auto' }}>
                    {(!selectedIncident.images || selectedIncident.images.length === 0) ? (
                      <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', color: '#6b7280', fontStyle: 'italic', textAlign: 'center', height: '100%' }}>
                        No photographic snapshots linked.
                      </div>
                    ) : (
                      selectedIncident.images.map((img, i) => {
                        const isVideo = img.endsWith('.mp4') || img.endsWith('.webm') || img.endsWith('.mov');
                        const url = `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${img}`;
                        const mockTime = `+${(i + 1).toFixed(1)}s`;
                        return (
                          <div 
                            key={i} 
                            onClick={() => setPreviewPhoto({ url, isVideo, index: i + 1, timestamp: mockTime })}
                            style={{ position: 'relative', height: '70px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', cursor: 'zoom-in', background: '#000' }}
                            className="card-hover"
                          >
                            {isVideo ? (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: '#fff', background: 'rgba(0,0,0,0.5)' }}>
                                🎥 PLAY
                              </div>
                            ) : (
                              <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Frame'; }} />
                            )}
                            <span style={{ position: 'absolute', bottom: 2, right: 2, fontSize: '0.55rem', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '1px 3px', borderRadius: '2px', fontFamily: 'monospace' }}>
                              {mockTime}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div style={{ fontSize: '0.62rem', color: '#6b7280', fontStyle: 'italic', textAlign: 'center', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.4rem' }}>
                    Manually review frames to verify claims.
                  </div>
                </div>

              </div>

              {/* ACTION COMMAND CONTROLS */}
              <div style={{ display: 'flex', gap: '1rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1rem' }}>
                
                {selectedIncident.status === 'pending' && (
                  <button 
                    onClick={() => handleVerify(selectedIncident.id || selectedIncident._id)}
                    disabled={updatingStatus}
                    className="btn btn-outline"
                    style={{ flex: 1, borderColor: '#f59e0b', color: '#f59e0b', padding: '0.75rem', fontSize: '0.8rem', fontWeight: 800 }}
                  >
                    ✓ Start Manual Review
                  </button>
                )}

                {selectedIncident.status !== 'resolved' && (
                  <button 
                    onClick={() => startPoliceDispatch(selectedIncident.id || selectedIncident._id)}
                    disabled={updatingStatus || selectedIncident.status === 'police_notified' || selectedIncident.status === 'dispatched'}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.75rem', fontSize: '0.8rem', fontWeight: 800, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', cursor: 'pointer' }}
                  >
                    <Shield size={14} /> Dispatch Police Unit
                  </button>
                )}

                {selectedIncident.status !== 'resolved' && (
                  <button 
                    onClick={() => handleResolve(selectedIncident.id || selectedIncident._id)}
                    disabled={updatingStatus}
                    className="btn btn-danger"
                    style={{ flex: 1, padding: '0.75rem', fontSize: '0.8rem', fontWeight: 800, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  >
                    Mark Incident as Resolved
                  </button>
                )}

              </div>

            </div>
          )}

        </div>

      </div>

      {/* FULLSCREEN PHOTO INSPECTOR OVERLAY MODAL */}
      {previewPhoto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100005, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)', padding: '1.5rem' }}>
          <div className="glass-panel pop-in" style={{ width: '100%', maxWidth: '720px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f3f4f6' }}>🔍 Police Manual Evidence Inspector</h4>
              <button 
                onClick={() => setPreviewPhoto(null)} 
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 900 }}
              >
                ✕
              </button>
            </div>

            <div style={{ width: '100%', height: '400px', borderRadius: '8px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previewPhoto.isVideo ? (
                <video controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%' }}>
                  <source src={previewPhoto.url} type="video/mp4" />
                </video>
              ) : (
                <img src={previewPhoto.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="High-Res Evidence Preview" />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#9ca3af', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '6px' }}>
              <div>
                Frame Index: <span style={{ color: '#fff', fontWeight: 700 }}>#{previewPhoto.index} of {selectedIncident?.images?.length || 1}</span>
              </div>
              <div>
                Relative Timestamp: <span style={{ color: '#10b981', fontWeight: 800, fontFamily: 'monospace' }}>{previewPhoto.timestamp}</span>
              </div>
              <div className="badge badge-info" style={{ fontSize: '0.62rem', fontWeight: 800 }}>
                AUTHENTICATED FRAME
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .command-center-root {
          padding: 1.5rem;
          background: #040810;
          color: #fff;
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
        }
        .card-hover-police {
          transition: all 0.2s ease-out;
        }
        .card-hover-police:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(59, 130, 246, 0.4) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.15);
        }
        @keyframes pulse-ring-police {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6); }
          70% { box-shadow: 0 0 0 12px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>
    </div>
  );
};

export default PoliceDashboard;
