// StatusBanner.jsx
import { motion, AnimatePresence } from "framer-motion";
import "./LiveTrackingView.css";

const STATUS_MAP = {
  assigned: { label: "Driver assigned — en route to you", dot: "assigned" },
  enroute:  { label: "Ambulance is on the way",           dot: "enroute"  },
  nearby:   { label: "Ambulance is nearby",               dot: "nearby"   },
  arrived:  { label: "Help has arrived",                  dot: "arrived"  },
};

export default function StatusBanner({ status }) {
  const info = STATUS_MAP[status] || STATUS_MAP.assigned;

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
