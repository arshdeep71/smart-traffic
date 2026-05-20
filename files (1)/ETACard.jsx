// ETACard.jsx
import { motion, AnimatePresence } from "framer-motion";
import "./LiveTrackingView.css";

const STATUS_COLORS = {
  assigned: "#f59e0b",
  enroute:  "#3b82f6",
  nearby:   "#10b981",
  arrived:  "#10b981",
};

export default function ETACard({ eta, status }) {
  // eta is in seconds from your backend
  const minutes = eta != null ? Math.max(1, Math.round(eta / 60)) : null;

  if (status === "arrived") {
    return (
      <div className="ltv-eta-wrap">
        <motion.div
          className="ltv-eta-card ltv-card"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ borderTop: `3px solid #10b981` }}
        >
          <div className="ltv-eta-label">Status</div>
          <div className="ltv-eta-value" style={{ fontSize: 18, color: "#10b981", fontWeight: 700 }}>
            Arrived
          </div>
          <div className="ltv-eta-unit">Help is here</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="ltv-eta-wrap">
      <AnimatePresence mode="wait">
        {minutes != null && (
          <motion.div
            key={minutes}
            className="ltv-eta-card ltv-card"
            initial={{ y: -10, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -6, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            style={{ borderTop: `3px solid ${STATUS_COLORS[status] || "#111"}` }}
          >
            <div className="ltv-eta-label">ETA</div>
            <div className="ltv-eta-value">{minutes}</div>
            <div className="ltv-eta-unit">{minutes === 1 ? "min away" : "mins away"}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
