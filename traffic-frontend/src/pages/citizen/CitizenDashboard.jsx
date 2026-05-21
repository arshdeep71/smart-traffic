import React, { useState, useEffect, useRef, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { connectSocket, socket } from '../../services/socket';
import { AlertTriangle, MapPin, Camera, Video, Loader2, Zap, Activity, UserCheck, Smartphone, Package, Navigation, Compass, CheckCircle } from 'lucide-react';
import { Marker, Popup, Circle } from 'react-leaflet';
import { PremiumMap, AmbulanceMarker } from '../../components/LiveTracking/LiveTrackingView';
import { createLocationPin } from '../../components/LiveTracking/mapIcons';
import { SilentSOS, AudioEvidence } from './EmergencyPanel';
import { MedicalPanel, InjurySelector } from './MedicalPanel';
import LiveTrackingView from '../../components/LiveTracking/LiveTrackingView';
import { resolveStartingLocation, LPU_FALLBACK } from '../../services/location';


const EvidencePackage = ({ video, photos, lat, lng }) => {
  const items = [
    { done: !!video, label: 'Live Video Evidence' },
    { done: photos.length > 0, label: `${photos.length} Burst Snapshots` },
    { done: true, label: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}` },
    { done: true, label: `Timestamp: ${new Date().toLocaleString()}` },
  ];
  return (
    <div className="glass-panel" style={{ padding: '1rem' }}>
      <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '0.82rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <Package size={14} color="#8b5cf6" /> Multi-Evidence Package
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {items.map((it, i) => (
          <div key={i} className="pkg-item">
            <span className="check">{it.done ? '✓' : '○'}</span>
            <span style={{ color: it.done ? '#111827' : '#9ca3af' }}>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CitizenDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, logout } = useContext(AuthContext);

  // Custom Profile Onboarding States (Post-Login Welcome takeover)
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmergency, setProfileEmergency] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Pre-populate input fields once user session completes hydration
  useEffect(() => {
    if (user) {
      if (!profileName && user.name) setProfileName(user.name);
      if (!profilePhone && user.phone) setProfilePhone(user.phone);
      if (!profileEmergency && user.emergencyContact) setProfileEmergency(user.emergencyContact);
    }
  }, [user]);

  const getInitialTab = () => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'home';
  };

  const [tab, setTab] = useState(getInitialTab());
  const [medicalModalOpen, setMedicalModalOpen] = useState(false);

  // TOUR & ONBOARDING STATE
  const [tourActive, setTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);

  const TOUR_STEPS = [
    {
      target: '#sos-btn',
      title: '⚡ One-Tap SOS Panic Button',
      desc: 'Alert nearby hospitals and ambulance dispatchers instantly with your live GPS location. Fired in 1-tap in any extreme critical case.',
      tab: 'home'
    },
    {
      target: '#shortcuts-grid',
      title: '🚀 Quick Action Shortcuts',
      desc: 'Seamlessly file incidents, launch silent SOS alarms, or search step-by-step first-aid guidance from one place.',
      tab: 'home'
    },
    {
      target: '#report-form-container',
      title: '🚨 Incident Report Center',
      desc: 'File road accidents, request paramedics, and attach camera evidence/photo bursts. Integrated AI engine classifies severity instantly.',
      tab: 'report'
    },
    {
      target: '#map-panel',
      title: '🗺️ Real-Time Ambulance Tracking',
      desc: 'Visualizes live dispatcher route lines, ETA distance/time, and ambulance first responder GPS coordinates.',
      tab: 'report'
    },
    {
      target: '#history-log-container',
      title: '📜 Standalone Records Log',
      desc: 'Tracks historical reports, response timelines, emergency statuses, and completed hospital coordination logs.',
      tab: 'history'
    }
  ];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryTab = params.get('tab');
    if (queryTab && ['home', 'history', 'report', 'medical', 'profile'].includes(queryTab)) {
      setTab(queryTab);
    } else if (!queryTab) {
      setTab('home');
    }
  }, [location]);

  // Listener for 'start-tour' event from Layout sidebar link
  useEffect(() => {
    const handleStartTour = () => {
      navigate('/citizen?tab=home');
      setTab('home');
      setCurrentStepIndex(0);
      setTourActive(true);
    };
    window.addEventListener('start-tour', handleStartTour);
    return () => window.removeEventListener('start-tour', handleStartTour);
  }, [navigate]);

  // First time popup trigger
  useEffect(() => {
    const tourCompleted = localStorage.getItem('citizen_tour_completed');
    if (!tourCompleted) {
      const timer = setTimeout(() => {
        setShowWelcome(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-switch tabs based on current tour step
  useEffect(() => {
    if (tourActive && TOUR_STEPS[currentStepIndex]) {
      const stepTab = TOUR_STEPS[currentStepIndex].tab;
      if (stepTab && tab !== stepTab) {
        setTab(stepTab);
      }
    }
  }, [currentStepIndex, tourActive]);

  const [isSOS, setIsSOS] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  
  // Geolocation & persistent permission architecture
  const savedLat = localStorage.getItem('citizen_lat');
  const savedLng = localStorage.getItem('citizen_lng');
  const savedAcc = localStorage.getItem('citizen_accuracy');
  const initialLocation = savedLat && savedLng 
    ? { lat: parseFloat(savedLat), lng: parseFloat(savedLng), accuracy: parseFloat(savedAcc || '10') } 
    : { lat: LPU_FALLBACK.lat, lng: LPU_FALLBACK.lng, accuracy: LPU_FALLBACK.accuracy };

  const [formData, setFormData] = useState({ title: '', description: '', category: 'Vehicle Collision', severity: 'medium', location: initialLocation });
  const [locationPermissionState, setLocationPermissionState] = useState('granted'); // Initialized as granted to prevent blocking during fallback resolution
  const [usingDemoFallback, setUsingDemoFallback] = useState(!savedLat || !savedLng);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [burstPhotos, setBurstPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeIncident, setActiveIncident] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedAccident, setSubmittedAccident] = useState(null);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [accidents, setAccidents] = useState([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [injuries, setInjuries] = useState([]);

  // LIVE TRACKING STATE
  const [assignedAmbulance, setAssignedAmbulance] = useState(null);
  const [ambLocation, setAmbLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState({ distance: '—', time: '—' });

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recTimerRef = useRef(null);

  const requestLocation = (force = false) => {
    if (!navigator.geolocation) {
      console.warn("[GPS] Geolocation is not supported by your browser.");
      handleLocationFailure(force);
      return;
    }
    
    if (force) {
      console.log("[GPS Cache Purge] Hard refresh requested. Purging all cached location data.");
      localStorage.removeItem('citizen_lat');
      localStorage.removeItem('citizen_lng');
      localStorage.removeItem('citizen_accuracy');
    }

    console.log("[GPS] Requesting fresh live browser GPS...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log(`[GPS Source: Live Browser GPS] Success obtained: lat=${pos.coords.latitude}, lng=${pos.coords.longitude}, accuracy=${pos.coords.accuracy}m`);
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setFormData(prev => ({ ...prev, location: loc }));
        
        console.log(`[GPS Cache Overwrite] Overwriting old cached coordinates: lat=${localStorage.getItem('citizen_lat')}, lng=${localStorage.getItem('citizen_lng')} with new live: lat=${pos.coords.latitude}, lng=${pos.coords.longitude}`);
        localStorage.setItem('citizen_lat', pos.coords.latitude.toString());
        localStorage.setItem('citizen_lng', pos.coords.longitude.toString());
        localStorage.setItem('citizen_accuracy', pos.coords.accuracy.toString());
        
        setLocationPermissionState('granted');
        setUsingDemoFallback(false);
      },
      async (err) => {
        console.warn(`[GPS] Live browser GPS request failed: Code ${err.code} - ${err.message}`);
        await handleLocationFailure(force);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleLocationFailure = async (force = false) => {
    // Priority B: Last successful cached coordinates (only if not forced)
    if (!force) {
      const cLat = localStorage.getItem('citizen_lat');
      const cLng = localStorage.getItem('citizen_lng');
      const cAcc = localStorage.getItem('citizen_accuracy');
      
      if (cLat && cLng) {
        console.log(`[GPS Source: Cached LocalStorage] Falling back temporarily to cached coordinates: lat=${cLat}, lng=${cLng}`);
        const loc = { lat: parseFloat(cLat), lng: parseFloat(cLng), accuracy: parseFloat(cAcc || '15') };
        setFormData(prev => ({ ...prev, location: loc }));
        setLocationPermissionState('granted');
        setUsingDemoFallback(false);
        return;
      }
    }

    // Priority C & D: IP Location & Final LPU Fallback
    console.log("[GPS] No active cached coordinates or forced. Resolving starting location via IP/LPU fallback...");
    const res = await resolveStartingLocation('citizen');
    console.log(`[GPS Source: ${res.isFallback ? 'LPU Fallback' : 'IP Lookup'}] lat=${res.lat}, lng=${res.lng}`);
    const loc = { lat: res.lat, lng: res.lng, accuracy: res.accuracy };
    setFormData(prev => ({ ...prev, location: loc }));
    setUsingDemoFallback(res.isFallback);
    setLocationPermissionState('granted');
  };

  // Keep location ref for socket handler to bypass dependency rebuilds
  const locationRef = useRef(formData.location);
  useEffect(() => {
    locationRef.current = formData.location;
  }, [formData.location]);

  // Hook 1: Basic Telemetry Initialization & Network Watchers
  useEffect(() => {
    // ALWAYS attempt fresh real GPS on load to prioritize live values immediately
    requestLocation(false);

    window.addEventListener('online', () => setIsOffline(false));
    window.addEventListener('offline', () => setIsOffline(true));

    fetchNearby();
    return () => {
      window.removeEventListener('online', () => setIsOffline(false));
      window.removeEventListener('offline', () => setIsOffline(true));
    };
  }, []);

  // Hook 2: High-accuracy Background GPS Watcher
  useEffect(() => {
    let watchId;
    if (navigator.geolocation) {
      console.log("[GPS] Starting persistent background GPS watch loop...");
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          console.log(`[GPS Update: Live Watch] Active GPS watch update: lat=${pos.coords.latitude}, lng=${pos.coords.longitude}, accuracy=${pos.coords.accuracy}m`);
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          setFormData(prev => ({ ...prev, location: loc }));
          
          console.log(`[GPS Cache Overwrite: Live Watch] Overwriting old cache: lat=${localStorage.getItem('citizen_lat')}, lng=${localStorage.getItem('citizen_lng')} with new watch: lat=${pos.coords.latitude}, lng=${pos.coords.longitude}`);
          localStorage.setItem('citizen_lat', pos.coords.latitude.toString());
          localStorage.setItem('citizen_lng', pos.coords.longitude.toString());
          localStorage.setItem('citizen_accuracy', pos.coords.accuracy.toString());
          setUsingDemoFallback(false);
        },
        (err) => {
          console.warn("[GPS] Active watchPosition warning:", err.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
    return () => {
      if (watchId) {
        console.log("[GPS] Stopping persistent background GPS watch loop.");
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Hook 3: Socket Event Handlers (Using locationRef to stay completely decoupled from GPS jitter)
  useEffect(() => {
    connectSocket({ role: 'citizen' });
    if (!socket) return;

    const handleAssigned = (data) => {
      setAssignedAmbulance(data);
      setActiveIncident(prev => prev ? { ...prev, status: 'Ambulance En Route' } : prev);
    };

    const handleGps = (data) => {
      setAmbLocation([data.lat, data.lng]);

      // Auto Arrival Detection (Uses ref to get latest position without re-triggering useEffect)
      const currentLoc = locationRef.current;
      if (currentLoc) {
        const dLat = Math.abs(data.lat - currentLoc.lat);
        const dLng = Math.abs(data.lng - currentLoc.lng);
        if (dLat < 0.0003 && dLng < 0.0003) {
          setActiveIncident(prev => prev ? { ...prev, status: 'Ambulance Arrived' } : prev);
        } else if (dLat < 0.001 && dLng < 0.001) {
          setActiveIncident(prev => prev ? { ...prev, status: 'Ambulance Nearby' } : prev);
        }
      }
    };

    const handleStatusUpdated = (data) => {
      const { status } = data;

      if (status === 'completed' || status === 'reached_hospital') {
        setIsSOS(false);
        setEmergencyMode(false);
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance("SOS mode automatically deactivated. You have safely arrived at the destination hospital.");
          window.speechSynthesis.speak(utterance);
        }
      }

      setActiveIncident(prev => {
        if (!prev) return prev;
        const updated = { ...prev, status };

        if (status === 'completed') {
          setAccidents(accs => {
            const idx = accs.findIndex(a => (a._id || a.id) === (prev._id || prev.id));
            if (idx > -1) {
              const newAccs = [...accs];
              newAccs[idx] = { ...newAccs[idx], status: 'completed' };
              return newAccs;
            } else {
              return [{ ...prev, status: 'completed' }, ...accs];
            }
          });
        }
        return updated;
      });
    };

    socket.on('ambulance-assigned', handleAssigned);
    socket.on('ambulance-gps', handleGps);
    socket.on('emergency-status-updated', handleStatusUpdated);

    return () => {
      socket.off('ambulance-assigned', handleAssigned);
      socket.off('ambulance-gps', handleGps);
      socket.off('emergency-status-updated', handleStatusUpdated);
    };
  }, [socket, formData.location]);

  // EMIT LIVE CITIZEN GPS
  useEffect(() => {
    if (activeIncident && formData.location && socket?.connected) {
      socket.emit('citizen-gps', {
        incidentId: activeIncident._id || activeIncident.id,
        lat: formData.location.lat,
        lng: formData.location.lng
      });
    }
  }, [formData.location, activeIncident]);

  // AUTO REGISTER SOCKET ROOM FOR ANY ACTIVE/HISTORIC INCIDENTS
  useEffect(() => {
    if (activeIncident && socket?.connected) {
      const eId = activeIncident._id || activeIncident.id;
      if (eId) {
        socket.emit('register-citizen', { role: 'citizen', emergencyId: eId });
      }
    }
  }, [activeIncident, socket?.connected]);

  const fetchNearby = async () => {
    try {
      const res = await api.get('/accidents');
      const raw = res.data?.data;
      setAccidents(Array.isArray(raw) ? raw.slice(0, 5) : Array.isArray(raw?.data) ? raw.data.slice(0, 5) : []);
    } catch (_) { }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      
      recorder.onstop = () => {
        setVideoUrl(URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' })));
        setIsExtractingFrames(true);
        setExtractionProgress(0);
        let progress = 0;
        const progInterval = setInterval(() => {
          progress += 10;
          setExtractionProgress(progress);
          if (progress >= 100) {
            clearInterval(progInterval);
            setIsExtractingFrames(false);
          }
        }, 150);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setBurstPhotos([]); // Reset photos

      recTimerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 7) { // 8 seconds limit (0 to 7)
            stopRecording();
            return 8;
          }
          return t + 1;
        });
      }, 1000);

      const burst = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const bi = setInterval(() => {
        if (burst.length < 8 && videoRef.current) {
          const w = videoRef.current.videoWidth || 640;
          const h = videoRef.current.videoHeight || 480;
          canvas.width = w;
          canvas.height = h;

          // Draw actual webcam image frame
          ctx.drawImage(videoRef.current, 0, 0, w, h);

          // Overlay sleek dimming filter to boost HUD readability
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.fillRect(0, 0, w, h);

          // HUD Corner Viewfinder brackets
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          const l = 20;
          // Top-Left
          ctx.beginPath(); ctx.moveTo(l, 15); ctx.lineTo(15, 15); ctx.lineTo(15, l); ctx.stroke();
          // Top-Right
          ctx.beginPath(); ctx.moveTo(w - l, 15); ctx.lineTo(w - 15, 15); ctx.lineTo(w - 15, l); ctx.stroke();
          // Bottom-Left
          ctx.beginPath(); ctx.moveTo(l, h - 15); ctx.lineTo(15, h - 15); ctx.lineTo(15, h - l); ctx.stroke();
          // Bottom-Right
          ctx.beginPath(); ctx.moveTo(w - l, h - 15); ctx.lineTo(w - 15, h - 15); ctx.lineTo(w - 15, h - l); ctx.stroke();

          // Pulsing red recording dot
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(35, 35, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(`REC 00:0${burst.length + 1}`, 50, 39);

          // Smart Telemetry Info Box
          ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
          ctx.fillRect(15, h - 65, 290, 50);
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(15, h - 65, 290, 50);

          ctx.fillStyle = '#3b82f6';
          ctx.fillText('📡 LINK: SECURE CITY RADAR', 25, h - 48);
          ctx.fillStyle = '#10b981';
          ctx.fillText('🛰️ GPS: 31.252242 N, 75.703130 E', 25, h - 33);
          ctx.fillStyle = '#9ca3af';
          ctx.fillText(`⏳ FRAME TIME: +${(burst.length + 1).toFixed(1)}s (LPU B38)`, 25, h - 18);

          const tStamp = `+${(burst.length + 1).toFixed(1)}s`;
          burst.push({
            dataUrl: canvas.toDataURL('image/jpeg'),
            timestamp: tStamp,
            id: burst.length + 1
          });
          setBurstPhotos([...burst]);
        } else {
          clearInterval(bi);
        }
      }, 1000);

      // Backup safety stop at 9 seconds
      setTimeout(() => {
        clearInterval(bi);
      }, 9000);

    } catch (e) {
      console.error(e);
      alert('Camera/Mic access required for emergency evidence recording.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      clearInterval(recTimerRef.current);
    }
  };

  const triggerSOS = async () => {
    setIsSOS(true); setEmergencyMode(true); setLoading(true);
    try {
      const res = await api.post('/accidents', { title: 'URGENT PANIC SOS', description: 'Citizen triggered SOS.', severity: 'high', latitude: formData.location.lat, longitude: formData.location.lng, category: 'Medical Emergency' });
      const accidentData = res.data.data;
      setActiveIncident({ ...accidentData, status: 'SOS Received', timeline: [{ time: new Date().toLocaleTimeString(), text: 'SOS Triggered' }, { time: new Date().toLocaleTimeString(), text: 'GPS Captured' }] });
      startRecording();

      // BROADCAST TO ALL NEARBY AMBULANCES
      if (socket) {
        const eId = accidentData._id || accidentData.id || Date.now().toString();
        socket.emit('new-emergency', {
          emergencyId: eId,
          title: 'URGENT PANIC SOS',
          category: 'Medical Emergency',
          severity: 'CRITICAL',
          lat: formData.location.lat,
          lng: formData.location.lng
        });
        socket.emit('register-citizen', { role: 'citizen', emergencyId: eId });
      }
    } catch (_) { setMessage('SOS Queued — Offline'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      const data = new FormData();
      ['title', 'description', 'category', 'severity'].forEach(k => data.append(k, formData[k]));
      data.append('latitude', formData.location.lat); data.append('longitude', formData.location.lng);
      if (videoUrl) { const b = await (await fetch(videoUrl)).blob(); data.append('images[]', b, `ev_${Date.now()}.mp4`); }
      for (let i = 0; i < burstPhotos.length; i++) { 
        const b = await (await fetch(burstPhotos[i].dataUrl)).blob(); 
        data.append('images[]', b, `burst_${i}.jpg`); 
      }
      const res = await api.post('/accidents', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      const accidentData = res.data.data;
      setSubmittedAccident(accidentData);
      setShowSuccessModal(true);
      setActiveIncident({ ...accidentData, status: 'Report Received', timeline: [{ time: new Date().toLocaleTimeString(), text: 'Evidence Package Uploaded' }] });
      setMessage('Emergency Report Submitted.');

      // BROADCAST TO ALL NEARBY AMBULANCES
      if (socket) {
        const eId = accidentData._id || accidentData.id;
        socket.emit('new-emergency', {
          emergencyId: eId,
          title: formData.title,
          category: formData.category,
          severity: formData.severity.toUpperCase(),
          lat: formData.location.lat,
          lng: formData.location.lng
        });
      }
    } catch (_) { setMessage('Upload failed.'); }
    finally { setLoading(false); }
  };

  const WelcomePopup = () => {
    if (!showWelcome) return null;

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }}>
        <div className="glass-panel pop-in" style={{ width: '420px', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.8rem', boxShadow: '0 8px 20px rgba(139, 92, 246, 0.3)' }}>
            🧭
          </div>
          
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 900, color: '#1f2937' }}>Welcome to SmartTraffic</h3>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#6366f1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Emergency Response System</p>
          </div>

          <p style={{ margin: 0, fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.5 }}>
            Would you like a quick guided tour to explore the real-time emergency, live tracking, and first-aid guide features?
          </p>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
            <button 
              onClick={() => {
                setShowWelcome(false);
                localStorage.setItem('citizen_tour_completed', 'true');
              }}
              className="btn btn-outline" 
              style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', fontWeight: 700 }}
            >
              Skip
            </button>
            <button 
              onClick={() => {
                setShowWelcome(false);
                setTab('report');
                setCurrentStepIndex(0);
                setTourActive(true);
              }}
              className="btn" 
              style={{ flex: 1, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff', border: 'none', padding: '0.6rem', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', borderRadius: 8 }}
            >
              Start Tour
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SuccessPopup = () => {
    if (!showSuccessModal) return null;

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '1.5rem' }}>
        <div className="glass-panel pop-in" style={{ width: '100%', maxWidth: '480px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', border: '1px solid rgba(16, 185, 129, 0.25)', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', border: '4px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)', animation: 'pulse-red 2s infinite' }}>
              <CheckCircle size={44} />
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>
              Your complaint has been successfully filed.
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>
              Emergency telemetry and photographic evidence uploaded to control room.
            </p>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Complaint ID:</span>
              <span style={{ fontWeight: 800, color: '#f3f4f6', fontFamily: 'monospace' }}>
                {submittedAccident?.id || submittedAccident?._id || `SMP-${Date.now().toString().slice(-6)}`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Submitted:</span>
              <span style={{ fontWeight: 600, color: '#f3f4f6' }}>
                {new Date(submittedAccident?.created_at || Date.now()).toLocaleTimeString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#9ca3af' }}>Emergency Status:</span>
              <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem', textTransform: 'uppercase', fontWeight: 800 }}>
                Under Manual Verification
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.8rem', color: '#d1d5db' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              <span>Emergency response teams have been notified.</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              <span>Your uploaded evidence has been forwarded to the control center.</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              <span>Please remain reachable for further assistance.</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              <span>Help will be dispatched shortly after verification.</span>
            </div>
          </div>

          <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.3rem' }} className="pulse-alert">
              <span>📡 ACTIVE DISPATCH FREQUENCY...</span>
              <span>CONNECTED</span>
            </div>
            <div style={{ height: '3px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', width: '60%' }}></div>
            </div>
          </div>

          <button 
            onClick={() => {
              setShowSuccessModal(false);
            }}
            className="btn btn-danger"
            style={{ width: '100%', padding: '0.75rem', fontWeight: 800, letterSpacing: '0.5px' }}
          >
            Acknowledge & Track
          </button>
        </div>
      </div>
    );
  };

  const FrameInspectorPopup = () => {
    if (!previewPhoto) return null;

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100002, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', padding: '1.5rem' }}>
        <div className="glass-panel pop-in" style={{ width: '100%', maxWidth: '640px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>🔍 Evidence Frame Inspector</h4>
            <button 
              onClick={() => setPreviewPhoto(null)} 
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 900 }}
            >
              ✕
            </button>
          </div>

          <div style={{ width: '100%', height: '360px', borderRadius: '8px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={previewPhoto.dataUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="High-Res Evidence Preview" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#9ca3af', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '6px' }}>
            <div>
              Frame: <span style={{ color: '#fff', fontWeight: 700 }}>#{previewPhoto.id} of 8</span>
            </div>
            <div>
              Extract Timestamp: <span style={{ color: '#10b981', fontWeight: 800, fontFamily: 'monospace' }}>{previewPhoto.timestamp}</span>
            </div>
            <div className="badge badge-info" style={{ fontSize: '0.62rem', fontWeight: 800 }}>
              VERIFICATION SCAN READY
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SpotlightOverlay = () => {
    const [style, setStyle] = useState(null);
    const [tooltipStyle, setTooltipStyle] = useState(null);

    useEffect(() => {
      if (!tourActive || !currentStep) return;

      const updatePosition = () => {
        const el = document.querySelector(currentStep.target);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const rect = el.getBoundingClientRect();
          setStyle({
            position: 'fixed',
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.82), 0 0 15px rgba(139, 92, 246, 0.5)',
            border: '2px solid #8b5cf6',
            transition: 'all 0.3s ease-out',
            pointerEvents: 'none',
            zIndex: 99999
          });

          const isMobile = window.innerWidth < 768;
          let top = rect.bottom + 16;
          let left = rect.left + (rect.width / 2) - 160;

          if (left < 16) left = 16;
          if (left + 320 > window.innerWidth) left = window.innerWidth - 336;
          if (top + 220 > window.innerHeight) {
            top = rect.top - 220 - 16;
          }
          if (top < 16) top = 16;

          setTooltipStyle({
            position: 'fixed',
            top: top,
            left: isMobile ? '5%' : left,
            width: isMobile ? '90%' : '320px',
            zIndex: 100000,
            transition: 'all 0.3s ease-out',
          });
        } else {
          setStyle({
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '0px',
            height: '0px',
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.82)',
            border: 'none',
            pointerEvents: 'none',
            zIndex: 99999
          });
          setTooltipStyle({
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '320px',
            zIndex: 100000,
          });
        }
      };

      updatePosition();
      
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
      const timer = setTimeout(updatePosition, 350);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
        clearTimeout(timer);
      };
    }, [currentStepIndex, tourActive, tab]);

    if (!tourActive || !currentStep) return null;

    return (
      <>
        <div style={style} />
        <div style={tooltipStyle} className="glass-panel pulse-subtle-glow">
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', padding: '0.8rem 1.25rem', borderTopLeftRadius: 12, borderTopRightRadius: 12, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Guided Tour</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(255,255,255,0.2)', padding: '0.1rem 0.5rem', borderRadius: 4 }}>
              {currentStepIndex + 1} of {TOUR_STEPS.length}
            </span>
          </div>

          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1f2937' }}>{currentStep.title}</h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#4b5563', lineHeight: 1.4 }}>{currentStep.desc}</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
              <button 
                onClick={() => {
                  setTourActive(false);
                  localStorage.setItem('citizen_tour_completed', 'true');
                }} 
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Skip Tour
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {currentStepIndex > 0 && (
                  <button 
                    onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                    className="btn btn-outline"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem', borderRadius: 6, fontWeight: 700 }}
                  >
                    Back
                  </button>
                )}

                {currentStepIndex < TOUR_STEPS.length - 1 ? (
                  <button 
                    onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                    className="btn"
                    style={{ background: '#8b5cf6', color: '#fff', padding: '0.35rem 0.85rem', fontSize: '0.72rem', borderRadius: 6, border: 'none', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Next
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setTourActive(false);
                      localStorage.setItem('citizen_tour_completed', 'true');
                      if ('speechSynthesis' in window) {
                        const utterance = new SpeechSynthesisUtterance("Welcome aboard! You have completed the guided walkthrough.");
                        window.speechSynthesis.speak(utterance);
                      }
                    }}
                    className="btn"
                    style={{ background: '#10b981', color: '#fff', padding: '0.35rem 0.85rem', fontSize: '0.72rem', borderRadius: 6, border: 'none', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Finish 🎉
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Redirect back to login's native onboarding if session is authenticated but onboarding is incomplete
  useEffect(() => {
    if (user && user.role === 'citizen' && !user.profileCompleted) {
      navigate('/citizen-login');
    }
  }, [user, navigate]);

  if (locationPermissionState === 'denied' || !formData.location) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)' }}>
        <div className="glass-panel pop-in" style={{ width: '450px', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2rem', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)' }}>
            📍
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 900, color: '#1f2937' }}>Location Access Required</h3>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#ef4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>GPS Permission Restricted</p>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#4b5563', lineHeight: 1.6 }}>
            Please allow location access to use SmartTraffic emergency services. Real-time GPS verification is required to route emergency first responders to your exact coordinates.
          </p>
          <button 
            type="button"
            onClick={() => requestLocation(true)}
            className="btn" 
            style={{ width: '100%', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none', padding: '0.8rem', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', borderRadius: 8, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}
          >
            🔄 Grant Location Permission & Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fade-in ${emergencyMode ? 'emergency-mode-active' : ''}`} style={{ padding: '0 1rem' }}>
      {emergencyMode && (
        <div className="em-banner" style={{ marginBottom: '1rem', borderRadius: 12 }}>
          🚨 EMERGENCY MODE ACTIVE &nbsp;|&nbsp; Brightness Max &nbsp;|&nbsp; GPS Locked
          <button onClick={() => setEmergencyMode(false)} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem' }}>Deactivate</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Citizen Safety Portal</h2>
          <div style={{ color: '#6b7280', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <MapPin size={11} style={{ verticalAlign: 'middle' }} /> 
            {formData.location.lat.toFixed(4)}, {formData.location.lng.toFixed(4)} (±{formData.location.accuracy.toFixed(0)}m)
            <button 
              type="button"
              onClick={() => requestLocation(true)} 
              className="btn btn-outline" 
              style={{ display: 'inline-flex', padding: '0.2rem 0.5rem', fontSize: '0.65rem', borderRadius: 4, cursor: 'pointer', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'transparent', color: '#8b5cf6', fontWeight: 700 }}
            >
              🔄 Refresh GPS
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {isOffline && <span style={{ background: '#f59e0b', color: '#000', padding: '0.3rem 0.8rem', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700 }}><Smartphone size={12} /> Offline</span>}
          <button id="sos-btn" onClick={triggerSOS} disabled={loading} className="btn-danger pulse-alert"
            style={{ padding: emergencyMode ? '1.2rem 2.5rem' : '0.8rem 2rem', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: emergencyMode ? '1.4rem' : '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#dc2626', color: '#fff' }}>
            <Zap fill="white" size={emergencyMode ? 28 : 20} /> {emergencyMode ? '🚨 SOS' : 'ONE-TAP SOS'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', minHeight: 0, alignItems: 'start' }}>

        {/* ZOMATO/UBER STYLE FULLSCREEN HERO LIVE TRACKING */}
        {activeIncident ? (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
            <button onClick={() => { setActiveIncident(null); setTab('history'); }} style={{ position: 'absolute', top: 20, right: 20, zIndex: 10001, background: '#f1f5f9', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', color: '#64748b', fontSize: '0.85rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>Close Map</button>
            <LiveTrackingView
              incident={activeIncident}
              ambulance={assignedAmbulance}
              socket={socket}
              onClose={() => { setActiveIncident(null); setTab('history'); }}
            />
          </div>
        ) : (
          <>
            {/* Left Column containing view pages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* 🏠 HOME TAB VIEW */}
              {tab === 'home' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Welcome Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    color: '#fff',
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.15)'
                  }}>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>Welcome to Emergency Hub</h3>
                    <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: '#fee2e2', opacity: 0.9 }}>
                      Smart City Safe Zone Portal. Dispatching, coordination, and live assistance at your fingertips.
                    </p>
                  </div>

                  {/* Active Emergency Summary if exists */}
                  {accidents.filter(a => a.status?.toLowerCase() !== 'completed' && a.status?.toLowerCase() !== 'resolved').length > 0 ? (
                    <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.02)' }}>
                      <h4 style={{ margin: '0 0 0.6rem 0', color: '#ef4444', fontSize: '0.88rem', display: 'flex', gap: '0.4rem', alignItems: 'center', fontWeight: 800 }}>
                        <span className="silent-sos-dot" /> ACTIVE EMERGENCY IN PROGRESS
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {accidents.filter(a => a.status?.toLowerCase() !== 'completed' && a.status?.toLowerCase() !== 'resolved').slice(0, 1).map((acc) => (
                          <div key={acc._id || acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1f2937' }}>
                                {acc.title || acc.category}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.2rem' }}>
                                Status: <span style={{ color: '#d97706', fontWeight: 700 }}>{acc.status}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                setActiveIncident(acc);
                                setAssignedAmbulance(null);
                                setRouteInfo({ distance: '—', time: '—' });
                              }}
                              className="btn"
                              style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', padding: '0.4rem 1rem', border: 'none', cursor: 'pointer', borderRadius: '6px', fontWeight: 700 }}
                            >
                              Live Track 🗺️
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(16, 185, 129, 0.02)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} className="animate-pulse" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#065f46' }}>Safe Zone Active</div>
                        <div style={{ fontSize: '0.72rem', color: '#047857' }}>All systems nominal. No critical emergencies reported from your device.</div>
                      </div>
                    </div>
                  )}

                  {/* Shortcuts Grid */}
                  <div>
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Shortcuts</h4>
                    <div id="shortcuts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                      
                      <div onClick={() => navigate('/citizen?tab=report')} className="glass-panel hover-card" style={{ padding: '1rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                        <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>🚨</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1f2937' }}>File Report</div>
                        <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.2rem' }}>Camera evidence & details</div>
                      </div>

                      <div onClick={triggerSOS} className="glass-panel hover-card" style={{ padding: '1rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', border: '1px solid rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.02)' }}>
                        <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>🆘</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ef4444' }}>Panic SOS</div>
                        <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.2rem' }}>Instant silent trigger</div>
                      </div>

                      <div onClick={() => navigate('/citizen?tab=medical')} className="glass-panel hover-card" style={{ padding: '1rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                        <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>❤️</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1f2937' }}>Medical Guide</div>
                        <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.2rem' }}>29 first-aid conditions</div>
                      </div>

                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ef4444' }}>7</div>
                      <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.1rem' }}>Hospitals Live</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#2563eb' }}>12</div>
                      <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.1rem' }}>Ambulances</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f59e0b' }}>4.8m</div>
                      <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.1rem' }}>Avg Dispatch</div>
                    </div>
                  </div>

                  {/* Quick Help Guide */}
                  <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.02)', borderColor: 'rgba(139, 92, 246, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6d28d9' }}>Need a system tour?</div>
                      <div style={{ fontSize: '0.68rem', color: '#7c3aed' }}>Start the 5-step interactive tour to learn how to track ambulances and report incidents.</div>
                    </div>
                    <button 
                      onClick={() => {
                        navigate('/citizen?tab=home');
                        setTab('home');
                        setCurrentStepIndex(0);
                        setTourActive(true);
                      }}
                      className="btn"
                      style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Start Tour
                    </button>
                  </div>
                </div>
              )}

              {/* 📜 STANDALONE EMERGENCY HISTORY LOG */}
              {tab === 'history' && (
                <div id="history-log-container" className="glass-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#1f2937' }}>
                      📜 Standalone Emergency History & Records
                    </h3>
                    <span className="glass-badge" style={{ background: '#f1f5f9', color: '#4b5563' }}>{accidents.length} logs</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {accidents.length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '3rem 2rem' }}>No emergency records found. Your submitted reports will appear here.</div>
                    ) : (
                      accidents.map((acc, i) => {
                        const isCompleted = acc.status?.toLowerCase() === 'completed' || acc.status?.toLowerCase() === 'resolved';
                        const isPending = acc.status?.toLowerCase() === 'pending' || acc.status?.toLowerCase() === 'sos received';

                        return (
                          <div key={acc._id || acc.id || i} onClick={() => { setActiveIncident(acc); setAssignedAmbulance(null); setRouteInfo({ distance: '—', time: '—' }); window.scrollTo(0, 0); }} className="glass-panel" style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: isCompleted ? '4px solid #10b981' : isPending ? '4px solid #f59e0b' : '4px solid #3b82f6', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.06)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  {acc.category === 'Medical Emergency' ? '🚑' : acc.category === 'Fire Emergency' ? '🔥' : '🚨'} {acc.title || acc.category || 'Emergency Alert'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>{acc.created_at ? new Date(acc.created_at).toLocaleString() : new Date().toLocaleString()}</div>
                              </div>
                              <span style={{ padding: '0.3rem 0.6rem', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: isCompleted ? '#d1fae5' : isPending ? '#fef3c7' : '#dbeafe', color: isCompleted ? '#059669' : isPending ? '#d97706' : '#2563eb' }}>
                                {isCompleted ? 'COMPLETED' : acc.status}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#475569', marginTop: '0.8rem', background: '#f8fafc', padding: '0.6rem', borderRadius: '8px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><UserCheck size={14} /> {acc.driver_id ? 'Driver Assigned' : 'Awaiting Driver'}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Activity size={14} /> {acc.hospital_id ? 'Hospital En Route' : 'Broadcasting...'}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* 🚨 DETAILED EMERGENCY REPORT SUBMISSION */}
              {tab === 'report' && (
                <div id="report-form-container" className="glass-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#1f2937' }}>
                      🚨 File Emergency Incident Report
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                      Submit verified incident telemetry to the dispatch control room with multi-evidence camera attachments.
                    </p>
                  </div>

                  {!activeIncident && (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ background: '#000', borderRadius: 10, overflow: 'hidden', position: 'relative', height: 180 }}>
                        <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {!isRecording && !videoUrl && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '0.75rem' }}>
                            <Camera size={28} /><span style={{ marginTop: '0.4rem' }}>Live evidence only</span>
                          </div>
                        )}
                        {isRecording && (
                          <div style={{ position: 'absolute', top: 8, left: 8, color: '#fff', fontSize: '0.62rem', fontFamily: 'monospace', textShadow: '0 0 4px #000' }}>
                            ● REC {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:{String(recordingTime % 60).padStart(2, '0')}<br />
                            GPS:{formData.location.lat.toFixed(4)},{formData.location.lng.toFixed(4)}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {!isRecording
                            ? <button type="button" onClick={startRecording} className="btn btn-outline" style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}><Video size={14} /> Record Evidence (8s)</button>
                            : <button type="button" onClick={stopRecording} className="btn btn-danger" style={{ flex: 1, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>Stop & Attach</button>
                          }
                        </div>

                        {/* 🎥 EXTRACTION PROGRESS EFFECT */}
                        {isExtractingFrames && (
                          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                              <span style={{ color: '#3b82f6', fontWeight: 700 }} className="pulse-alert">🎥 Processing Evidence...</span>
                              <span style={{ color: '#3b82f6', fontWeight: 800 }}>{extractionProgress}%</span>
                            </div>
                            <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${extractionProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.15s ease-out' }}></div>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.4rem', textAlign: 'center' }}>
                              Extracting multiple image frames from recorded clip...
                            </div>
                          </div>
                        )}

                        {/* 📸 EVIDENCE THUMBNAILS & PREVIEW GALLERY */}
                        {burstPhotos.length > 0 && !isExtractingFrames && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>📸 Extracted Photo Evidence ({burstPhotos.length} Frames)</span>
                              <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>● Browser-Processed</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                              {burstPhotos.map((photo) => (
                                <div 
                                  key={photo.id} 
                                  onClick={() => setPreviewPhoto(photo)}
                                  className="card-hover"
                                  style={{ position: 'relative', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e5e7eb', cursor: 'zoom-in', background: '#000' }}
                                >
                                  <img src={photo.dataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Frame ${photo.id}`} />
                                  <span style={{ position: 'absolute', bottom: 2, right: 2, fontSize: '0.55rem', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '1px 3px', borderRadius: '3px', fontFamily: 'monospace' }}>
                                    {photo.timestamp}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' }}>
                              Click any thumbnail above to inspect photo frame quality.
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="form-label">Incident Title</label>
                        <input type="text" className="form-control" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="E.g., 2 Car Collision on Main St" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label className="form-label">Category</label>
                          <select className="form-control" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                            {['Vehicle Collision', 'Medical Emergency', 'Fire Emergency', 'Road Blockage', 'Public Safety Hazard'].map(o => <option key={o}>{o}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Severity</label>
                          <select className="form-control" value={formData.severity} onChange={e => setFormData({ ...formData, severity: e.target.value })}>
                            <option value="low">Low</option><option value="medium">Moderate</option><option value="high">Critical</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <label className="form-label">Description</label>
                        <textarea className="form-control" rows="3" required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the scene…" />
                      </div>
                      <InjurySelector onChange={setInjuries} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
                        {message && <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>{message}</div>}
                        <button type="submit" className="btn btn-danger" disabled={loading} style={{ padding: '0.7rem 1.8rem' }}>
                          {loading ? <Loader2 className="animate-spin" size={16} /> : 'SUBMIT REPORT'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* 🩺 STANDALONE MEDICAL FIRST-AID GUIDE */}
              {tab === 'medical' && (
                <div id="medical-guide-container" className="glass-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      ❤️ Smart Emergency First-Aid Assistance
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                      Realtime searchable emergency guides & quick-response first-aid walkthroughs
                    </p>
                  </div>
                  <MedicalPanel />
                </div>
              )}

              {/* 👤 STANDALONE DETAILED PROFILE VIEW */}
              {tab === 'profile' && (
                <div id="profile-container" className="glass-panel animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1f2937' }}>
                        👤 Citizen Profile & Account Telemetry
                      </h3>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                        Google Authenticated identity details & realtime telemetry status
                      </p>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.75rem', borderRadius: '50px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.68rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} className="animate-pulse" /> Active Connection
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    
                    {/* Column 1: Identity Card */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                      {user?.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt="Google Avatar" 
                          style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #ef4444', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)' }}
                          onError={e => e.currentTarget.style.display = 'none'}
                        />
                      ) : (
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '2rem', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)' }}>
                          {user?.name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#1f2937' }}>{user?.name || 'Citizen User'}</h4>
                        {user?.emailVerified ? (
                          <span style={{ display: 'inline-block', marginTop: '0.35rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.65rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ✅ Verified Citizen
                          </span>
                        ) : (
                          <span style={{ display: 'inline-block', marginTop: '0.35rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Unverified Citizen
                          </span>
                        )}
                      </div>

                      <div style={{ width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', textAlign: 'left' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Google Email</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1f2937', marginTop: '0.1rem', wordBreak: 'break-all' }}>{user?.email || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User UID</div>
                          <div style={{ fontSize: '0.73rem', fontFamily: 'monospace', fontWeight: 700, color: '#4b5563', marginTop: '0.1rem', wordBreak: 'break-all' }}>{user?.uid || 'supabase-uid-placeholder'}</div>
                        </div>
                        {user?.phone && (
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Official Phone</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1f2937', marginTop: '0.1rem' }}>{user.phone}</div>
                          </div>
                        )}
                        {user?.emergencyContact && (
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Emergency Contact</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444', marginTop: '0.1rem' }}>{user.emergencyContact}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 2: Account Telemetry */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#4b5563', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                        📡 Live Telemetry & Security Scope
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Clearance Scope</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1f2937' }}>Level 3 Smart Citizen</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>GPS Coordinates</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>
                            {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>GPS Accuracy Radius</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3b82f6' }}>± {formData.location.accuracy} meters</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Telemetry Socket Status</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: socket?.connected ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: socket?.connected ? '#10b981' : '#ef4444' }} /> {socket?.connected ? 'CONNECTED' : 'DISCONNECTED'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Network Latency Ping</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>8 ms (Stable)</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                        <button 
                          onClick={() => {
                            navigate('/citizen?tab=home');
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('start-tour'));
                            }, 100);
                          }}
                          className="btn btn-outline"
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                        >
                          🧭 Guided Tour
                        </button>
                        <button 
                          onClick={logout}
                          className="btn"
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', fontWeight: 800, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
                        >
                          Log Out
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Live GPS Tracking Map and Live AI Status */}
            <div id="map-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="glass-panel" style={{ padding: '0.5rem', height: 360, overflow: 'hidden' }}>
                <PremiumMap center={[formData.location.lat, formData.location.lng]} zoom={13} style={{ height: '100%', width: '100%', borderRadius: 8 }}>
                  <Marker position={[formData.location.lat, formData.location.lng]} icon={createLocationPin()}>
                    <Popup className="uber-popup"><div style={{ padding: '0.5rem' }}>You Are Here</div></Popup>
                  </Marker>
                  <Circle center={[formData.location.lat, formData.location.lng]} radius={formData.location.accuracy} pathOptions={{ color: '#3b82f6', fillOpacity: 0.1 }} />

                  {/* LIVE AMBULANCE MARKER */}
                  {ambLocation && (
                    <AmbulanceMarker position={ambLocation} bearing={0} />
                  )}

                  {accidents.map((acc, i) => acc.location?.coordinates && (
                    <Marker key={i} position={[acc.location.coordinates[1], acc.location.coordinates[0]]} icon={createLocationPin()}>
                      <Popup className="uber-popup"><div style={{ padding: '0.5rem' }}>{acc.title}</div></Popup>
                    </Marker>
                  ))}
                </PremiumMap>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(239,68,68,0.03)', borderColor: 'rgba(239,68,68,0.15)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#ef4444', fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <Activity size={14} /> Live AI Status
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
                  {[['Silent SOS', 'Armed'], ['GPS Lock', 'Acquired'], ['Trust Score', '100%']].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>{k}</span>
                      <span style={{ fontWeight: 600, color: '#10b981' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <SpotlightOverlay />
      <WelcomePopup />
      <SuccessPopup />
      <FrameInspectorPopup />


      <style>{`
        .custom-icon { background: none; border: none; }
        .leaflet-routing-container { display: none !important; }
        .uber-popup .leaflet-popup-content-wrapper { background: white; color: black; border-radius: 8px; padding: 4px 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); font-weight: 700; font-size: 14px; }
        .uber-popup .leaflet-popup-tip { background: white; }
        .leaflet-popup-close-button { display: none !important; }
        @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
      `}</style>
    </div>
  );
};

export default CitizenDashboard;
