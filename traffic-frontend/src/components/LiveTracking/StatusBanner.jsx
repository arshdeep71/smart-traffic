// StatusBanner.jsx
import { motion, AnimatePresence } from "framer-motion";
import "./LiveTrackingView.css";

const STATUS_MAP = {
  assigned: { label: "Driver assigned — en route to you", dot: "assigned" },
  enroute:  { label: "Ambulance is on the way",           dot: "enroute"  },
  nearby:   { label: "Ambulance is nearby",               dot: "nearby"   },
  arrived:  { label: "Help has arrived",                  dot: "arrived"  },
  
  "ambulance en route": { label: "Driver assigned — en route to you", dot: "enroute" },
  "ambulance nearby":   { label: "Ambulance is nearby — prepare for arrival", dot: "nearby" },
  "ambulance arrived":  { label: "Ambulance has arrived at your location", dot: "arrived" },
  "arrived_scene":      { label: "Ambulance has arrived at scene", dot: "arrived" },
  "patient_picked":     { label: "Patient secured safely — preparing transit", dot: "arrived" },
  "patient secured":    { label: "Patient secured — navigating to hospital", dot: "arrived" },
  "transporting_to_hospital": { label: "Emergency transport active — heading to hospital", dot: "enroute" },
  "reached_hospital":   { label: "Arrived at hospital medical bay", dot: "arrived" },
  "completed":          { label: "Emergency response completed successfully", dot: "arrived" },
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
