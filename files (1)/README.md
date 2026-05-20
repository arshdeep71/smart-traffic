# LiveTrackingView — Premium Ambulance Tracking UI

Drop-in premium tracking experience. Uber/Zomato-style, fullscreen, smooth animations.

---

## Files

| File | Role |
|---|---|
| `LiveTrackingView.jsx` | Root component — fullscreen map + all overlays |
| `LiveTrackingView.css` | All styles (fonts, cards, animations) |
| `ETACard.jsx` | Floating top-right ETA card |
| `StatusBanner.jsx` | Top-center status pill |
| `DriverSheet.jsx` | Bottom sheet with driver/ambulance info |
| `mapIcons.js` | Custom Leaflet DivIcons (ambulance + pin) |

---

## Install dependencies

```bash
npm install react-leaflet leaflet framer-motion
```

---

## Usage

```jsx
import LiveTrackingView from "./LiveTrackingView/LiveTrackingView";

// In your incident/tracking page:
<LiveTrackingView
  incident={incident}   // your incident object from backend
  ambulance={ambulance} // your ambulance object
  socket={socket}       // your existing Socket.IO instance
/>
```

---

## Expected data shapes

### `incident` prop
```js
{
  location: { lat: 28.613, lng: 77.209 }
}
```

### `ambulance` prop
```js
{
  currentLocation: { lat: 28.620, lng: 77.215 },
  vehicleNumber:   "DL-01-AB-1234",
  driverName:      "Rajesh Kumar",
  driverPhone:     "+91-9876543210",
  hospitalName:    "AIIMS Delhi",
}
```

### Socket events (already on your backend)

| Event | Payload | Used for |
|---|---|---|
| `ambulance:location` | `{ lat, lng, eta? }` | Move ambulance, update ETA |
| `ambulance:route` | `{ coordinates: [{lat,lng}] }` | Draw route polyline |
| `ambulance:status` | `{ status, eta? }` | Status banner + ETA |
| `incident:status` | `{ status }` | Status updates |

Status values: `"assigned"` → `"enroute"` → `"nearby"` → `"arrived"`

---

## Map tile

Uses **CartoDB Light** (free, no API key):
```
https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png
```
This gives the clean white city map (exactly like the Uber/Zomato reference).

---

## Customising the driver sheet

The component reads from your `ambulance` object automatically.
If your field names differ, update the aliases at the top of `DriverSheet.jsx`:

```js
const driverName   = ambulance?.driverName  || ambulance?.driver?.name;
const hospitalName = ambulance?.hospitalName || ambulance?.hospital?.name;
const plateNumber  = ambulance?.vehicleNumber || ambulance?.plateNumber;
const phone        = ambulance?.driverPhone   || ambulance?.driver?.phone;
```

---

## Animation details

- **Ambulance movement** — cubic ease-out interpolation, 1.2 s per GPS update
- **ETA card** — spring pop on every value change
- **Status banner** — spring slide-in, exits cleanly on change
- **Driver sheet** — spring slide-up on mount (0.35 s delay)
- **Pulse ring** — CSS keyframe on ambulance icon

All motion via Framer Motion — SSR safe, hardware-accelerated.
