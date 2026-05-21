// StatusBanner.jsx
import { motion, AnimatePresence } from "framer-motion";
import "./LiveTrackingView.css";

const STATUS_MAP = {
  assigned: { label: "Police Unit Assigned — en route to you", dot: "assigned" },
  enroute:  { label: "Officer is on the way",           dot: "enroute"  },
  nearby:   { label: "Officer is nearby",               dot: "nearby"   },
  arrived:  { label: "Officers have reached scene",     dot: "arrived"  },
  
  "police assigned": { label: "Police Unit Assigned — en route to you", dot: "enroute" },
  "officer en route": { label: "Officer is en route to you", dot: "enroute" },
  "officer nearby":   { label: "Officer is nearby — prepare for arrival", dot: "nearby" },
  "officer reached scene":  { label: "Officers have reached scene", dot: "arrived" },
  
  "ambulance en route": { label: "Officer is en route to you", dot: "enroute" },
  "ambulance nearby":   { label: "Officer is nearby — prepare for arrival", dot: "nearby" },
  "ambulance arrived":  { label: "Officers have reached scene", dot: "arrived" },
  "arrived_scene":      { label: "Officers have reached scene", dot: "arrived" },
  "investigation active": { label: "Perimeter secured — investigation active", dot: "arrived" },
  "completed":          { label: "Police response completed successfully", dot: "arrived" },
  "resolved":           { label: "Police response completed successfully", dot: "arrived" }
};

export default function StatusBanner({ status }) {
  const key = String(status || "").toLowerCase().trim();
  const info = STATUS_MAP[key] || STATUS_MAP.assigned;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        className="ltv-status-banner ltv-card"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -12, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
      >
        <span className={`ltv-status-dot ${info.dot}`} />
        <span className="ltv-status-text">{info.label}</span>
      </motion.div>
    </AnimatePresence>
  );
}
