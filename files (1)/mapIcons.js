// mapIcons.js  — custom Leaflet icons using DivIcon (no image deps)
import L from "leaflet";

// ─── Ambulance moving icon ────────────────────────────────────────────────────
export function createAmbulanceIcon(bearing = 0) {
  return L.divIcon({
    className: "",
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    html: `
      <div style="
        position: relative;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- pulse ring -->
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid rgba(239,68,68,0.35);
          animation: ltv-ring-expand 2s ease-out infinite;
        "></div>
        <!-- body -->
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #ef4444;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 3px 14px rgba(239,68,68,0.5);
          transform: rotate(${bearing}deg);
          position: relative;
          z-index: 1;
          transition: transform 1.2s ease;
        ">🚑</div>
      </div>
    `,
  });
}

// ─── Emergency location pin ───────────────────────────────────────────────────
export function createLocationPin(label = "Emergency Location") {
  return L.divIcon({
    className: "",
    iconSize: [120, 52],
    iconAnchor: [60, 52],
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        font-family: 'DM Sans', sans-serif;
        gap: 0;
      ">
        <!-- bubble -->
        <div style="
          background: #fff;
          border-radius: 10px;
          padding: 5px 11px;
          font-size: 11px;
          font-weight: 600;
          color: #111;
          white-space: nowrap;
          box-shadow: 0 2px 10px rgba(0,0,0,0.14);
          border: 1px solid #f0f0f0;
          letter-spacing: 0.01em;
        ">${label}</div>
        <!-- stem -->
        <div style="
          width: 2px;
          height: 8px;
          background: #111;
          border-radius: 1px;
        "></div>
        <!-- dot -->
        <div style="
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ef4444;
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          margin-top: -1px;
        "></div>
      </div>
    `,
  });
}
