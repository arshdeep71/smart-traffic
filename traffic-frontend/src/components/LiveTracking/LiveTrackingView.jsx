// LiveTrackingView.jsx
// Drop-in replacement for your tracking UI, customized 100% for Police emergency tracking.
// Props: { incident, ambulance, socket, onClose }

import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import "leaflet/dist/leaflet.css";
import "./LiveTrackingView.css";

import DriverSheet from "./DriverSheet";
import StatusBanner from "./StatusBanner";
import { createLocationPin, createCitizenIcon, createPoliceIcon } from "./mapIcons";
import { Loader2, Navigation, Shield } from "lucide-react";
import "leaflet-routing-machine";

class LiveTrackingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("LiveTrackingErrorBoundary caught a rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#090d16',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '16px',
          padding: '2.5rem 2rem',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '1.5rem',
          fontFamily: 'monospace',
          zIndex: 999999
        }}>
          <span style={{ fontSize: '3rem', animation: 'pulse-glow 1.5s infinite' }}>⚠️</span>
          <h3 style={{ margin: 0, color: '#ef4444', fontSize: '1.25rem', fontWeight: 900 }}>Tactical Map Subsystem Fault</h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', maxWidth: '400px', lineHeight: 1.5 }}>
            A rendering exception occurred in the Leaflet GIS canvas context. Let's reset the active navigation subsystem.
          </p>
          <div style={{
            background: '#030712',
            padding: '0.85rem 1.2rem',
            borderRadius: '10px',
            fontSize: '0.72rem',
            color: '#ef4444',
            maxWidth: '100%',
            overflowX: 'auto',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            textAlign: 'left'
          }}>
            {this.state.error?.toString() || "Unknown GIS Exception"}
          </div>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
          >
            Attempt Subsystem Recovery
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Routing Machine Component ──────────────────────────────────────────────
export function RoutingMachine({ start, end, onRouteCalculated }) {
  const map = useMap();
  
  // Standardize start/end to lat,lng strings
  const startLat = start?.lat ?? (Array.isArray(start) ? start[0] : 31.2592);
  const startLng = start?.lng ?? (Array.isArray(start) ? start[1] : 75.6980);
  const endLat = end?.lat ?? (Array.isArray(end) ? end[0] : 31.252243);
  const endLng = end?.lng ?? (Array.isArray(end) ? end[1] : 75.703131);

  const startStr = `${startLat},${startLng}`;
  const endStr = `${endLat},${endLng}`;

  useEffect(() => {
    if (!map) return;
    if (!L.Routing || !L.Routing.control) {
      console.warn("[Leaflet Routing Machine] L.Routing is not available yet.");
      return;
    }
    let routingControl;
    try {
      routingControl = L.Routing.control({
        waypoints: [ L.latLng(startLat, startLng), L.latLng(endLat, endLng) ],
        lineOptions: { styles: [{ color: '#3b82f6', weight: 6, opacity: 0.85, lineCap: "round", lineJoin: "round" }] },
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
    } catch (err) {
      console.error("[Leaflet Routing Control Error]", err);
    }
    return () => {
      if (routingControl && map) {
        try {
          map.removeControl(routingControl);
        } catch (_) {}
      }
    };
  }, [map, startStr, endStr]);

  return null;
}

// ─── Map auto-fit component ──────────────────────────────────────────────────
export function MapFitter({ ambulancePos, incidentPos }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (!ambulancePos || !incidentPos) return;
    if (fitted.current) return;
    
    try {
      const ambLat = ambulancePos?.lat ?? (Array.isArray(ambulancePos) ? ambulancePos[0] : 31.2592);
      const ambLng = ambulancePos?.lng ?? (Array.isArray(ambulancePos) ? ambulancePos[1] : 75.6980);
      const incLat = incidentPos?.lat ?? (Array.isArray(incidentPos) ? incidentPos[0] : 31.252243);
      const incLng = incidentPos?.lng ?? (Array.isArray(incidentPos) ? incidentPos[1] : 75.703131);

      const bounds = L.latLngBounds([ [ambLat, ambLng], [incLat, incLng] ]);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 17, animate: true, duration: 1.2 });
      fitted.current = true;
    } catch (err) {
      console.error("[Leaflet fitBounds error]", err);
    }
  }, [ambulancePos, incidentPos]);

  return null;
}

// ─── Police marker controller ─────────────────────────────────────────────
export function AmbulanceMarker({ position, bearing }) {
  const markerRef = useRef(null);
  const [targetPos, setTargetPos] = useState(position);
  const icon = useRef(createPoliceIcon(bearing));

  useEffect(() => { setTargetPos(position); }, [position]);
  useSmoothMarker(markerRef, targetPos);

  useEffect(() => {
    if (markerRef.current) {
      try {
        icon.current = createPoliceIcon(bearing);
        markerRef.current.setIcon(icon.current);
      } catch (err) {
        console.error("[Leaflet setIcon error]", err);
      }
    }
  }, [bearing]);

  if (!position) return null;
  const markerCoords = Array.isArray(position) ? position : [position.lat, position.lng];
  return <Marker ref={markerRef} position={markerCoords} icon={icon.current} />;
}

// ─── Map auto-resize invalidator ──────────────────────────────────────────────
export function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    console.log("[GIS MAP INITIATED] Invalidation queues scheduled.");
    const timeouts = [100, 300, 800, 1500].map(delay => 
      setTimeout(() => {
        try {
          map.invalidateSize();
          console.log(`[GIS MAP RESIZE] Invalidated size after ${delay}ms`);
        } catch (_) {}
      }, delay)
    );
    return () => timeouts.forEach(t => clearTimeout(t));
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
export function PremiumMap({ center = [31.252243, 75.703131], zoom = 14, children, className = "ltv-map", style }) {
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
    
    // Safely parse position whether it is array or object
    const targetLat = Array.isArray(position) ? position[0] : position.lat;
    const targetLng = Array.isArray(position) ? position[1] : position.lng;
    
    if (endPos.current && (
      (Array.isArray(endPos.current) && endPos.current[0] === targetLat && endPos.current[1] === targetLng) ||
      (!Array.isArray(endPos.current) && endPos.current.lat === targetLat && endPos.current.lng === targetLng)
    )) {
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

      const lat = startPos.current[0] + (targetLat - startPos.current[0]) * ease;
      const lng = startPos.current[1] + (targetLng - startPos.current[1]) * ease;

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
const isValidCoords = (coords) => {
  if (!coords) return false;
  if (Array.isArray(coords)) return coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1]);
  return !isNaN(coords.lat) && !isNaN(coords.lng);
};

export function LiveTrackingViewRaw({ incident, ambulance, socket, onClose }) {
  const [ambulancePos, setAmbulancePos] = useState(null);
  const [bearing, setBearing] = useState(0);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [status, setStatus] = useState(incident?.status || "Police Assigned");
  const [mapInstance, setMapInstance] = useState(null);

  const isCompleted = ['completed', 'resolved'].includes(status?.toLowerCase());
  const isArrivalMode = distance !== null && parseFloat(distance) <= 0.08 && !isCompleted;

  const incidentPos = { lat: 31.252243, lng: 75.703131 }; // Fixed LPU coordinates

  // ── compute bearing between two GPS points ──
  const calcBearing = useCallback((from, to) => {
    const fromLat = from?.lat ?? (Array.isArray(from) ? from[0] : 31.2592);
    const fromLng = from?.lng ?? (Array.isArray(from) ? from[1] : 75.6980);
    const toLat = to?.lat ?? (Array.isArray(to) ? to[0] : 31.252243);
    const toLng = to?.lng ?? (Array.isArray(to) ? to[1] : 75.703131);

    const toRad = (d) => (d * Math.PI) / 180;
    const dLng = toRad(toLng - fromLng);
    const lat1 = toRad(fromLat);
    const lat2 = toRad(toLat);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }, []);

  // ── console diagnostics ──
  useEffect(() => {
    console.log("[GIS LiveTrackingViewRaw Mount/Update] Diagnostics:", {
      incident,
      ambulance,
      ambulancePos,
      bearing,
      eta,
      distance,
      status,
      socketConnected: !!socket?.connected
    });
  }, [incident, ambulance, ambulancePos, bearing, eta, distance, status, socket]);

  // Set initial coordinates for active police dispatch
  useEffect(() => {
    if (!ambulancePos) {
      console.log("[GIS POSITION FALLBACK] Setting police unit fallback coords: { lat: 31.2592, lng: 75.6980 }");
      setAmbulancePos({ lat: 31.2592, lng: 75.6980 });
    }
  }, [ambulancePos]);

  // Sync initial ambulance position from props when assignment comes in
  useEffect(() => {
    if (ambulance) {
      const lat = ambulance.lat || ambulance.currentLocation?.lat;
      const lng = ambulance.lng || ambulance.currentLocation?.lng;
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        console.log("[GIS POSITION SYNC] Coordinates successfully synced from props:", { lat, lng });
        setAmbulancePos({ lat, lng });
      } else {
        console.log("[GIS POSITION SYNC] Coordinates missing or invalid in props, falling back to LPU coords.");
        setAmbulancePos({ lat: 31.2592, lng: 75.6980 });
      }
    }
  }, [ambulance]);

  // Synchronize status prop unconditionally
  useEffect(() => {
    if (incident?.status) {
      setStatus(incident.status);
    }
  }, [incident?.status]);

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onLocation = (data) => {
      console.log("[GIS REALTIME RECEIVED] Realtime GPS signal received over socket:", data);
      const newPos = { lat: data.lat, lng: data.lng };
      if (newPos.lat && newPos.lng) {
        setAmbulancePos((prev) => {
          if (prev) setBearing(calcBearing(prev, newPos));
          return newPos;
        });
      }
    };

    const onStatus = (data) => {
      if (data.status) {
        setStatus(data.status);
      }
    };

    socket.on("ambulance-gps", onLocation);
    socket.on("emergency-status-updated", onStatus);

    return () => {
      socket.off("ambulance-gps", onLocation);
      socket.off("emergency-status-updated", onStatus);
    };
  }, [socket, calcBearing]);

  const center = ambulancePos ? [ambulancePos.lat, ambulancePos.lng] : [incidentPos.lat, incidentPos.lng];

  return (
    <div className="ltv-root" style={{ background: '#030712' }}>
      <PremiumMap center={center} zoom={15}>
        <MapRefSetter setMap={setMapInstance} />
        
        {/* Dynamic Route line */}
        {ambulancePos && (
          <RoutingMachine 
             start={ambulancePos} 
             end={incidentPos} 
             onRouteCalculated={(info) => {
               setEta(info.time);
               setDistance(info.distance);
             }} 
          />
        )}

        {/* Proximity arrival glow ring */}
        {isArrivalMode && (
          <Circle
            center={[incidentPos.lat, incidentPos.lng]}
            radius={80}
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

        {/* Accident Incident pin */}
        <Marker position={[incidentPos.lat, incidentPos.lng]} icon={createCitizenIcon()} />

        {/* Responding Police patrol vehicle marker */}
        {ambulancePos && (
          <AmbulanceMarker 
            position={ambulancePos} 
            bearing={bearing} 
          />
        )}

        {ambulancePos && (
          <MapFitter
            ambulancePos={ambulancePos}
            incidentPos={incidentPos}
          />
        )}
      </PremiumMap>

      {/* Floating Recentering Button */}
      {mapInstance && (
        <div 
          className="ltv-recenter-btn" 
          title="Recenter Map"
          onClick={() => {
            if (ambulancePos) {
              try {
                const bounds = L.latLngBounds([ [ambulancePos.lat, ambulancePos.lng], [incidentPos.lat, incidentPos.lng] ]);
                mapInstance.flyToBounds(bounds, { padding: [80, 80], maxZoom: 17, duration: 1.5 });
              } catch (_) {
                mapInstance.flyTo([incidentPos.lat, incidentPos.lng], 16, { duration: 1.5 });
              }
            } else {
              mapInstance.flyTo([incidentPos.lat, incidentPos.lng], 16, { duration: 1.5 });
            }
          }}
          style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <Navigation size={22} color="#3b82f6" fill="rgba(59,130,246,0.1)" />
        </div>
      )}

      {/* ── Overlays ── */}
      <div className="ltv-overlays">
        {/* Status banner — top */}
        <StatusBanner status={status} />

        {/* ETA card — top right */}
        {ambulance && !isArrivalMode && !isCompleted && (
          <div className="ltv-eta-card" style={{ background: 'linear-gradient(135deg, #090d16, #030712)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px', padding: '16px', color: '#fff', position: 'absolute', top: '80px', right: '20px', zIndex: 999 }}>
            <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>POLICE UNIT ETA</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#fff', margin: '4px 0' }}>
              {eta !== null ? `${eta} min` : "Calculating..."}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {distance !== null ? `${distance} km away` : "GNSS tracking active"}
            </div>
          </div>
        )}

        {/* Officer info sheet — bottom */}
        {ambulance && !isCompleted && (
          isArrivalMode ? (
            <motion.div
              className="ltv-arrival-card ltv-card"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              style={{
                pointerEvents: 'all',
                background: 'linear-gradient(135deg, #090d16, #030712)',
                color: '#fff',
                borderRadius: '24px 24px 0 0',
                padding: '24px',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                borderTop: '2px solid rgba(59,130,246,0.3)',
                width: '100%',
                maxWidth: '480px',
                margin: '0 auto',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '32px', animation: 'ltv-pulse 2s infinite' }}>🚔</div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#3b82f6', letterSpacing: '-0.02em' }}>
                  Police Patrol Unit Arrived Nearby
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
                  Officers are on-scene securing the perimeter. Please remain visible.
                </p>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  background: 'rgba(59,130,246,0.1)', 
                  padding: '6px 14px', 
                  borderRadius: '50px', 
                  border: '1px solid rgba(59,130,246,0.2)',
                  marginTop: '6px'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', animation: 'ltv-pulse 1s infinite' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Securing Incident Zone
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <DriverSheet ambulance={ambulance} incident={incident} />
          )
        )}
      </div>
    </div>
  );
}

export default function LiveTrackingView(props) {
  return (
    <LiveTrackingErrorBoundary>
      <LiveTrackingViewRaw {...props} />
    </LiveTrackingErrorBoundary>
  );
}
