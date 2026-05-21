import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Marker, Popup } from 'react-leaflet';
import api from '../../services/api';
import { PremiumMap } from '../../components/LiveTracking/LiveTrackingView';
import { createLocationPin, createAmbulanceIcon, createPoliceIcon } from '../../components/LiveTracking/mapIcons';
import { connectSocket } from '../../services/socket';
import L from 'leaflet';
import { 
  Shield, CheckCircle, Clock, ArrowLeft, AlertTriangle, User, Mail, MapPin, 
  Activity, Phone, ExternalLink, ShieldCheck, Eye, Compass, RefreshCw, X, Radio, Server, ShieldAlert,
  Film, FileText, CheckCircle2, ChevronRight, ZoomIn
} from 'lucide-react';

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

  // Socket Connection
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to live emergency socket engine
    const s = connectSocket({ role: 'traffic_police' });
    socketRef.current = s;

    return () => {
      if (s) s.disconnect();
    };
  }, []);

  // Auto register socket room for the selected incident
  useEffect(() => {
    if (selectedIncident && socketRef.current) {
      const eId = selectedIncident.id || selectedIncident._id;
      if (eId) {
        socketRef.current.emit('register-citizen', { role: 'traffic_police', emergencyId: eId });
      }
    }
  }, [selectedIncident]);

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
      const statusLower = selectedIncident.status?.toLowerCase() || '';
      if (statusLower.includes('active') || statusLower.includes('investigation') || statusLower.includes('approaching') || statusLower.includes('route') || statusLower.includes('dispatched') || statusLower.includes('notified')) {
        setTimelineStep(5);
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

  // Dynamic dispatch status timeline simulator with real-time socket broadcasting
  const startPoliceDispatch = async (incidentId) => {
    if (!selectedIncident) return;
    setUpdatingStatus(true);
    try {
      const res = await api.put(`/accidents/${incidentId}`, { status: 'Police team notified' });
      const updatedIncident = res.data?.data;
      if (updatedIncident) {
        setAccidents(prev => prev.map(a => (a.id === updatedIncident.id || a._id === updatedIncident._id) ? updatedIncident : a));
        setSelectedIncident(updatedIncident);
      }

      // 1. Initial Step: Alerted
      setTimelineStep(1);
      if (socketRef.current) {
        socketRef.current.emit('emergency-status-updated', {
          emergencyId: incidentId,
          status: 'Police team notified'
        });
      }

      const startLat = 31.2592;
      const startLng = 75.6980;
      const destLat = selectedIncident.location?.coordinates?.[1] || 31.2522427094373;
      const destLng = selectedIncident.location?.coordinates?.[0] || 75.70313062579577;
      
      setPoliceCoords([startLat, startLng]);

      let step = 1;
      if (timelineInterval.current) clearInterval(timelineInterval.current);
      
      const statuses = [
        'Police team notified',
        'Patrol unit dispatched',
        'Unit en route',
        'Officers approaching',
        'Investigation active'
      ];

      timelineInterval.current = setInterval(async () => {
        step += 1;
        setTimelineStep(step);
        
        const curStatus = statuses[step - 1];

        // Update backend database for final step or critical steps
        if (step === 5) {
          try {
            await api.put(`/accidents/${incidentId}`, { status: curStatus });
          } catch (_) {}
        }
        
        // Broadcast real-time status update to citizen via socket
        if (socketRef.current) {
          socketRef.current.emit('emergency-status-updated', {
            emergencyId: incidentId,
            status: curStatus
          });
        }

        // Linear path interpolation
        const pct = (step - 1) / 4; // 0 to 1 over 5 steps
        const curLat = startLat + (destLat - startLat) * pct;
        const curLng = startLng + (destLng - startLng) * pct;
        setPoliceCoords([curLat, curLng]);
        
        // Broadcast real-time GPS coordinates of the moving police vehicle
        if (socketRef.current) {
          socketRef.current.emit('ambulance-gps', {
            emergencyId: incidentId,
            lat: curLat,
            lng: curLng,
            driverId: 'police-patrol'
          });
        }

        if (step >= 5) {
          clearInterval(timelineInterval.current);
          fetchAccidents();
        }
      }, 3000);
      
    } catch (e) {
      alert('Failed to initiate police dispatch.');
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

  const handleRejectPrompt = async (incidentId) => {
    const reason = prompt("Please enter the reason for rejecting this emergency incident report:");
    if (reason === null) return; // User cancelled
    if (!reason.trim()) {
      alert("A rejection reason is required.");
      return;
    }
    
    setUpdatingStatus(true);
    try {
      const res = await api.post(`/accidents/${incidentId}/reject`, { reason });
      const updatedIncident = res.data?.data;
      if (updatedIncident) {
        setAccidents(prev => prev.map(a => (a.id === updatedIncident.id || a._id === updatedIncident._id) ? updatedIncident : a));
        setSelectedIncident(updatedIncident);
        
        // Broadcast manual rejection update to the citizen in real time
        if (socketRef.current) {
          socketRef.current.emit('emergency-status-updated', {
            emergencyId: incidentId,
            status: 'rejected',
            reason: reason
          });
        }
        alert('Emergency report has been rejected and the reporter has been notified.');
      }
    } catch (e) {
      alert('Rejection failed.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getCitizenDetails = (incident) => {
    if (!incident) return { name: 'Anonymous Citizen', email: 'citizen@safety.gov', role: 'Citizen', time: '—', userId: '—' };
    
    const u = incident.user || incident.citizen;
    if (u) {
      return {
        name: incident.reporter_name || u.name || 'Anonymous Citizen',
        email: incident.reporter_email || u.email || 'N/A',
        role: u.role || 'Citizen',
        time: new Date(incident.created_at || Date.now()).toLocaleString(),
        userId: u.id || u._id || incident.user_id || 'N/A'
      };
    }

    return {
      name: incident.reporter_name || 'Anonymous Citizen',
      email: incident.reporter_email || 'citizen@safety.gov',
      role: 'Citizen',
      time: new Date(incident.created_at || Date.now()).toLocaleString(),
      userId: incident.user_id || 'N/A'
    };
  };

  // Filters
  const activeComplaints = accidents.filter(a => ['pending', 'verified', 'police_notified', 'dispatched', 'police team notified', 'patrol unit dispatched', 'unit en route', 'officers approaching', 'investigation active'].includes(a.status?.toLowerCase()));
  const historyComplaints = accidents.filter(a => ['resolved', 'rejected'].includes(a.status?.toLowerCase()));

  const getStatusBadgeClass = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('pending')) return 'badge-info';
    if (s.includes('investigation') || s.includes('verified')) return 'badge-warning';
    if (s.includes('dispatched') || s.includes('notified') || s.includes('en route') || s.includes('approaching')) return 'badge-danger';
    if (s.includes('resolved')) return 'badge-success';
    return 'badge-dark';
  };

  const getStatusLabel = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('pending')) return 'Pending Verification';
    if (s.includes('investigation') || s.includes('verified')) return 'Under Investigation';
    if (s.includes('dispatched') || s.includes('notified') || s.includes('en route') || s.includes('approaching')) return 'Emergency Dispatched';
    if (s.includes('resolved')) return 'Resolved Case';
    return status;
  };

  return (
    <div className="command-center-root fade-in">
      
      {/* COMMAND CENTER HEADER & TELEMETRY */}
      <div className="diagnostic-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#3b82f6', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.1em' }} className="pulse-alert">
            <Radio size={14} /> SECURITY GNSS PATROL COMMS ACTIVE
          </div>
          <h2 style={{ margin: '0.2rem 0 0 0', color: '#fff', fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
            👮 SmartTraffic Incident Operations Center
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }} className="telemetry-diagnostics">
          {[
            ['📟 PATROL NET', 'SECURE TRANSCODE', '#3b82f6'],
            ['🛰️ GNSS LOCK', '31.25224 N, 75.70313 E', '#10b981'],
            ['📡 FREQUENCY', '148.950 MHz', '#8b5cf6'],
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: ACTIVE / HISTORIC INCIDENT COMPLAINTS LIST */}
        <div className="glass-panel" style={{ padding: '1.25rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
              <ShieldAlert size={18} style={{ color: '#3b82f6' }} />
              {activeTab === 'complaints' ? 'Active Emergency Queue' : 'Incident Archive'}
            </h3>
            <span className="badge badge-info" style={{ fontSize: '0.62rem', fontWeight: 800 }}>
              {activeTab === 'complaints' ? activeComplaints.length : historyComplaints.length} DISPATCHES
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '640px', overflowY: 'auto', paddingRight: '0.2rem' }}>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <Activity size={24} className="animate-spin" style={{ color: '#3b82f6', margin: '0 auto 0.75rem auto' }} />
                <span style={{ fontSize: '0.8rem' }}>Loading emergency systems...</span>
              </div>
            ) : (activeTab === 'complaints' ? activeComplaints : historyComplaints).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280', fontSize: '0.82rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.06)' }}>
                No dispatches logged in this sector queue.
              </div>
            ) : (
              (activeTab === 'complaints' ? activeComplaints : historyComplaints).map((acc) => {
                const isSelected = selectedIncident?.id === acc.id || selectedIncident?._id === acc._id;
                const citizen = getCitizenDetails(acc);
                const isResolved = acc.status?.toLowerCase() === 'resolved';
                
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
                    {/* Glowing Severity Accent */}
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

                    {/* Real Citizen details integrated onto list card */}
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <User size={12} style={{ color: '#3b82f6' }} />
                      <span>Reporter: <strong>{citizen.name}</strong></span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#9ca3af', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        📸 {acc.images?.length || 0} Frames
                      </span>
                      <span style={{ color: acc.severity === 'high' ? '#ef4444' : '#f59e0b', fontWeight: 800 }}>
                        {acc.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: ACTIVE INVESTIGATION CONSOLE & EVIDENCE INSPECTOR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {!selectedIncident ? (
            <div className="glass-panel" style={{ padding: '3.5rem 2rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', height: '100%', minHeight: '480px', textAlign: 'center' }}>
              <div className="pulse-alert" style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(59,130,246,0.05)', border: '2px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                <ShieldAlert size={34} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1rem', fontWeight: 800 }}>Awaiting Incident Dispatch Telemetry</h4>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.78rem', maxWidth: '320px', lineHeight: '1.5' }}>
                  Select an active complaint ticket in the queue to deploy high-priority police dispatches, track real-time coordinates, and verify frame snapshots.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* REAL CITIZEN IDENTITY CARD & COMPLAINT METADATA */}
              <div className="glass-panel" style={{ padding: '1.5rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', position: 'relative' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`badge ${getStatusBadgeClass(selectedIncident.status)}`} style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.1rem 0.4rem' }}>
                        {getStatusLabel(selectedIncident.status)}
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#6b7280', fontFamily: 'monospace' }}>
                        CASE: {selectedIncident.id || selectedIncident._id}
                      </span>
                    </div>
                    <h3 style={{ margin: '0.4rem 0 0 0', color: '#fff', fontSize: '1.15rem', fontWeight: 800 }}>
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

                {/* Professional Identity Section - Reporter details resolved from Supabase/Auth */}
                <div style={{ background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <ShieldCheck size={12} /> SECURE AUDITED CITIZEN IDENTITY
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '1rem', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ color: '#9ca3af' }}>Reporter Name: <strong style={{ color: '#fff' }}>{getCitizenDetails(selectedIncident).name}</strong></span>
                      <span style={{ color: '#9ca3af' }}>Contact Email: <span style={{ color: '#3b82f6', textDecoration: 'underline' }}>{getCitizenDetails(selectedIncident).email}</span></span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ color: '#9ca3af' }}>Secured Role: <span style={{ color: '#fff', fontWeight: 700 }}>{getCitizenDetails(selectedIncident).role}</span></span>
                      <span style={{ color: '#9ca3af' }}>User UID: <span style={{ color: '#10b981', fontFamily: 'monospace', fontSize: '0.7rem' }}>{getCitizenDetails(selectedIncident).userId}</span></span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1.25rem' }}>
                  <div>
                    Category: <strong style={{ color: '#fff' }}>{selectedIncident.category}</strong>
                  </div>
                  <div>
                    Severity Level: <span style={{ color: selectedIncident.severity === 'high' ? '#ef4444' : '#f59e0b', fontWeight: 800 }}>{selectedIncident.severity.toUpperCase()}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin size={12} style={{ color: '#ef4444' }} />
                    <span>Incident GNSS coordinates: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{selectedIncident.location?.coordinates?.[1].toFixed(6)} N, {selectedIncident.location?.coordinates?.[0].toFixed(6)} E</span></span>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Incident Description</div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#d1d5db', lineHeight: '1.5' }}>
                    {selectedIncident.description}
                  </p>
                </div>

                {/* DYNAMIC TIMELINE STATUS PROGRESS UI */}
                {selectedIncident.status?.toLowerCase() !== 'pending' && selectedIncident.status?.toLowerCase() !== 'resolved' && (
                  <div style={{ padding: '1.25rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '10px', marginTop: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.6rem' }} className="pulse-alert">
                      <span>🚓 LIVE TRANSCODE TIMELINE — ACTIVE ESCALATION</span>
                      <span>{timelineStep >= 5 ? 'OFFICERS ON SCENE' : 'EN ROUTE'}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: '#9ca3af', marginBottom: '0.5rem', fontWeight: 700 }}>
                      <span style={{ color: timelineStep >= 1 ? '#3b82f6' : '#4b5563' }}>1. Alerted</span>
                      <span style={{ color: timelineStep >= 2 ? '#3b82f6' : '#4b5563' }}>2. Dispatched</span>
                      <span style={{ color: timelineStep >= 3 ? '#3b82f6' : '#4b5563' }}>3. En Route</span>
                      <span style={{ color: timelineStep >= 4 ? '#3b82f6' : '#4b5563' }}>4. Approaching</span>
                      <span style={{ color: timelineStep >= 5 ? '#10b981' : '#4b5563' }}>5. Active</span>
                    </div>

                    <div style={{ height: '5px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          background: timelineStep >= 5 ? 'linear-gradient(90deg, #3b82f6, #10b981)' : '#3b82f6', 
                          width: `${(timelineStep / 5) * 100}%`,
                          transition: 'width 0.8s ease-in-out'
                        }} 
                      />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', fontSize: '0.72rem', color: '#9ca3af' }}>
                      <Activity size={12} className="pulse-alert" style={{ color: '#10b981' }} />
                      <span>Current Status Feed: <strong style={{ color: '#fff' }}>{selectedIncident.status}</strong></span>
                    </div>
                  </div>
                )}

                {/* Timeline display for resolved historic dispatches */}
                {selectedIncident.status?.toLowerCase() === 'resolved' && (
                  <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '8px', marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.78rem' }}>
                    <CheckCircle2 size={16} />
                    <span><strong>Incident Resolved:</strong> Emergency closed, priority route corridor released and logged.</span>
                  </div>
                )}

              </div>

              {/* MAP AND EVIDENCE SUBGRID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '1.5rem' }}>
                
                {/* LIVE EMBEDDED LEAFLET MAP */}
                <div className="glass-panel" style={{ padding: '1rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', height: '340px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={16} style={{ color: '#3b82f6' }} /> Live Response Grid Map (LPU Block 38)
                  </div>
                  <div style={{ width: '100%', height: 'calc(100% - 25px)', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <PremiumMap center={[selectedIncident.location?.coordinates?.[1] || 31.2522427094373, selectedIncident.location?.coordinates?.[0] || 75.70313062579577]} zoom={15}>
                      {/* Incident / Citizen Marker */}
                      <Marker 
                        position={[selectedIncident.location?.coordinates?.[1] || 31.2522427094373, selectedIncident.location?.coordinates?.[0] || 75.70313062579577]} 
                        icon={createLocationPin(selectedIncident.title)}
                      >
                        <Popup className="uber-popup">
                          <div style={{padding:'0.2rem'}}>
                            <strong>{selectedIncident.title}</strong><br/>
                            Reporter: {getCitizenDetails(selectedIncident).name}
                          </div>
                        </Popup>
                      </Marker>

                      {/* Moving Police Unit interpolation */}
                      {policeCoords && (
                        <Marker position={policeCoords} icon={createPoliceIcon()}>
                          <Popup className="uber-popup"><div style={{padding:'0.2rem'}}>Patrol Patrol Unit 08</div></Popup>
                        </Marker>
                      )}

                      {/* Historical Resolved Case marker at target location */}
                      {selectedIncident.status?.toLowerCase() === 'resolved' && (
                        <Marker position={[selectedIncident.location?.coordinates?.[1], selectedIncident.location?.coordinates?.[0]]} icon={createPoliceIcon()}>
                          <Popup className="uber-popup"><div style={{padding:'0.2rem'}}>Patrol Unit (Investigation Closed)</div></Popup>
                        </Marker>
                      )}

                      {/* Ambulance marker if dispatched */}
                      {(selectedIncident.status?.toLowerCase().includes('dispatch') || selectedIncident.status?.toLowerCase().includes('notified')) && (
                        <Marker position={[selectedIncident.location?.coordinates?.[1] - 0.0008, selectedIncident.location?.coordinates?.[0] + 0.0008]} icon={createAmbulanceIcon()}>
                          <Popup className="uber-popup"><div style={{padding:'0.2rem'}}>Ambulance Unit 14</div></Popup>
                        </Marker>
                      )}
                    </PremiumMap>
                  </div>
                </div>

                {/* EVIDENCE GALLERY VAULT */}
                <div className="glass-panel" style={{ padding: '1rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Glowing badge instead of broken video player */}
                  {(selectedIncident.images || []).some(img => img.endsWith('.mp4') || img.endsWith('.mov') || img.endsWith('.webm')) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '6px', padding: '0.5rem', marginBottom: '0.75rem', color: '#10b981', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em' }} className="pulse-alert">
                      <Film size={12} /> ORIGINAL VIDEO CLIP ATTACHED & ARCHIVED
                    </div>
                  )}

                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
                    📸 Evidence Vault ({(selectedIncident.images || []).filter(img => !img.endsWith('.mp4') && !img.endsWith('.mov') && !img.endsWith('.webm')).length} Frames)
                  </div>
                  
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', overflowY: 'auto' }}>
                    {((selectedIncident.images || []).filter(img => !img.endsWith('.mp4') && !img.endsWith('.mov') && !img.endsWith('.webm')).length === 0) ? (
                      <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#6b7280', fontStyle: 'italic', textAlign: 'center', height: '100%', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                        <FileText size={18} />
                        No photo snapshots linked.
                      </div>
                    ) : (
                      (selectedIncident.images || []).filter(img => !img.endsWith('.mp4') && !img.endsWith('.mov') && !img.endsWith('.webm')).map((img, i) => {
                        const url = (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://')) ? img : `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${img}`;
                        const mockTime = `+${(i + 1).toFixed(1)}s`;
                        return (
                          <div 
                            key={i} 
                            onClick={(e) => {
                              const imgEl = e.currentTarget.querySelector('img');
                              const finalSrc = imgEl ? imgEl.src : url;
                              setPreviewPhoto({ url: finalSrc, index: i + 1, timestamp: mockTime });
                            }}
                            style={{ 
                              position: 'relative', 
                              height: '75px', 
                              borderRadius: '6px', 
                              overflow: 'hidden', 
                              border: '1px solid rgba(255,255,255,0.06)', 
                              cursor: 'zoom-in', 
                              background: '#040810' 
                            }}
                            className="card-hover-police"
                          >
                            <img 
                              src={url} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              onError={(e) => { 
                                e.target.src = getSvgFallback(i + 1, mockTime); 
                              }} 
                              alt="Evidence Snapshot"
                            />
                            <span style={{ position: 'absolute', bottom: 3, right: 3, fontSize: '0.55rem', background: 'rgba(9,13,22,0.85)', color: '#10b981', padding: '1px 4px', borderRadius: '2px', fontFamily: 'monospace', fontWeight: 800 }}>
                              {mockTime}
                            </span>
                            <div style={{ position: 'absolute', top: 3, left: 3, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                              <ZoomIn size={8} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* ACTION COMMAND CONTROLS */}
              <div style={{ display: 'flex', gap: '1rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1rem' }}>
                
                {selectedIncident.status?.toLowerCase() === 'pending' && (
                  <button 
                    onClick={() => handleVerify(selectedIncident.id || selectedIncident._id)}
                    disabled={updatingStatus}
                    className="btn btn-outline"
                    style={{ flex: 1, borderColor: '#f59e0b', color: '#f59e0b', padding: '0.75rem', fontSize: '0.8rem', fontWeight: 800 }}
                  >
                    ✓ Start Manual Review
                  </button>
                )}

                {selectedIncident.status?.toLowerCase() !== 'resolved' && selectedIncident.status?.toLowerCase() !== 'rejected' && (
                  <button 
                    onClick={() => startPoliceDispatch(selectedIncident.id || selectedIncident._id)}
                    disabled={updatingStatus || timelineStep > 0}
                    className="btn btn-primary"
                    style={{ 
                      flex: 1, 
                      padding: '0.75rem', 
                      fontSize: '0.8rem', 
                      fontWeight: 800, 
                      background: timelineStep > 0 ? 'rgba(59, 130, 246, 0.2)' : '#3b82f6', 
                      color: timelineStep > 0 ? '#64748b' : '#fff', 
                      border: 'none', 
                      borderRadius: 8, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.4rem', 
                      cursor: timelineStep > 0 ? 'not-allowed' : 'pointer' 
                    }}
                  >
                    <Shield size={14} /> {timelineStep > 0 ? 'Patrol Units Dispatched' : 'Dispatch Police Unit'}
                  </button>
                )}

                {selectedIncident.status?.toLowerCase() !== 'resolved' && selectedIncident.status?.toLowerCase() !== 'rejected' && (
                  <button 
                    onClick={() => handleResolve(selectedIncident.id || selectedIncident._id)}
                    disabled={updatingStatus}
                    className="btn btn-danger"
                    style={{ flex: 1, padding: '0.75rem', fontSize: '0.8rem', fontWeight: 800, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  >
                    Mark Incident as Resolved
                  </button>
                )}

                {selectedIncident.status?.toLowerCase() !== 'resolved' && selectedIncident.status?.toLowerCase() !== 'rejected' && (
                  <button 
                    onClick={() => handleRejectPrompt(selectedIncident.id || selectedIncident._id)}
                    disabled={updatingStatus}
                    className="btn btn-outline"
                    style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444', padding: '0.75rem', fontSize: '0.8rem', fontWeight: 800, background: 'transparent', border: '1px solid #ef4444', borderRadius: 8, cursor: 'pointer' }}
                  >
                    Reject Incident Report
                  </button>
                )}

              </div>

            </div>
          )}

        </div>

      </div>

      {/* FULLSCREEN EVIDENCE PREVIEW INSPECTOR MODAL */}
      {previewPhoto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100005, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9, 13, 22, 0.95)', backdropFilter: 'blur(8px)', padding: '1.5rem' }}>
          <div className="glass-panel pop-in" style={{ width: '100%', maxWidth: '720px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid rgba(255,255,255,0.1)', background: '#090d16' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Eye size={16} style={{ color: '#10b981' }} /> Secure Frame Evidence Inspector
              </h4>
              <button 
                onClick={() => setPreviewPhoto(null)} 
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 900 }}
              >
                ✕
              </button>
            </div>

            {/* High-res Image box with zoomed inspection styling */}
            <div style={{ width: '100%', height: '420px', borderRadius: '8px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <img 
                src={previewPhoto.url} 
                onError={(e) => { 
                  e.target.src = getSvgFallback(previewPhoto.index || 1, previewPhoto.timestamp || '+1.0s'); 
                }}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transition: 'transform 0.3s' }} 
                className="zoomable-image" 
                alt="Evidence Preview" 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#9ca3af', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '6px' }}>
              <div>
                Frame Index: <span style={{ color: '#fff', fontWeight: 700 }}>#{previewPhoto.index}</span>
              </div>
              <div>
                Relative Timestamp: <span style={{ color: '#10b981', fontWeight: 800, fontFamily: 'monospace' }}>{previewPhoto.timestamp}</span>
              </div>
              <div className="badge badge-info" style={{ fontSize: '0.62rem', fontWeight: 800 }}>
                AUTHENTIC EVIDENCE FRAME
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
        .diagnostic-header {
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 1.5rem; 
          background: #090d16; 
          border: 1px solid rgba(59,130,246,0.15); 
          border-radius: 12px; 
          padding: 1.25rem;
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
        .zoomable-image:hover {
          transform: scale(1.05);
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
