import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Activity, Car, Users, AlertOctagon, TrendingUp, Clock, AlertTriangle, MapPin, Camera, Navigation, Shield, ChevronRight, Building2, Radio } from 'lucide-react';
import { PremiumMap, AmbulanceMarker } from '../../components/LiveTracking/LiveTrackingView';
import { createLocationPin } from '../../components/LiveTracking/mapIcons';
import { Marker, Popup } from 'react-leaflet';
import { connectSocket } from '../../services/socket';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [accidents, setAccidents] = useState([]);
  const [activeAmbulances, setActiveAmbulances] = useState({});

  const fetchData = async () => {
    try {
      const [dashRes, accRes, hospRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/accidents'),
        api.get('/hospitals/overview')
      ]);
      const data = dashRes.data.data;
      data.hospitals = hospRes.data.data;
      setStats(data);
      
      const rawAcc = accRes.data?.data;
      const accArray = Array.isArray(rawAcc) ? rawAcc : (Array.isArray(rawAcc?.data) ? rawAcc.data : []);
      setAccidents(accArray.slice(0, 15)); 
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    
    // CONNECT TO LIVE EMERGENCY SOCKET ENGINE
    const s = connectSocket({ role: 'admin' });
    
    s.on('live-gps', (data) => {
        setActiveAmbulances(prev => ({
            ...prev,
            [data.driverId]: { ...data, lastUpdate: Date.now() }
        }));
    });
    
    s.on('emergency-created', (data) => {
        setAccidents(prev => {
            // Prevent duplicates
            if (prev.some(a => a._id === data.emergencyId || a.id === data.emergencyId)) return prev;
            
            return [{
                id: data.emergencyId,
                _id: data.emergencyId,
                title: data.title,
                description: `Live Report via Smart City SOS`,
                category: data.category,
                severity: data.severity.toLowerCase(),
                status: 'pending',
                location: { coordinates: [data.lng, data.lat] },
                created_at: new Date().toISOString()
            }, ...prev].slice(0, 15);
        });
        
        setStats(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                accidents: { ...prev.accidents, total: (prev.accidents?.total || 0) + 1 }
            }
        });
    });

    s.on('emergency-status-updated', (data) => {
        setAccidents(prev => {
            return prev.map(a => {
                if (a.id === data.emergencyId || a._id === data.emergencyId) {
                    return { ...a, status: data.status };
                }
                return a;
            });
        });
    });
    
    return () => {
        clearInterval(interval);
        s.off('live-gps');
        s.off('emergency-created');
        s.off('emergency-status-updated');
    };
  }, []);

  // TEMPORARY DEMO LOCATION OVERRIDE
  const getMapCenter = () => {
    return [31.2522427094373, 75.70313062579577];
  };

  if (!stats) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#050b14' }}>
      <div className="pulse-alert">SYNCING COMMAND HUB...</div>
    </div>
  );

  return (
    <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.3rem' }}>Strategic Operations Hub</h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-time Emergency Monitoring & Dispatch</div>
        </div>
        <div className="glass-badge" style={{ color: 'var(--success-color)' }}>● SYSTEM_SECURE_V3</div>
      </div>
      
      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--danger-color)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PENDING EMERGENCY</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900 }}>{stats.accidents?.total || 0}</div>
            </div>
            <AlertOctagon color="var(--danger-color)" size={24}/>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary-color)', background: 'rgba(59, 130, 246, 0.05)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ACTIVE UNITS</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900 }}>{stats.emergency.total_units}</div>
            </div>
            <Activity color="var(--primary-color)" size={24}/>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--warning-color)', background: 'rgba(245, 158, 11, 0.05)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>CONGESTION LEVEL</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900 }}>{stats.traffic.congested_roads}%</div>
            </div>
            <Car color="var(--warning-color)" size={24}/>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>TOTAL HOSPITALS</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#10b981' }}>{stats.hospitals?.total_hospitals || 0}</div>
            </div>
            <Building2 color="#10b981" size={24}/>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #8b5cf6', background: 'rgba(139, 92, 246, 0.05)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>HOSPITAL STAFF</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#8b5cf6' }}>{stats.hospitals?.total_hospital_staff || 0}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>{stats.hospitals?.on_duty_staff || 0} Currently On-Duty</div>
            </div>
            <Users color="#8b5cf6" size={24}/>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #f43f5e', background: 'rgba(244, 63, 94, 0.05)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>AMBULANCE FLEET</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#f43f5e' }}>{stats.hospitals?.total_ambulances || 0}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>{stats.hospitals?.available_ambulances || 0} Available</div>
            </div>
            <Car color="#f43f5e" size={24}/>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* LIVE CITY TRACKING MAP */}
        <div className="glass-panel" style={{ padding: '2rem', height: '500px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem', letterSpacing: '1px' }}>
                <Radio size={24} color="#3b82f6"/> LIVE CITY FLEET TRACKING
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', padding: '0.4rem 1rem', borderRadius: '20px', color: '#60a5fa', fontSize: '0.8rem', fontWeight: 800 }}>
                  <span className="pulse-alert" style={{ width: 8, height: 8, background: '#60a5fa', borderRadius: '50%' }}></span> SOCKET LIVE
              </div>
          </div>
          
          <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
              <PremiumMap center={getMapCenter()} zoom={12}>
                  {/* PLOT LIVE INCIDENTS */}
                  {accidents.filter(a => a.status !== 'resolved' && a.location?.coordinates).map((acc) => (
                      <Marker key={`acc-${acc.id || acc._id}`} position={[acc.location.coordinates[1], acc.location.coordinates[0]]} icon={createLocationPin()}>
                          <Popup className="uber-popup">
                              <div style={{ padding: '0.5rem' }}>
                                  <div style={{ fontWeight: 800, color: '#ef4444' }}>{acc.title}</div>
                                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Severity: {acc.severity}</div>
                              </div>
                          </Popup>
                      </Marker>
                  ))}
                  
                  {/* PLOT LIVE AMBULANCES */}
                  {Object.values(activeAmbulances).map((amb) => (
                      <div key={amb.driverId}>
                          <AmbulanceMarker position={[amb.lat, amb.lng]} bearing={amb.heading || 0} />
                          <Marker position={[amb.lat, amb.lng]} opacity={0}>
                              <Popup className="uber-popup">
                                  <div style={{ padding: '0.5rem' }}>
                                      <div style={{ fontWeight: 800 }}>Driver: {amb.driverId}</div>
                                      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Live Tracking</div>
                                      <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.3rem', fontWeight: 700 }}>Dispatch: {amb.emergencyId}</div>
                                  </div>
                              </Popup>
                          </Marker>
                      </div>
                  ))}
              </PremiumMap>
          </div>
        </div>

        {/* CENTERED INCIDENT FEED */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', letterSpacing: '1px' }}>
            <AlertTriangle size={24} color="var(--warning-color)"/> LIVE INCIDENT STREAM
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {accidents.map((acc) => (
              <div 
                key={acc.id || acc._id} 
                className="glass-panel card-hover" 
                onClick={() => navigate(`/admin/incidents/${acc.id || acc._id}`)}
                style={{ padding: '1.8rem', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', borderLeft: acc.severity === 'high' ? '4px solid var(--danger-color)' : '4px solid var(--warning-color)', position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                   <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{acc.title}</div>
                   <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(acc.created_at).toLocaleTimeString()}</div>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>{acc.description}</div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>{acc.severity.toUpperCase()}</span>
                    <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{acc.status.toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-color)', fontSize: '0.8rem', fontWeight: 800 }}>
                     ANALYZE <ChevronRight size={16}/>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {accidents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
               <Shield size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
               <div>Tactical stream empty. No active incidents reported.</div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .custom-icon { background: none; border: none; }
        .leaflet-popup-content-wrapper { background: #0f172a; color: #fff; border: 1px solid rgba(255,255,255,0.1); }
        .leaflet-popup-tip { background: #0f172a; }
        @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
