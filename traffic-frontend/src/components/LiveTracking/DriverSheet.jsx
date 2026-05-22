// DriverSheet.jsx
import { motion } from "framer-motion";
import "./LiveTrackingView.css";

function getInitials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

export default function DriverSheet({ ambulance, incident }) {
  const driverName   = ambulance?.driverName    || ambulance?.driver?.name    || "Officer Patrol Unit";
  const stationName  = "LPU Traffic Command Center";
  const plateNumber  = ambulance?.ambulanceNumber || ambulance?.vehicleNumber || ambulance?.plateNumber || "POLICE-911";
  const phone        = ambulance?.driverPhone   || ambulance?.driver?.phone   || null;

  const handleCall = () => {
    if (phone) window.location.href = `tel:${phone}`;
  };

  return (
    <motion.div
      className="ltv-sheet-wrap"
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.35 }}
    >
      <div className="ltv-sheet" style={{ background: 'linear-gradient(135deg, #090d16, #030712)', borderTop: '3px solid #ea580c' }}>
        <div className="ltv-sheet-handle" style={{ background: '#1e293b' }} />

        {/* Police info */}
        <div className="ltv-sheet-header">
          <div className="ltv-ambulance-badge">
            <div className="ltv-ambulance-icon-wrap" style={{ background: 'rgba(234, 88, 12, 0.15)', border: '1px solid rgba(234, 88, 12, 0.3)' }}>🚔</div>
            <div className="ltv-ambulance-meta">
              <span className="ltv-ambulance-num" style={{ color: '#fff' }}>{plateNumber}</span>
              <span className="ltv-hospital-name" style={{ color: '#94a3b8' }}>{stationName}</span>
            </div>
          </div>

          <button
            className="ltv-call-btn"
            onClick={handleCall}
            title={phone ? `Call ${driverName}` : "No number available"}
            disabled={!phone}
            style={{ opacity: phone ? 1 : 0.4, cursor: phone ? "pointer" : "default", background: 'rgba(234, 88, 12,0.1)', color: '#ea580c' }}
            aria-label="Call officer"
          >
            📞
          </button>
        </div>

        <div className="ltv-divider" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

        {/* Responder row */}
        <div className="ltv-driver-row">
          <div className="ltv-avatar" style={{ background: '#ea580c', color: '#fff' }}>{getInitials(driverName)}</div>
          <div className="ltv-driver-info">
            <div className="ltv-driver-name" style={{ color: '#fff' }}>{driverName}</div>
            <div className="ltv-driver-role" style={{ color: '#94a3b8' }}>Police Patrol Officer</div>
          </div>
          <div className="ltv-rating">
            <span className="ltv-star" style={{ color: '#f59e0b' }}>★</span>
            <span style={{ color: '#fff' }}>5.0</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
