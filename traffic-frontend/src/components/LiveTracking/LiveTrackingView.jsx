// LiveTrackingView.jsx
// Drop-in replacement for your tracking UI.
// Props: { incident, ambulance, socket }

import { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import "leaflet/dist/leaflet.css";
import "./LiveTrackingView.css";

import ETACard from "./ETACard";
import DriverSheet from "./DriverSheet";
import StatusBanner from "./StatusBanner";
import { createAmbulanceIcon, createLocationPin, createCitizenIcon, createHospitalIcon } from "./mapIcons";
import { Loader2, CheckCircle2, Navigation } from "lucide-react";
import "leaflet-routing-machine";

// Helper components for the premium journey
export function TransportCard({ ambulance, eta, distance, status }) {
  const driverName   = ambulance?.driverName    || ambulance?.driver?.name    || "Assigned Driver";
  const hospitalName = ambulance?.hospitalName  || ambulance?.hospital?.name  || "City Hospital";
  const plateNumber  = ambulance?.ambulanceNumber || ambulance?.vehicleNumber || "AMB-001";

  const getProgressDetails = () => {
    switch (status) {
      case 'patient_picked':
        return {
          title: "Patient Secured Safely",
          desc: "Medical team is preparing patient for immediate transport.",
          badge: "Patient Onboard"
        };
      case 'reached_hospital':
        return {
          title: "Reached Hospital Bay",
          desc: "Handing over to the trauma/ward staff.",
          badge: "Arrived at destination"
        };
      case 'transporting_to_hospital':
      default:
        return {
          title: "Heading to Hospital",
          desc: "Navigating priority route with active siren.",
          badge: "Transport Active"
        };
    }
  };

  const details = getProgressDetails();

  return (
    <motion.div
      className="ltv-sheet-wrap"
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ pointerEvents: 'all' }}
    >
      <div className="ltv-sheet" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderTop: '3px solid #10b981', color: '#fff', padding: '24px' }}>
        <div className="ltv-sheet-handle" style={{ background: '#334155' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Destination Bay
            </div>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
              {hospitalName}
            </h3>
          </div>
          {eta !== null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#34d399' }}>
                {eta}<span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}> min</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>
                {distance || "1.1"} km left
              </div>
            </div>
          )}
        </div>

        <div className="ltv-divider" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px', width: '100%', textAlign: 'left' }}>
          <div style={{ 
            width: '44px', 
            height: '44px', 
            borderRadius: '12px', 
            background: 'rgba(16,185,129,0.1)', 
            border: '1px solid rgba(16,185,129,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            🏥
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                {details.title}
              </h4>
              <span style={{ 
                fontSize: '9px', 
                fontWeight: 800, 
                color: '#34d399', 
                background: 'rgba(52,211,153,0.1)', 
                padding: '2px 8px', 
                borderRadius: '50px',
                textTransform: 'uppercase',
                border: '1px solid rgba(52,211,153,0.2)'
              }}>
                {details.badge}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8', fontWeight: 500, lineHeight: '1.4' }}>
              {details.desc}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '18px', paddingTop: '14px', borderTop: '1px dashed rgba(255,255,255,0.08)', fontSize: '11px', color: '#64748b' }}>
          <span>
            Unit: <strong style={{ color: '#cbd5e1' }}>{plateNumber}</strong>
          </span>
          <span>
            Responder: <strong style={{ color: '#cbd5e1' }}>{driverName}</strong>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function CompletionCard({ ambulance, incident, countdown, onClose }) {
  const driverName   = incident?.assigned_driver_name || ambulance?.driverName    || ambulance?.driver?.name    || "Assigned Driver";
  const hospitalName = incident?.hospital_name        || ambulance?.hospitalName  || ambulance?.hospital?.name  || "City Hospital";
  const plateNumber  = incident?.ambulance_number     || ambulance?.ambulanceNumber || ambulance?.vehicleNumber || "AMB-001";

  const pickupTime = incident?.pickup_time || new Date(Date.now() - 3 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const arrivalTime = incident?.handover_time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      className="ltv-sheet-wrap"
      initial={{ scale: 0.9, y: 50, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      style={{ pointerEvents: 'all' }}
    >
      <div className="ltv-sheet" style={{ 
        background: 'linear-gradient(180deg, #090d16 0%, #030712 100%)', 
        borderTop: '3px solid #10b981', 
        color: '#fff',
        padding: '30px 24px 24px 24px',
        textAlign: 'center',
        boxShadow: '0 -20px 50px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(16,185,129,0.12)',
          border: '2px solid #10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          fontSize: '24px',
          boxShadow: '0 0 25px rgba(16,185,129,0.3)',
        }}>
          ✓
        </div>

        <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 900, color: '#10b981', letterSpacing: '-0.02em' }}>
          Emergency Response Completed
        </h3>
        <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
          Patient successfully reached the emergency ward safely.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pickup Time
            </span>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
              {pickupTime}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Handover Time
            </span>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
              {arrivalTime}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.08)', textAlign: 'left', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Destination Hospital</span>
            <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{hospitalName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Ambulance Vehicle</span>
            <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{plateNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Medical Responder</span>
            <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{driverName}</span>
          </div>
          {incident?.reached_scene_time && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Ambulance Reached Scene</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{incident.reached_scene_time}</span>
            </div>
          )}
        </div>

        {/* Geographic locations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', marginBottom: '18px', fontSize: '12px' }}>
          <div>
            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Incident Pick Up Point</div>
            <div style={{ color: '#f8fafc', fontWeight: 700, marginTop: '2px' }}>
              {incident?.pickup_address || "Emergency Scene"}
            </div>
            {incident?.pickup_coords && (
              <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                GPS: {incident.pickup_coords[0]?.toFixed(5)}, {incident.pickup_coords[1]?.toFixed(5)}
              </div>
            )}
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
          <div>
            <div style={{ fontWeight: 800, color: '#10b981', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hospital Delivery Point</div>
            <div style={{ color: '#f8fafc', fontWeight: 700, marginTop: '2px' }}>
              {incident?.handover_address || `${hospitalName} Emergency Wing`}
            </div>
            {incident?.handover_coords && (
              <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                GPS: {incident.handover_coords[0]?.toFixed(5)}, {incident.handover_coords[1]?.toFixed(5)}
              </div>
            )}
          </div>
        </div>

        {countdown !== undefined && countdown > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b', fontSize: '11px', fontWeight: 700 }}>
            <Loader2 size={12} className="ltv-spin" /> REDIRECTING IN {countdown}...
          </div>
        ) : (
          <button onClick={onClose} style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}>
            Close Detail History
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Routing Machine Component ──────────────────────────────────────────────
export function RoutingMachine({ start, end, onRouteCalculated }) {
  const map = useMap();
  const prevStart = useRef(start);
  const prevEnd = useRef(end);

  const startStr = start ? `${start[0]},${start[1]}` : "";
  const endStr = end ? `${end[0]},${end[1]}` : "";

  useEffect(() => {
    if (!start || !end) return;
    const routingControl = L.Routing.control({
      waypoints: [ L.latLng(start[0], start[1]), L.latLng(end[0], end[1]) ],
      lineOptions: { styles: [{ color: '#111111', weight: 5, opacity: 0.9, lineCap: "round", lineJoin: "round" }] },
      createMarker: () => null, show: false, addWaypoints: false, routeWhileDragging: false, fitSelectedRoutes: false,
    }).addTo(map);

    routingControl.on('routesfound', (e) => {
      const routes = e.routes;
      if (routes && routes.length > 0 && onRouteCalculated) {
        onRouteCalculated({
          distance: (routes[0].summary.totalDistance / 1000).toFixed(1),
          time: Math.round(routes[0].summary.totalTime / 60)
        });
      }
    });
    return () => map.removeControl(routingControl);
  }, [map, startStr, endStr]); // Use stringified coordinates for stable dependency

  return null;
}

// ─── Map auto-fit component ──────────────────────────────────────────────────
export function MapFitter({ ambulancePos, incidentPos, hasRoute }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (!ambulancePos || !incidentPos) return;
    if (fitted.current) return;
    
    const bounds = L.latLngBounds([ambulancePos, incidentPos]);
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 17, animate: true, duration: 1.2 });
    fitted.current = true;
  }, [ambulancePos, incidentPos]);

  return null;
}

// ─── Ambulance marker controller ─────────────────────────────────────────────
export function AmbulanceMarker({ position, bearing }) {
  const markerRef = useRef(null);
  const [targetPos, setTargetPos] = useState(position);
  const icon = useRef(createAmbulanceIcon(bearing));

  useEffect(() => { setTargetPos(position); }, [position]);
  useSmoothMarker(markerRef, targetPos);

  useEffect(() => {
    if (markerRef.current) {
      icon.current = createAmbulanceIcon(bearing);
      markerRef.current.setIcon(icon.current);
    }
  }, [bearing]);

  if (!position) return null;
  return <Marker ref={markerRef} position={position} icon={icon.current} />;
}

// ─── Map auto-resize invalidator ──────────────────────────────────────────────
export function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// ─── Map Ref Setter ───────────────────────────────────────────────────────────
export function MapRefSetter({ setMap }) {
  const map = useMap();
  useEffect(() => {
    if (map) setMap(map);
  }, [map, setMap]);
  return null;
}

// ─── Reusable Premium Map Wrapper ────────────────────────────────────────────
export function PremiumMap({ center = [28.6139, 77.209], zoom = 14, children, className = "ltv-map", style }) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={false}
      className={className}
      style={style}
      attributionControl={false}
    >
      <MapInvalidator />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      {children}
    </MapContainer>
  );
}

// ─── Smooth marker movement hook ────────────────────────────────────────────
export function useSmoothMarker(markerRef, position) {
  const animationRef = useRef(null);
  const startTime = useRef(null);
  const startPos = useRef(null);
  const endPos = useRef(position);

  useEffect(() => {
    if (!position || !markerRef.current) return;
    if (endPos.current && (endPos.current[0] === position[0] && endPos.current[1] === position[1])) {
      return;
    }
    const currentMarker = markerRef.current;
    const currentLatLng = currentMarker.getLatLng();
    startPos.current = [currentLatLng.lat, currentLatLng.lng];
    endPos.current = position;
    startTime.current = performance.now();

    const animate = (time) => {
      const elapsed = time - startTime.current;
      const duration = 1200; 
      const progress = Math.min(elapsed / duration, 1);
      
      const ease = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const lat = startPos.current[0] + (endPos.current[0] - startPos.current[0]) * ease;
      const lng = startPos.current[1] + (endPos.current[1] - startPos.current[1]) * ease;

      currentMarker.setLatLng([lat, lng]);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [position, markerRef]);
}

// ─── Main component ───────────────────────────────────────────
export default function LiveTrackingView({ incident, ambulance, socket, citizenLivePos, onClose }) {
  const [ambulancePos, setAmbulancePos] = useState(
    ambulance?.currentLocation
      ? [ambulance.currentLocation.lat, ambulance.currentLocation.lng]
      : null
  );
  const [bearing, setBearing] = useState(0);
  const [route, setRoute] = useState([]);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [status, setStatus] = useState(incident?.status || "SOS Received");
  const [prevPos, setPrevPos] = useState(null);
  const [phase, setPhase] = useState(ambulance ? "tracking" : "searching");
  const prevAmbulance = useRef(ambulance);
  const [mapInstance, setMapInstance] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const hasCompletedLive = useRef(false);

  const isTransporting = ['patient_picked', 'transporting_to_hospital', 'reached_hospital'].includes(status);
  const isCompleted = status === 'completed';
  const isArrivalMode = distance !== null && parseFloat(distance) <= 0.1 && !isTransporting && !isCompleted;

  const incidentPos = (incident?.location?.coordinates) 
        ? [incident.location.coordinates[1], incident.location.coordinates[0]] 
        : (incident?.location ? [incident.location.lat, incident.location.lng] : (incident?.latitude && incident?.longitude ? [incident.latitude, incident.longitude] : null));

  const hospitalPos = (ambulance?.hospitalLat && ambulance?.hospitalLng) ? [ambulance.hospitalLat, ambulance.hospitalLng] : null;
  const destinationPos = isTransporting && hospitalPos ? hospitalPos : incidentPos;

  // ── compute bearing between two GPS points ──
  const calcBearing = useCallback((from, to) => {
    const toRad = (d) => (d * Math.PI) / 180;
    const dLng = toRad(to[1] - from[1]);
    const lat1 = toRad(from[0]);
    const lat2 = toRad(to[0]);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }, []);

  // Dynamic countdown and auto-close on completion
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isCompleted || !hasCompletedLive.current) return;
    
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onCloseRef.current) onCloseRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isCompleted]);

  // ── Pre-acceptance status flow ──
  useEffect(() => {
    if (!prevAmbulance.current && ambulance) {
      setPhase("accepted");
      setTimeout(() => setPhase("tracking"), 3500);
    } else if (!ambulance) {
      setPhase("searching");
    }
    prevAmbulance.current = ambulance;
  }, [ambulance]);

  // Sync initial ambulance position from props when assignment comes in
  useEffect(() => {
    if (ambulance) {
      const lat = ambulance.lat || ambulance.currentLocation?.lat;
      const lng = ambulance.lng || ambulance.currentLocation?.lng;
      if (lat && lng) {
        setAmbulancePos([lat, lng]);
      }
    }
  }, [ambulance]);

  // Synchronize status prop unconditionally to prevent React state sync lock
  useEffect(() => {
    if (incident?.status) {
      setStatus(incident.status);
    }
  }, [incident?.status]);

  useEffect(() => {
    if (phase === "searching") {
      const phases = [
        "Emergency request submitted",
        "Searching nearby ambulances...",
        "Notifying hospitals...",
        "Checking availability...",
        "Awaiting driver acceptance..."
      ];
      let i = 0;
      setStatus(phases[0]);
      const int = setInterval(() => {
        i = (i + 1) % phases.length;
        setStatus(phases[i]);
      }, 4000);
      return () => clearInterval(int);
    } else if (phase === "tracking" && !isCompleted && !isTransporting) {
      setStatus(incident?.status || "Assigned");
    }
  }, [phase, incident?.status, isCompleted, isTransporting]);

  // Invalidate size immediately upon layout changes (fullscreen or tab swaps)
  useEffect(() => {
    if (mapInstance) {
      const timer = setTimeout(() => {
        mapInstance.invalidateSize();
        // Recenter once on transition
        if (ambulancePos && destinationPos) {
          const bounds = L.latLngBounds([ambulancePos, destinationPos]);
          mapInstance.fitBounds(bounds, { padding: [80, 80], maxZoom: 17 });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [phase, mapInstance, destinationPos]);

  // Handle Arrival Mode map zoom to street-level
  useEffect(() => {
    if (isArrivalMode && mapInstance && incidentPos) {
      mapInstance.flyTo(incidentPos, 18, {
        animate: true,
        duration: 2.2,
        easeLinearity: 0.2
      });
    }
  }, [isArrivalMode, mapInstance, incidentPos]);

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onLocation = (data) => {
      const newPos = [data.lat, data.lng];
      setAmbulancePos((prev) => {
        if (prev) setBearing(calcBearing(prev, newPos));
        setPrevPos(prev);
        return newPos;
      });
    };

    const onStatus = (data) => {
      if (data.status) {
        setStatus(data.status);
        if (data.status === 'completed') {
          hasCompletedLive.current = true;
        }
      }
    };

    socket.on("ambulance-gps", onLocation);
    socket.on("ambulance-assigned", onStatus);
    socket.on("emergency-status-updated", onStatus);

    return () => {
      socket.off("ambulance-gps", onLocation);
      socket.off("ambulance-assigned", onStatus);
      socket.off("emergency-status-updated", onStatus);
    };
  }, [socket, calcBearing]);

  const savedLat = localStorage.getItem('citizen_lat') || localStorage.getItem('driver_lat') || '30.9010';
  const savedLng = localStorage.getItem('citizen_lng') || localStorage.getItem('driver_lng') || '75.8573';
  const center = ambulancePos || destinationPos || [parseFloat(savedLat), parseFloat(savedLng)];

  return (
    <div className="ltv-root">
      <PremiumMap center={center} zoom={14}>
        <MapRefSetter setMap={setMapInstance} />
        {/* Dynamic Route line via leaflet-routing-machine */}
        {ambulancePos && destinationPos && (
          <RoutingMachine 
             start={ambulancePos} 
             end={destinationPos} 
             onRouteCalculated={(info) => {
               setEta(info.time);
               setDistance(info.distance);
             }} 
          />
        )}

        {/* Proximity arrival glow ring */}
        {isArrivalMode && incidentPos && (
          <Circle
            center={incidentPos}
            radius={100}
            pathOptions={{
              fillColor: '#3b82f6',
              fillOpacity: 0.15,
              color: '#3b82f6',
              weight: 2,
              dashArray: '5, 10',
              className: 'ltv-proximity-circle'
            }}
          />
        )}

        {/* Incident pin / Citizen Live Location or Hospital pin */}
        {destinationPos && (
          <Marker position={destinationPos} icon={isTransporting ? createHospitalIcon() : createCitizenIcon()} />
        )}

        {/* Ambulance marker */}
        <AmbulanceMarker position={ambulancePos} bearing={bearing} />

        <MapFitter
          ambulancePos={ambulancePos}
          incidentPos={destinationPos}
          hasRoute={route.length > 1}
        />
      </PremiumMap>

      {/* Floating Recentering Button */}
      {mapInstance && (
        <div 
          className="ltv-recenter-btn" 
          title="Recenter map"
          onClick={() => {
            if (ambulancePos && destinationPos) {
              const bounds = L.latLngBounds([ambulancePos, destinationPos]);
              mapInstance.flyToBounds(bounds, { padding: [80, 80], maxZoom: 17, duration: 1.5 });
            } else if (destinationPos) {
              mapInstance.flyTo(destinationPos, 16, { duration: 1.5 });
            } else {
              mapInstance.flyTo([28.6139, 77.209], 14, { duration: 1.5 });
            }
          }}
        >
          <Navigation size={22} color="#3b82f6" fill="rgba(59,130,246,0.1)" />
        </div>
      )}

      {/* ── Overlays ── */}
      <div className="ltv-overlays">
        {/* Status banner — top */}
        {phase === "tracking" && <StatusBanner status={status} />}

        {/* ETA card — top right */}
        {phase === "tracking" && ambulance && !isArrivalMode && !isTransporting && !isCompleted && <ETACard eta={eta} status={status} />}

        {/* Driver info sheet — bottom */}
        {phase === "tracking" && ambulance && (
          isCompleted ? (
            <CompletionCard ambulance={ambulance} incident={incident} countdown={hasCompletedLive.current ? countdown : undefined} onClose={onClose} />
          ) : isTransporting ? (
            <TransportCard ambulance={ambulance} eta={eta} distance={distance} status={status} />
          ) : isArrivalMode ? (
            <motion.div
              className="ltv-arrival-card ltv-card"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              style={{
                pointerEvents: 'all',
                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                color: '#fff',
                borderRadius: '24px 24px 0 0',
                padding: '24px',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
                borderTop: '2px solid rgba(56,189,248,0.25)',
                width: '100%',
                maxWidth: '480px',
                margin: '0 auto',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '32px', animation: 'ltv-pulse 2s infinite' }}>🚑</div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#38bdf8', letterSpacing: '-0.02em' }}>
                  Ambulance arrived near your location
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
                  Please stay highly visible and keep phone lines free.
                </p>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  background: 'rgba(56,189,248,0.08)', 
                  padding: '6px 14px', 
                  borderRadius: '50px', 
                  border: '1px solid rgba(56,189,248,0.15)',
                  marginTop: '6px'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', animation: 'ltv-pulse 1s infinite' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Medical team is approaching
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <DriverSheet ambulance={ambulance} incident={incident} />
          )
        )}
      </div>

      {/* Pre-acceptance Full Overlay */}
      <AnimatePresence>
        {phase !== "tracking" && (
          <motion.div 
            className="ltv-pre-acceptance"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div 
              className="ltv-pre-card"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              {phase === "searching" ? (
                <>
                  <div className="ltv-spinner-wrap"><Loader2 className="ltv-spin" size={48} color="#3b82f6"/></div>
                  <h3>{status}</h3>
                  <p>Please stay calm. Do not close this window.</p>
                </>
              ) : (
                <>
                  <div className="ltv-success-wrap"><CheckCircle2 size={56} color="#10b981"/></div>
                  <h3>Request Accepted</h3>
                  <p>Driver assigned and en route. Live tracking activated.</p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
