import React, { useEffect, useState } from 'react';
import { Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import { ShieldAlert, Car, MapPin, Truck, Activity, Radio, AlertTriangle } from 'lucide-react';
import { PremiumMap, AmbulanceMarker } from '../components/LiveTracking/LiveTrackingView';
import { createLocationPin } from '../components/LiveTracking/mapIcons';

// Fix Leaflet default icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const createCustomIcon = (color, emoji) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px ${color}; color: white; font-size: 16px; border: 2px solid white;">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const accidentIcon = createCustomIcon('#ef4444', '💥');
const ambulanceIcon = createCustomIcon('#10b981', '🚑');
const policeIcon = createCustomIcon('#3b82f6', '🚓');
const signalGreenIcon = createCustomIcon('#10b981', '🚦');
const signalRedIcon = createCustomIcon('#ef4444', '🚦');

const SmartMap = () => {
  const [accidents, setAccidents] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showSignals, setShowSignals] = useState(true);

  // Mock data for AI operations
  const [heatmapData, setHeatmapData] = useState([]);
  const [signals, setSignals] = useState([]);
  const [greenCorridors, setGreenCorridors] = useState([]);

  // Default center (LPU Block 38)
  // TEMPORARY DEMO LOCATION OVERRIDE
  const [center, setCenter] = useState([31.2522427094373, 75.70313062579577]);

  const fetchData = async () => {
    try {
      const [accidentsRes, unitsRes] = await Promise.all([
        api.get('/accidents'),
        api.get('/emergency/units')
      ]);
      
      const rawAcc = accidentsRes.data?.data;
      const accData = Array.isArray(rawAcc) ? rawAcc : (Array.isArray(rawAcc?.data) ? rawAcc.data : []);
      
      const rawUnit = unitsRes.data?.data;
      let unitData = Array.isArray(rawUnit) ? rawUnit : (Array.isArray(rawUnit?.data) ? rawUnit.data : []);

      // Mock live ambulance movement if they have coordinates
      unitData = unitData.map(u => {
        if (u.location?.coordinates && u.status !== 'available') {
           return { ...u, speed: Math.floor(Math.random() * 30) + 40, eta: Math.floor(Math.random() * 8) + 2 };
        }
        return { ...u, speed: 0, eta: '--' };
      });

      setAccidents(accData);
      setUnits(unitData);
      
      if (accData.length > 0 && accData[0].location?.coordinates) {
        // TEMPORARY DEMO LOCATION OVERRIDE: Ensure center is always LPU Block 38
        const forcedLat = 31.2522427094373;
        const forcedLng = 75.70313062579577;
        setCenter([forcedLat, forcedLng]);

        // Generate dynamic AI heatmap around the center
        generateOperationalData(forcedLat, forcedLng, accData, unitData);
      }
    } catch (error) {
      console.error("Error fetching map data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateOperationalData = (lat, lng, accs, un) => {
    // Heatmap Mock
    const hData = [];
    for(let i=0; i<15; i++){
      hData.push({
        lat: lat + (Math.random() - 0.5) * 0.1,
        lng: lng + (Math.random() - 0.5) * 0.1,
        intensity: Math.random(),
        radius: Math.random() * 400 + 100
      });
    }
    setHeatmapData(hData);

    // Signals Mock
    const sData = [];
    for(let i=0; i<8; i++){
      sData.push({
        id: i,
        lat: lat + (Math.random() - 0.5) * 0.08,
        lng: lng + (Math.random() - 0.5) * 0.08,
        state: Math.random() > 0.5 ? 'green' : 'red',
        ai_optimized: Math.random() > 0.3
      });
    }
    setSignals(sData);

    // Green Corridor Mock (connect ambulance to accident)
    const corridors = [];
    const busyUnits = un.filter(u => u.status !== 'available' && u.location?.coordinates);
    if(busyUnits.length > 0 && accs.length > 0) {
       busyUnits.forEach((u, i) => {
         const acc = accs[i % accs.length];
         if(acc && acc.location?.coordinates) {
           corridors.push([
             [u.location.coordinates[1], u.location.coordinates[0]],
             [acc.location.coordinates[1], acc.location.coordinates[0]]
           ]);
         }
       });
    }
    setGreenCorridors(corridors);
  };

  useEffect(() => {
    fetchData();
    // Poll every 3 seconds for live simulation feel
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '600px' }}>
        <h2 className="pulse-alert" style={{ padding: '1rem', borderRadius: '8px' }}>Initializing Operations Center...</h2>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Activity color="var(--primary-color)" /> Smart City Operations Map
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Advanced geospatial intelligence and predictive analytics</div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className={`btn ${showHeatmap ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowHeatmap(!showHeatmap)}>
            <Radio size={14} /> AI Density Heatmap
          </button>
          <button className={`btn ${showSignals ? 'btn-success' : 'btn-outline'}`} onClick={() => setShowSignals(!showSignals)}>
            <AlertTriangle size={14} /> Smart Signals
          </button>
          <span className="badge badge-danger"><ShieldAlert size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {accidents.length} Critical</span>
          <span className="badge badge-success"><Truck size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {units.length} Units</span>
        </div>
      </div>

      <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', position: 'relative' }}>
        <PremiumMap center={center} zoom={13}>
          
          {/* Dynamic AI Heatmap Layer */}
          {showHeatmap && heatmapData.map((h, i) => (
             <Circle 
               key={`heat-${i}`} 
               center={[h.lat, h.lng]} 
               radius={h.radius} 
               pathOptions={{ 
                 color: h.intensity > 0.7 ? '#ef4444' : (h.intensity > 0.4 ? '#f59e0b' : '#3b82f6'), 
                 fillColor: h.intensity > 0.7 ? '#ef4444' : (h.intensity > 0.4 ? '#f59e0b' : '#3b82f6'), 
                 fillOpacity: 0.3,
                 stroke: false
               }} 
             >
               <Popup className="uber-popup">
                  <div style={{padding:'0.5rem'}}>
                    <strong>AI Congestion Node</strong><br/>
                    Density Score: {(h.intensity * 100).toFixed(1)}%<br/>
                    Trend: Increasing
                  </div>
               </Popup>
             </Circle>
          ))}

          {/* Emergency Green Corridors */}
          {greenCorridors.map((c, i) => (
             <Polyline 
               key={`corr-${i}`} 
               positions={c} 
               pathOptions={{ color: '#10b981', weight: 6, opacity: 0.6, dashArray: '10, 10' }} 
             >
               <Popup className="uber-popup">
                  <div style={{padding:'0.5rem'}}>
                    <strong>Emergency Green Corridor</strong><br/>
                    Status: AI Optimized Priority<br/>
                    Clearance: Enforced
                  </div>
               </Popup>
             </Polyline>
          ))}

          {/* Smart Traffic Signals */}
          {showSignals && signals.map((s) => (
             <Marker key={`sig-${s.id}`} position={[s.lat, s.lng]} icon={s.state === 'green' ? signalGreenIcon : signalRedIcon}>
               <Popup className="uber-popup">
                 <div style={{padding:'0.5rem'}}>
                   <strong>Smart Intersection #{s.id}</strong><br/>
                   Current State: {s.state.toUpperCase()}<br/>
                   {s.ai_optimized && <span style={{ color: '#10b981' }}>✓ AI Adaptive Priority Active</span>}
                 </div>
               </Popup>
             </Marker>
          ))}
          
          {/* Render Accidents */}
          {accidents.map((acc) => {
            if (!acc.location?.coordinates) return null;
            const [lng, lat] = acc.location.coordinates;
            return (
              <Marker key={acc.id || acc._id} position={[lat, lng]} icon={createLocationPin()}>
                <Popup className="uber-popup">
                  <div style={{ minWidth: '200px', padding: '0.5rem' }}>
                    <h3 style={{ color: '#ef4444', marginBottom: '0.5rem', fontSize: '1.1rem', margin: 0 }}>{acc.title || 'Critical Incident'}</h3>
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>{acc.description}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                      <strong>Severity:</strong> 
                      <span className="badge badge-danger" style={{fontSize:'0.7rem', padding:'0.2rem 0.5rem'}}>{acc.severity}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Render Emergency Units */}
          {units.map((unit) => {
            if (!unit.location?.coordinates) return null;
            const [lng, lat] = unit.location.coordinates;
            const isPolice = unit.type === 'police';
            return (
              <div key={unit.id || unit._id}>
                <AmbulanceMarker position={[lat, lng]} bearing={unit.speed ? (Math.random() * 360) : 0} />
                <Marker position={[lat, lng]} opacity={0}>
                  <Popup className="uber-popup">
                    <div style={{ minWidth: '180px', padding: '0.5rem' }}>
                      <h3 style={{ color: isPolice ? '#3b82f6' : '#10b981', margin: '0 0 0.5rem 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.3rem' }}>
                        {unit.type.toUpperCase()} DISPATCH
                      </h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <strong>Status:</strong>
                        <span style={{ fontSize:'0.7rem', fontWeight:800, color: unit.status === 'available' ? '#10b981' : '#f59e0b' }}>
                          {unit.status.toUpperCase()}
                        </span>
                      </div>
                      {unit.status !== 'available' && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                            <strong>Live Speed:</strong>
                            <span>{unit.speed} km/h</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                            <strong>Est. Arrival:</strong>
                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{unit.eta} mins</span>
                          </div>
                        </>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </div>
            );
          })}
        </PremiumMap>
        
        {/* Operations Overlay Info */}
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000, background: 'rgba(17, 24, 39, 0.85)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', maxWidth: '300px', backdropFilter: 'blur(10px)' }}>
           <h4 style={{ margin: '0 0 0.5rem 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Activity size={16} /> Live Intel Active
           </h4>
           <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
             <li>AI Predictive Routing: <span style={{ color: '#10b981' }}>Enabled</span></li>
             <li>Green Corridor Sync: <span style={{ color: '#10b981' }}>Active</span></li>
             <li>Anomaly Detection: <span style={{ color: '#3b82f6' }}>Scanning...</span></li>
             <li>City Threat Level: <span style={{ color: '#f59e0b' }}>Elevated</span></li>
           </ul>
        </div>
      </div>
    </div>
  );
};

export default SmartMap;
