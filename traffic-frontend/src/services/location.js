// Production Fallback Geolocation Constant
// LPU Block 38 — Computer Applications and Research Department, Lovely Professional University
export const LPU_FALLBACK = {
  lat: 31.2522427094373,
  lng: 75.70313062579577,
  accuracy: 15,
  name: "LPU Block 38 — Computer Applications and Research Department, Lovely Professional University"
};

/**
 * Attempts to fetch approximate location based on IP.
 * Returns { lat, lng, accuracy } or null on failure.
 */
export const fetchIpLocation = async (timeoutMs = 2000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) throw new Error('IP location failed');
    const data = await response.json();
    if (data.latitude && data.longitude) {
      console.log(`[Location Service] IP Geolocation resolved: lat=${data.latitude}, lng=${data.longitude}`);
      return {
        lat: parseFloat(data.latitude),
        lng: parseFloat(data.longitude),
        accuracy: 1000 // Approximate IP accuracy
      };
    }
  } catch (err) {
    clearTimeout(id);
    console.warn("[Location Service] IP location lookup failed:", err.message);
  }
  return null;
};

/**
 * Resolves the effective starting coordinates based on the production hierarchy:
 * A. Active/passed state (real GPS) -> handled live by React component state.
 * B. Last successful cached coordinates in localStorage.
 * C. Browser approximate/IP location.
 * D. Final emergency-safe fallback: LPU Block 38.
 */
export const resolveStartingLocation = async (role = 'citizen') => {
  // TEMPORARY DEMO LOCATION OVERRIDE
  console.log(`[TEMPORARY DEMO LOCATION OVERRIDE] resolveStartingLocation forced to LPU Block 38 for role: ${role}`);
  return {
    lat: LPU_FALLBACK.lat,
    lng: LPU_FALLBACK.lng,
    accuracy: LPU_FALLBACK.accuracy,
    isFallback: true,
    isIp: false,
    label: LPU_FALLBACK.name
  };
};
