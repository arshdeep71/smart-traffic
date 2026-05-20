// LiveTrackingView.jsx
// Drop-in replacement for your tracking UI.
// Props: { incident, ambulance, socket }

import { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import "leaflet/dist/leaflet.css";
import "./LiveTrackingView.css";

import ETACard from "./ETACard";
import DriverSheet from "./DriverSheet";
import StatusBanner from "./StatusBanner";
import { createAmbulanceIcon, createLocationPin } from "./mapIcons";

// ─── Smooth marker movement hook ────────────────────────────────────────────
function useSmoothMarker(markerRef, targetPos, durationMs = 1200) {
  const frameRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(null);

  useEffect(() => {
    if (!markerRef.current || !targetPos) return;
    const current = markerRef.current.getLatLng();
    fromRef.current = [current.lat, current.lng];
    startRef.current = null;

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / durationMs, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out-cubic

      const lat = fromRef.current[0] + (targetPos[0] - fromRef.current[0]) * ease;
      const lng = fromRef.current[1] + (targetPos[1] - fromRef.current[1]) * ease;
      markerRef.current?.setLatLng([lat, lng]);

      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => frameRef.current && cancelAnimationFrame(frameRef.current);
  }, [targetPos, durationMs]);
}

// ─── Map auto-fit component ──────────────────────────────────────────────────
function MapFitter({ ambulancePos, incidentPos, hasRoute }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || !ambulancePos || !incidentPos) return;
    const bounds = L.latLngBounds([ambulancePos, incidentPos]).pad(0.25);
    map.fitBounds(bounds, { animate: true, duration: 1.2 });
    fitted.current = true;
  }, [ambulancePos, incidentPos]);

  return null;
}

// ─── Ambulance marker controller ─────────────────────────────────────────────
function AmbulanceMarker({ position, bearing }) {
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function LiveTrackingView({ incident, ambulance, socket }) {
  const [ambulancePos, setAmbulancePos] = useState(
    ambulance?.currentLocation
      ? [ambulance.currentLocation.lat, ambulance.currentLocation.lng]
      : null
  );
  const [bearing, setBearing] = useState(0);
  const [route, setRoute] = useState([]);
  const [eta, setEta] = useState(null);
  const [status, setStatus] = useState("assigned");
  const [prevPos, setPrevPos] = useState(null);

  const incidentPos = incident?.location
    ? [incident.location.lat, incident.location.lng]
    : null;

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
      if (data.eta !== undefined) setEta(data.eta);
    };

    const onRoute = (data) => {
      if (data.coordinates) setRoute(data.coordinates.map((c) => [c.lat, c.lng]));
    };

    const onStatus = (data) => {
      if (data.status) setStatus(data.status);
      if (data.eta !== undefined) setEta(data.eta);
    };

    socket.on("ambulance:location", onLocation);
    socket.on("ambulance:route", onRoute);
    socket.on("ambulance:status", onStatus);
    socket.on("incident:status", onStatus);

    return () => {
      socket.off("ambulance:location", onLocation);
      socket.off("ambulance:route", onRoute);
      socket.off("ambulance:status", onStatus);
      socket.off("incident:status", onStatus);
    };
  }, [socket, calcBearing]);

  const center = ambulancePos || incidentPos || [28.6139, 77.209];

  return (
    <div className="ltv-root">
      {/* ── Map ── */}
      <MapContainer
        center={center}
        zoom={14}
        zoomControl={false}
        className="ltv-map"
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* Route line */}
        {route.length > 1 && (
          <Polyline
            positions={route}
            pathOptions={{
              color: "#111111",
              weight: 5,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
              dashArray: null,
            }}
          />
        )}

        {/* Incident pin */}
        {incidentPos && (
          <Marker position={incidentPos} icon={createLocationPin()} />
        )}

        {/* Ambulance marker */}
        <AmbulanceMarker position={ambulancePos} bearing={bearing} />

        <MapFitter
          ambulancePos={ambulancePos}
          incidentPos={incidentPos}
          hasRoute={route.length > 1}
        />
      </MapContainer>

      {/* ── Overlays ── */}
      <div className="ltv-overlays">
        {/* Status banner — top */}
        <StatusBanner status={status} />

        {/* ETA card — top right */}
        <ETACard eta={eta} status={status} />

        {/* Driver info sheet — bottom */}
        <DriverSheet ambulance={ambulance} incident={incident} />
      </div>
    </div>
  );
}
