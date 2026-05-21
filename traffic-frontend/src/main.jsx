import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'leaflet/dist/leaflet.css'

// ==========================================
// TEMPORARY DEMO LOCATION OVERRIDE
// Forced active current location for tomorrow's showcase:
// Location: LPU Block 38 — Computer Applications and Research Department
// Latitude: 31.2522427094373
// Longitude: 75.70313062579577
// ==========================================
const FORCED_LAT = 31.2522427094373;
const FORCED_LNG = 75.70313062579577;
const FORCED_ACCURACY = 15;

if (typeof window !== 'undefined' && window.navigator && window.navigator.geolocation) {
  const mockGeolocation = {
    getCurrentPosition: (success, error, options) => {
      console.log("[TEMPORARY DEMO LOCATION OVERRIDE] getCurrentPosition intercepted. Returning fixed LPU coordinates.");
      setTimeout(() => {
        success({
          coords: {
            latitude: FORCED_LAT,
            longitude: FORCED_LNG,
            accuracy: FORCED_ACCURACY,
            altitude: null,
            altitudeAccuracy: null,
            heading: 0,
            speed: 0
          },
          timestamp: Date.now()
        });
      }, 0);
    },
    watchPosition: (success, error, options) => {
      console.log("[TEMPORARY DEMO LOCATION OVERRIDE] watchPosition intercepted. Returning fixed LPU coordinates.");
      setTimeout(() => {
        success({
          coords: {
            latitude: FORCED_LAT,
            longitude: FORCED_LNG,
            accuracy: FORCED_ACCURACY,
            altitude: null,
            altitudeAccuracy: null,
            heading: 0,
            speed: 0
          },
          timestamp: Date.now()
        });
      }, 0);
      return 99999; // Return a dummy watch ID
    },
    clearWatch: (id) => {
      console.log("[TEMPORARY DEMO LOCATION OVERRIDE] clearWatch intercepted for ID:", id);
    }
  };

  try {
    Object.defineProperty(window.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true
    });
    console.log("[TEMPORARY DEMO LOCATION OVERRIDE] Geolocation API successfully mocked.");
  } catch (e) {
    console.warn("[TEMPORARY DEMO LOCATION OVERRIDE] Failed to define custom geolocation property. Falling back to direct assignment.", e);
    window.navigator.geolocation.getCurrentPosition = mockGeolocation.getCurrentPosition;
    window.navigator.geolocation.watchPosition = mockGeolocation.watchPosition;
    window.navigator.geolocation.clearWatch = mockGeolocation.clearWatch;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

