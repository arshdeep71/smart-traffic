import React, { useState, useEffect, useRef, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { connectSocket, socket } from '../../services/socket';
import { 
  CheckCircle, Navigation, Radio, AlertTriangle, MapPin, 
  ShieldAlert, Phone, Route, Signal, Battery, Target, Building2, Clock
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import * as geolib from 'geolib';

import { PremiumMap, AmbulanceMarker, RoutingMachine, MapFitter } from '../../components/LiveTracking/LiveTrackingView';
import { createLocationPin, createCitizenIcon } from '../../components/LiveTracking/mapIcons';
import { resolveStartingLocation, LPU_FALLBACK } from '../../services/location';

export const AmbulanceDashboard = () => {
  const { user } = useContext(AuthContext);
  const [me, setMe] = useState(null);
  const [emergency, setEmergency] = useState(null);
  const emergencyRef = useRef(null); // Ref to access latest emergency inside watchPosition
  
  // Real-time GPS & Telemetry
  const savedLat = localStorage.getItem('driver_lat');
  const savedLng = localStorage.getItem('driver_lng');
  const savedAcc = localStorage.getItem('driver_accuracy');
  const initialLocation = savedLat && savedLng 
    ? [parseFloat(savedLat), parseFloat(savedLng)] 
    : [LPU_FALLBACK.lat, LPU_FALLBACK.lng];

  const [location, setLocation] = useState(initialLocation);
  const [locationPermissionState, setLocationPermissionState] = useState('granted'); // Initialized as granted to prevent blocking during fallback resolution
  const [usingDemoFallback, setUsingDemoFallback] = useState(!savedLat || !savedLng);
  
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState(savedLat && savedLng ? parseFloat(savedAcc || '10') : LPU_FALLBACK.accuracy);
  const [networkStatus, setNetworkStatus] = useState('online');
  
  // Real-time Broadcast State
  const [broadcastAlert, setBroadcastAlert] = useState(null); // Fullscreen Popup
  
  // Operational State
  const [stage, setStage] = useState('available'); 
  const [routeInfo, setRouteInfo] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('dispatch');
  const [pastTrips, setPastTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    fetchDriverProfile();
    fetchPastTrips();
  }, []);

  const fetchPastTrips = async () => {
    try {
      const res = await api.get('/accidents');
      const data = res.data?.data || [];
      const history = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
      setPastTrips(history.slice(0, 10)); // Last 10 trips
    } catch(e) {}
  };

  const handleLocationFailure = async (force = false) => {
    // Priority B: Last successful cached coordinates (only if not forced)
    if (!force) {
      const cLat = localStorage.getItem('driver_lat');
      const cLng = localStorage.getItem('driver_lng');
      const cAcc = localStorage.getItem('driver_accuracy');
      if (cLat && cLng) {
        console.log(`[GPS Source: Cached LocalStorage] lat=${cLat}, lng=${cLng}`);
        setLocation([parseFloat(cLat), parseFloat(cLng)]);
        setGpsAccuracy(parseFloat(cAcc || '15'));
        setUsingDemoFallback(false);
        setLocationPermissionState('granted');
        return;
      }
    }

    // Priority C & D: IP Location & LPU Block 38 Fallback
    console.log("[GPS Driver] No active cached coordinates or forced. Resolving starting location via IP/LPU fallback...");
    const res = await resolveStartingLocation('driver');
    console.log(`[GPS Source: ${res.isFallback ? 'LPU Fallback' : 'IP Lookup'}] lat=${res.lat}, lng=${res.lng}`);
    setLocation([res.lat, res.lng]);
    setGpsAccuracy(res.accuracy);
    setUsingDemoFallback(res.isFallback);
    setLocationPermissionState('granted');
  };

  const triggerHardRefresh = () => {
    console.log("[GPS Driver Cache Purge] Force refresh triggered. Purging driver cached locations...");
    localStorage.removeItem('driver_lat');
    localStorage.removeItem('driver_lng');
    localStorage.removeItem('driver_accuracy');

    if (navigator.geolocation) {
      console.log("[GPS Driver] Requesting fresh live browser GPS...");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          console.log(`[GPS Source: Live Browser GPS] Hard refresh success obtained: lat=${lat}, lng=${lng}`);
          
          setLocation([lat, lng]);
          setGpsAccuracy(Math.floor(pos.coords.accuracy));
          setUsingDemoFallback(false);

          localStorage.setItem('driver_lat', lat.toString());
          localStorage.setItem('driver_lng', lng.toString());
          localStorage.setItem('driver_accuracy', pos.coords.accuracy.toString());
        },
        async (err) => {
          console.warn("[GPS Driver] Live browser GPS hard refresh failed:", err.message);
          await handleLocationFailure(true);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  const startRealGps = () => {
    if (!navigator.geolocation) {
      console.warn("[GPS Driver] Geolocation is not supported by your browser.");
      handleLocationFailure(false);
      return;
    }

    console.log("[GPS Driver] Requesting initial live browser GPS...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        console.log(`[GPS Source: Live Browser GPS] Success obtained: lat=${lat}, lng=${lng}`);
        
        setLocation([lat, lng]);
        setGpsAccuracy(Math.floor(pos.coords.accuracy));
        setUsingDemoFallback(false);

        localStorage.setItem('driver_lat', lat.toString());
        localStorage.setItem('driver_lng', lng.toString());
        localStorage.setItem('driver_accuracy', pos.coords.accuracy.toString());
      },
      async (err) => {
        console.warn("[GPS Driver] Initial live browser GPS request failed:", err.message);
        await handleLocationFailure(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    console.log("[GPS Driver] Starting real-time ambulance driver GPS watch...");
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0; // m/s to km/h
        const hd = pos.coords.heading || 0;
        
        console.log(`[GPS Update: Live Watch Driver] Active GPS watch update: lat=${lat}, lng=${lng}, accuracy=${pos.coords.accuracy}m, speed=${spd} km/h`);
        setLocation([lat, lng]);
        setSpeed(spd > 0 ? spd : 0);
        setHeading(hd);
        setGpsAccuracy(Math.floor(pos.coords.accuracy));
        setLocationPermissionState('granted');
        setUsingDemoFallback(false);

        console.log(`[GPS Cache Overwrite: Live Watch Driver] Overwriting old cache: lat=${localStorage.getItem('driver_lat')}, lng=${localStorage.getItem('driver_lng')} with new watch: lat=${lat}, lng=${lng}`);
        localStorage.setItem('driver_lat', lat.toString());
        localStorage.setItem('driver_lng', lng.toString());
        localStorage.setItem('driver_accuracy', pos.coords.accuracy.toString());

        // Emit Live GPS via Socket!
        const currentEmerg = emergencyRef.current;
        if (socket?.connected && currentEmerg) {
          console.log(`[GPS Driver] Syncing driver live telemetry to socket for emergency ${currentEmerg.emergencyId || currentEmerg._id}`);
          socket.emit('gps-update', {
            driverId: me?.employee?.employee_id || user?._id || user?.uid,
            emergencyId: currentEmerg.emergencyId || currentEmerg._id,
            hospitalId: me?.hospital?._id || me?.hospital?.id,
            lat: lat,
            lng: lng,
            speed: spd > 0 ? spd : 0,
            heading: hd
          });
        }
      },
      async (err) => {
        console.error("[GPS Driver] Driver watchPosition error:", err.code, err.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  };

  useEffect(() => {
    const stopGps = startRealGps();
    return () => {
      if (stopGps) stopGps();
    };
  }, [me]);

  useEffect(() => {
    if (!me) return;

    // Connect to WebSockets
    const s = connectSocket({ 
        role: 'hospital_driver', 
        driverId: me.employee?.employee_id || user._id, 
        hospitalId: me.hospital?._id || me.hospital?.id 
    });

    s.on('emergency-broadcast', (data) => {
        // Show fullscreen popup if not already busy
        if (!emergency) {
            setBroadcastAlert(data);
            speakAlert("CRITICAL EMERGENCY DISPATCH. ACCEPT NOW.");
        }
    });

    s.on('emergency-taken', (data) => {
        // If the broadcast was taken by someone else, close the popup
        if (broadcastAlert && broadcastAlert.emergencyId === data.emergencyId) {
            setBroadcastAlert(null);
            speakAlert("Emergency already assigned to another unit.");
        }
    });

    s.on('citizen-gps', (data) => {
        setEmergency(prev => {
            if (prev && (prev._id === data.incidentId || prev.emergencyId === data.incidentId)) {
                return { ...prev, coords: [data.lng, data.lat] };
            }
            return prev;
        });
        setBroadcastAlert(prev => {
            if (prev && prev.emergencyId === data.incidentId) {
                return { ...prev, lng: data.lng, lat: data.lat };
            }
            return prev;
        });
    });

    return () => {
        s.off('emergency-broadcast');
        s.off('emergency-taken');
        s.off('citizen-gps');
    };
  }, [me, broadcastAlert, emergency]);
  
  // Sync emergency to ref for callbacks
  useEffect(() => {
      emergencyRef.current = emergency;
  }, [emergency]);

  const getFallbackCoords = () => {
      const activeEmerg = emergency || broadcastAlert;
      if (activeEmerg) {
          const lat = activeEmerg.lat || (activeEmerg.coords ? activeEmerg.coords[1] : null);
          const lng = activeEmerg.lng || (activeEmerg.coords ? activeEmerg.coords[0] : null);
          if (lat && lng) return [lat, lng];
      }
      return [30.9010, 75.8573];
  };

   const handleAcceptEmergency = () => {
       if (!broadcastAlert) return;
       
       const proceedWithAccept = (lat, lng) => {
           socket.emit('accept-emergency', {
               emergencyId: broadcastAlert.emergencyId,
               driverId: me?.employee?.employee_id || user._id,
               driverName: user.name,
               ambulanceNumber: me?.ambulance?.ambulance_id || me?.ambulance?.plate_number || "AMB-001",
               hospitalName: me?.hospital?.name || "City General",
               hospitalId: me?.hospital?._id || me?.hospital?.id,
               hospitalLat: me?.hospital?.lat || (broadcastAlert.lat ? broadcastAlert.lat + 0.015 : 30.91),
               hospitalLng: me?.hospital?.lng || (broadcastAlert.lng ? broadcastAlert.lng + 0.015 : 75.86),
               lat: lat,
               lng: lng,
               eta: routeInfo ? routeInfo.time : null
           }, (res) => {
               if (res.success) {
                   // Lock new location state immediately
                   setLocation([lat, lng]);
                   
                   setEmergency({ 
                       ...broadcastAlert, 
                       _id: broadcastAlert.emergencyId, 
                       coords: [broadcastAlert.lng, broadcastAlert.lat] 
                   });
                   setStage('en_route');
                   setBroadcastAlert(null);
                   speakAlert("Emergency locked. Proceed to route.");
                   updateStageBackend('en_route', broadcastAlert.emergencyId);
                } else {
                    setBroadcastAlert(null);
                    console.warn("Failed to accept emergency:", res.reason);
                }
           });
       };

       // Force absolute fresh high-accuracy GPS capture right now to avoid any leaks
       if (navigator.geolocation) {
           navigator.geolocation.getCurrentPosition(
               (pos) => {
                   proceedWithAccept(pos.coords.latitude, pos.coords.longitude);
               },
               (err) => {
                   console.warn("Realtime accept GPS capture failed, falling back to exact citizen location:", err.message);
                   const fallback = getFallbackCoords();
                   proceedWithAccept(fallback[0], fallback[1]);
               },
               { enableHighAccuracy: true, timeout: 5000 }
           );
       } else {
           const fallback = getFallbackCoords();
           proceedWithAccept(fallback[0], fallback[1]);
       }
   };

  const handleDeclineEmergency = () => {
      setBroadcastAlert(null);
  };

  const fetchDriverProfile = async () => {
    try {
      const res = await api.get('/hospital/me');
      setMe(res.data.data);
    } catch (e) { console.error('Failed to load profile'); }
  };

  const updateStageBackend = async (newStage, eId) => {
    try {
      const activeId = eId || emergency?.emergencyId || emergency?._id;
      if (!activeId) return;

      const payload = { status: newStage };
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

      if (newStage === 'en_route') {
        payload.assigned_driver_id = me?.employee?.employee_id || user?._id || "DRV-102";
        payload.assigned_driver_name = user?.name || "Varinderpal";
        payload.ambulance_number = me?.ambulance?.ambulance_id || me?.ambulance?.plate_number || "AMB-001";
        payload.hospital_name = me?.hospital?.name || "Narad Hospital";
      } else if (newStage === 'arrived_scene') {
        payload.reached_scene_time = timeStr;
      } else if (newStage === 'patient_picked') {
        payload.pickup_time = timeStr;
        if (emergency?.lat && emergency?.lng) {
          payload.pickup_coords = [emergency.lat, emergency.lng];
          payload.pickup_address = `Incident Location Point (${emergency.lat.toFixed(5)}, ${emergency.lng.toFixed(5)})`;
        } else {
          payload.pickup_address = "Incident Scene Point";
        }
      } else if (newStage === 'reached_hospital') {
        payload.reached_hospital_time = timeStr;
      } else if (newStage === 'completed') {
        payload.handover_time = timeStr;
        const hospName = me?.hospital?.name || "Narad Hospital";
        payload.hospital_name = hospName;
        payload.handover_address = `${hospName} Emergency Ward`;
        const hLat = me?.hospital?.lat || (emergency?.lat ? emergency.lat + 0.015 : 30.91);
        const hLng = me?.hospital?.lng || (emergency?.lng ? emergency.lng + 0.015 : 75.86);
        payload.handover_coords = [hLat, hLng];
      }

      await api.put(`/accidents/${activeId}`, payload);
      addLog(`Database updated: ${newStage.toUpperCase()} successfully.`);
    } catch (err) {
      console.error("Failed to update database for stage:", newStage, err.message);
    }
  };

  const updateStage = async (newStage) => {
    if (!emergency) return;
    setStage(newStage);
    addLog(`Stage updated: ${newStage.toUpperCase().replace(/_/g, ' ')}`);

    // Synchronize to the backend database instantly
    await updateStageBackend(newStage, emergency.emergencyId || emergency._id);

    // Broadcast status globally via socket
    if (socket && socket.connected) {
       socket.emit('update-emergency-status', {
           emergencyId: emergency.emergencyId || emergency._id,
           status: newStage,
           timestamp: new Date().toISOString()
       });
    }

    if (newStage === 'completed') {
      setEmergency(null);
      setRouteInfo(null);
      setStage('available');
      // Instantly refresh past trips to list this resolved trip!
      setTimeout(() => fetchPastTrips(), 1000);
    }
  };

  const speakAlert = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  };

  const addLog = (msg) => {
    setLogs(prev => [[new Date().toLocaleTimeString().substring(0,5), msg], ...prev].slice(0, 5));
  };

  if (locationPermissionState === 'denied' || !location) {
    return (
      <div style={{ height: '70vh', background: '#020617', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>
        <div className="glass-panel pop-in" style={{ width: '420px', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', background: 'rgba(15, 23, 42, 0.9)' }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2rem', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)' }}>
            🚨
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>Driver Location Required</h3>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#ef4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>GPS Monitoring Offline</p>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.6 }}>
            Driver location access is required for emergency dispatch services. Your live location is mandatory to calculate dynamic ETAs, route you to incidents, and update citizens on your arrival.
          </p>
          <button 
            type="button"
            onClick={() => {
              setLocationPermissionState('prompt');
            }}
            className="btn" 
            style={{ width: '100%', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none', padding: '0.8rem', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', borderRadius: 8, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}
          >
            🔄 Enable GPS Permission & Retry
          </button>
        </div>
      </div>
    );
  }

  const glassPanel = { background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' };

  return (
    <div style={
      emergency 
      ? { position: 'fixed', inset: 0, zIndex: 9999, background: '#020617', color: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
      : { height: '70vh', display: 'flex', flexDirection: 'column', padding: '1rem', background: '#020617', color: '#f8fafc', overflow: 'hidden', position: 'relative', borderRadius: '16px' }
    }>
      

      
      {/* 🔴 BROADCAST POPUP (UBER STYLE - MAP VISIBLE) */}
      {broadcastAlert && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '2rem' }}>
              <div className="pulse-red" style={{ width: '420px', background: 'linear-gradient(180deg, rgba(185, 28, 28, 0.95) 0%, rgba(127, 29, 29, 0.95) 100%)', borderRadius: '16px', padding: '2rem', boxShadow: '0 0 50px rgba(239, 68, 68, 0.8)', textAlign: 'center', border: '2px solid #ef4444' }}>
                  <div className="pulse-red" style={{ width: '80px', height: '80px', background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                      <AlertTriangle size={40} color="#fff" />
                  </div>
                  <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', color: '#fff' }}>EMERGENCY ALERT</h2>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'left' }}>
                      <div style={{ color: '#fca5a5', fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.2rem' }}>INCIDENT CATEGORY</div>
                      <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>{broadcastAlert.category || 'Road Accident'}</div>
                      
                      <div style={{ color: '#fca5a5', fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.2rem' }}>SEVERITY</div>
                      <div style={{ color: '#ef4444', background: '#fee2e2', display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 800 }}>{broadcastAlert.severity || 'CRITICAL'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                      <button onClick={handleDeclineEmergency} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '2px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>DECLINE</button>
                      <button onClick={handleAcceptEmergency} style={{ flex: 2, padding: '1rem', background: '#10b981', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)' }}>ACCEPT NOW</button>
                  </div>
              </div>
          </div>
      )}

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        {location ? (
           <PremiumMap center={location} zoom={15}>
             <AmbulanceMarker position={location} bearing={heading} />
             {emergency && emergency.coords && (
                 <>
                     <Marker position={[emergency.coords[1], emergency.coords[0]]} icon={createCitizenIcon()} />
                     <RoutingMachine start={location} end={[emergency.coords[1], emergency.coords[0]]} onRouteCalculated={setRouteInfo} />
                 </>
             )}
             {broadcastAlert && broadcastAlert.lat && broadcastAlert.lng && (
                 <>
                     <Marker position={[broadcastAlert.lat, broadcastAlert.lng]} icon={createLocationPin()} />
                     <RoutingMachine start={location} end={[broadcastAlert.lat, broadcastAlert.lng]} onRouteCalculated={setRouteInfo} />
                 </>
             )}
             <MapFitter ambulancePos={location} incidentPos={emergency ? [emergency.coords[1], emergency.coords[0]] : broadcastAlert ? [broadcastAlert.lat, broadcastAlert.lng] : null} hasRoute={!!routeInfo} />
           </PremiumMap>
        ) : (
           <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b' }}>
              <Target size={48} className="spin" /> Acquiring GPS...
           </div>
        )}
      </div>

      {/* TOP TOGGLES FLOATING */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, display: 'flex', gap: '0.5rem', background: 'rgba(9, 13, 22, 0.95)', border: '1px solid rgba(234, 88, 12, 0.25)', padding: '0.4rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}>
         <button onClick={() => setActiveTab('dispatch')} style={{ background: activeTab === 'dispatch' ? '#ea580c' : 'transparent', color: activeTab === 'dispatch' ? '#fff' : '#94a3b8', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, transition: 'all 0.2s' }}>Navigation</button>
         <button onClick={() => setActiveTab('history')} style={{ background: activeTab === 'history' ? '#ea580c' : 'transparent', color: activeTab === 'history' ? '#fff' : '#94a3b8', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, transition: 'all 0.2s' }}>History</button>
      </div>

      {/* 🔄 HARD REFRESH GPS ACTION */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, display: 'flex', background: 'rgba(9, 13, 22, 0.95)', border: '1px solid rgba(234, 88, 12, 0.25)', padding: '0.4rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}>
         <button onClick={triggerHardRefresh} style={{ background: 'transparent', border: 'none', color: '#ea580c', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}>
           🔄 Force Refresh GPS
         </button>
      </div>

      {activeTab === 'history' && (
        <div style={{ position: 'absolute', top: 80, left: 20, bottom: 20, width: '400px', zIndex: 1000, background: 'rgba(9, 13, 22, 0.95)', border: '1px solid rgba(234, 88, 12, 0.25)', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflowY: 'auto', backdropFilter: 'blur(12px)' }}>
           {selectedTrip ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'left' }}>
                 <button onClick={() => setSelectedTrip(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 700, color: '#94a3b8', marginBottom: '1.2rem', alignSelf: 'flex-start', fontSize: '0.85rem', transition: 'all 0.2s' }}>
                    ← Back to List
                 </button>

                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: 900 }}>Trip Record</h3>
                    <span style={{ padding: '0.3rem 0.8rem', borderRadius: '50px', fontSize: '0.65rem', fontWeight: 800, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', textTransform: 'uppercase' }}>
                       {selectedTrip.status?.toUpperCase() || 'COMPLETED'}
                    </span>
                 </div>

                 <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', marginBottom: '1.2rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Incident Call</div>
                    <div style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 800, marginTop: '0.2rem' }}>{selectedTrip.title || selectedTrip.category || "Panic SOS"}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem', lineHeight: '1.4' }}>{selectedTrip.description || "Emergency dispatcher assistance call."}</div>
                 </div>

                 {/* 🕒 TIME TIMELINE */}
                 <h4 style={{ margin: '0 0 0.8rem 0', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rescue Timeline</h4>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '2px dashed #e2e8f0', paddingLeft: '1.2rem', marginLeft: '0.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative' }}>
                       <div style={{ position: 'absolute', left: '-1.55rem', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#ea580c' }} />
                       <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Emergency Reported</div>
                       <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>{selectedTrip.created_at ? new Date(selectedTrip.created_at).toLocaleString() : new Date().toLocaleString()}</div>
                    </div>
                    <div style={{ position: 'relative' }}>
                       <div style={{ position: 'absolute', left: '-1.55rem', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                       <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Ambulance Reached Scene</div>
                       <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>{selectedTrip.reached_scene_time || "—"}</div>
                    </div>
                    <div style={{ position: 'relative' }}>
                       <div style={{ position: 'absolute', left: '-1.55rem', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#ea580c' }} />
                       <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Patient Secured / Loaded</div>
                       <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>{selectedTrip.pickup_time || "—"}</div>
                    </div>
                    <div style={{ position: 'relative' }}>
                       <div style={{ position: 'absolute', left: '-1.55rem', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                       <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Hospital Bay Handover</div>
                       <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>{selectedTrip.handover_time || "—"}</div>
                    </div>
                 </div>

                 {/* 📍 GEOGRAPHIC INFO */}
                 <h4 style={{ margin: '0 0 0.8rem 0', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Route Log</h4>
                 <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.8rem' }}>
                    <div>
                       <div style={{ fontWeight: 800, color: '#ea580c', fontSize: '0.7rem', textTransform: 'uppercase' }}>PICKED UP FROM</div>
                       <div style={{ fontWeight: 800, color: '#fff', marginTop: '0.1rem' }}>
                          {selectedTrip.pickup_address || "Incident Scene"}
                       </div>
                       {selectedTrip.pickup_coords && (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                             GPS: {selectedTrip.pickup_coords[0]?.toFixed(5)}, {selectedTrip.pickup_coords[1]?.toFixed(5)}
                          </div>
                       )}
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '0.1rem 0' }} />
                    <div>
                       <div style={{ fontWeight: 800, color: '#ea580c', fontSize: '0.7rem', textTransform: 'uppercase' }}>DELIVERED TO</div>
                       <div style={{ fontWeight: 800, color: '#fff', marginTop: '0.1rem' }}>
                          {selectedTrip.handover_address || selectedTrip.hospital_name || "Narad Hospital Emergency Wing"}
                       </div>
                       {selectedTrip.handover_coords && (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                             GPS: {selectedTrip.handover_coords[0]?.toFixed(5)}, {selectedTrip.handover_coords[1]?.toFixed(5)}
                          </div>
                       )}
                    </div>
                 </div>
              </div>
           ) : (
              <>
                 <h2 style={{ color: '#fff', margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 900 }}>Driver Trip History</h2>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 {pastTrips.map((trip, i) => {
                    const isCompleted = trip.status?.toLowerCase() === 'completed' || trip.status?.toLowerCase() === 'resolved';
                    return (
                       <div key={trip._id || trip.id || i} onClick={() => setSelectedTrip(trip)} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: isCompleted ? '4px solid #10b981' : '4px solid #f59e0b', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(234, 88, 12, 0.08)'; e.currentTarget.style.borderColor='rgba(234, 88, 12, 0.25)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'}}>
                          <div>
                             <div style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.2rem' }}>{new Date(trip.created_at || Date.now()).toLocaleString()}</div>
                             <div style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>{trip.title || trip.category || 'Emergency'}</div>
                          </div>
                          <span style={{ padding: '0.3rem 0.8rem', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 800, background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: isCompleted ? '#10b981' : '#f59e0b', border: isCompleted ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)', textTransform: 'uppercase' }}>
                             {isCompleted ? 'COMPLETED' : trip.status}
                          </span>
                       </div>
                    );
                 })}
                 </div>
              </>
           )}
        </div>
      )}

      {activeTab === 'dispatch' && (
        <>
        {/* FLOATING DISPATCH / ACTION SHEET */}
        <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '90%', maxWidth: '500px' }}>
          {!emergency ? (
            <div style={{ background: 'rgba(9, 13, 22, 0.95)', border: '1px solid rgba(234, 88, 12, 0.25)', borderRadius: '20px', padding: '2rem', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}>
               <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(234, 88, 12, 0.08)', border: '1px solid rgba(234, 88, 12, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#ea580c' }} className="pulse-alert">
                 <Radio size={30} />
               </div>
               <h3 style={{ color: '#fff', margin: '0 0 0.5rem 0', fontSize: '1.35rem', fontWeight: 900 }}>Available for Dispatch</h3>
               <p style={{ color: '#94a3b8', margin: 0, fontWeight: 500, fontSize: '0.85rem' }}>Waiting for high-priority emergency alerts in your sector</p>
            </div>
          ) : (
            <div style={{ background: 'rgba(9, 13, 22, 0.95)', border: '1px solid rgba(234, 88, 12, 0.25)', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                     <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Active Emergency</div>
                     <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.45rem', color: '#fff', fontWeight: 900 }}>{emergency.category || 'Emergency Call'}</h3>
                  </div>
                  {routeInfo && (
                     <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ea580c' }}>{routeInfo.time}<span style={{fontSize: '1rem', color:'#94a3b8', fontWeight:700}}>min</span></div>
                        <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 700 }}>{routeInfo.distance} km</div>
                     </div>
                  )}
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                 {(stage === 'en_route' || stage === 'near_incident') && (
                   <button onClick={() => updateStage('arrived_scene')} style={{ width: '100%', background: 'linear-gradient(135deg, #090d16, #030712)', color: '#fff', border: '1px solid rgba(234, 88, 12, 0.3)', borderRadius: '14px', padding: '1.2rem', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }} onMouseEnter={e=>e.currentTarget.style.border='1px solid #ea580c'} onMouseLeave={e=>e.currentTarget.style.border='1px solid rgba(234, 88, 12, 0.3)'}>
                     ARRIVED AT SCENE
                   </button>
                 )}
                 {stage === 'arrived_scene' && (
                   <button onClick={() => updateStage('patient_picked')} style={{ width: '100%', background: 'linear-gradient(135deg, #ea580c, #c2410c)', color: '#fff', border: 'none', borderRadius: '14px', padding: '1.2rem', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(234, 88, 12, 0.4)' }}>
                     PATIENT SECURED
                   </button>
                 )}
                 {stage === 'patient_picked' && (
                   <button onClick={() => updateStage('transporting_to_hospital')} style={{ width: '100%', background: 'linear-gradient(135deg, #ea580c, #c2410c)', color: '#fff', border: 'none', borderRadius: '14px', padding: '1.2rem', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(234, 88, 12, 0.4)' }}>
                     NAVIGATE TO HOSPITAL
                   </button>
                 )}
                 {stage === 'transporting_to_hospital' && (
                   <button onClick={() => updateStage('reached_hospital')} style={{ width: '100%', background: 'linear-gradient(135deg, #090d16, #030712)', color: '#fff', border: '1px solid rgba(234, 88, 12, 0.3)', borderRadius: '14px', padding: '1.2rem', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }} onMouseEnter={e=>e.currentTarget.style.border='1px solid #ea580c'} onMouseLeave={e=>e.currentTarget.style.border='1px solid rgba(234, 88, 12, 0.3)'}>
                     REACHED HOSPITAL
                   </button>
                 )}
                 {stage === 'reached_hospital' && (
                   <button onClick={() => updateStage('completed')} style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '14px', padding: '1.2rem', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
                     COMPLETE TRIP
                   </button>
                 )}
               </div>
            </div>
          )}
        </div>
        </>
      )}
      <style>{`
        .custom-icon { background: none; border: none; }
        .leaflet-routing-container { display: none !important; }
        @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
        .pulse-red { animation: pulse-red 1s infinite; }
        .spin { animation: spin 2s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AmbulanceDashboard;
