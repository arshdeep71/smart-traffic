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
  const isPolice = incident?.status?.toLowerCase().includes('police') || 
                   incident?.status?.toLowerCase().includes('officer') || 
                   ambulance?.vehicleNumber?.toLowerCase().includes('police') || 
                   ambulance?.plateNumber?.toLowerCase().includes('police') ||
                   ambulance?.driverName?.toLowerCase().includes('officer');

  const driverName   = ambulance?.driverName    || ambulance?.driver?.name    || (isPolice ? "Officer Patrol Unit" : "Assigned Driver");
  const hospitalName = ambulance?.hospitalName  || ambulance?.hospital?.name  || (isPolice ? "LPU Traffic Command Center" : "City Hospital");
  const plateNumber  = ambulance?.ambulanceNumber || ambulance?.vehicleNumber || ambulance?.plateNumber || (isPolice ? "POLICE-911" : "AMB-0000");
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
      <div className="ltv-sheet">
        <div className="ltv-sheet-handle" />

        {/* Ambulance/Police info */}
        <div className="ltv-sheet-header">
          <div className="ltv-ambulance-badge">
            <div className="ltv-ambulance-icon-wrap">{isPolice ? "🚔" : "🚑"}</div>
            <div className="ltv-ambulance-meta">
              <span className="ltv-ambulance-num">{plateNumber}</span>
              <span className="ltv-hospital-name">{hospitalName}</span>
            </div>
          </div>

          <button
            className="ltv-call-btn"
            onClick={handleCall}
            title={phone ? `Call ${driverName}` : "No number available"}
            disabled={!phone}
            style={{ opacity: phone ? 1 : 0.4, cursor: phone ? "pointer" : "default" }}
            aria-label="Call driver"
          >
            📞
          </button>
        </div>

        <div className="ltv-divider" />

        {/* Driver/Officer row */}
        <div className="ltv-driver-row">
          <div className="ltv-avatar">{getInitials(driverName)}</div>
          <div className="ltv-driver-info">
            <div className="ltv-driver-name">{driverName}</div>
            <div className="ltv-driver-role">{isPolice ? "Police Patrol Officer" : "Emergency Medical Technician"}</div>
          </div>
          <div className="ltv-rating">
            <span className="ltv-star">★</span>
            {isPolice ? "5.0" : "4.9"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
