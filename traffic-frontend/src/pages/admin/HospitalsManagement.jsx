import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import {
  Building2, Plus, Search, Eye, Edit2, Trash2, AlertTriangle,
  CheckCircle, XCircle, Activity, Users, Truck, Phone,
  MapPin, ChevronRight, RefreshCw, X, Ambulance
} from 'lucide-react';

// ─── Create Hospital Modal ────────────────────────────────────────────────────
const CreateHospitalModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: '', code: '', address: '', city: '', state: '',
    emergency_contact: '', hospital_type: 'general', ambulance_capacity: 5,
    email: '', admin_login_id: '', admin_password: 'Password@123',
  });
  const [friendlyLoginId, setFriendlyLoginId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') {
      // Add short timestamp suffix to guarantee uniqueness on retries
      const ts   = Date.now().toString(36).slice(-4).toUpperCase();
      const slug  = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-admin';
      const code  = value.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '').substring(0, 10) + '-' + ts;
      setFriendlyLoginId(slug);
      setForm(p => ({ ...p, name: value, admin_login_id: slug + '@hospital.local', code }));
    } else if (name === 'admin_login_id') {
      const slug = value.replace(/[^a-z0-9-]/g, '');
      setFriendlyLoginId(slug);
      setForm(p => ({ ...p, admin_login_id: slug + '@hospital.local' }));
    } else if (name === 'code') {
      setForm(p => ({ ...p, code: value.toUpperCase().replace(/[^A-Z0-9-]/g, '') }));
    } else {
      setForm(p => ({ ...p, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/hospitals', form);
      setCreated(res.data.data);
      onSuccess();
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors ? Object.values(errors).flat().join(', ') : (err.response?.data?.message || 'Failed to create hospital'));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.875rem',
  };
  const labelStyle = { display: 'block', marginBottom: '0.3rem', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };

  if (created) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '3rem', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <CheckCircle size={40} color="#fff" />
        </div>
        <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Hospital Created!</h3>
        <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>The hospital admin account has been generated.</p>
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', textAlign: 'left' }}>
          <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Generated Login Credentials</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Login Email:</span>
              <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem' }}>{created.admin_login_id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Password:</span>
              <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem' }}>{created.admin_password}</span>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.15)', borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.75rem', color: '#6ee7b7', lineHeight: 1.5 }}>
              ℹ️ Use this email to log in at the login page. Hospital staff can use their hospital-issued IDs.
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'linear-gradient(135deg, #ea580c, #ea580c)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.8rem 2rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
          Close & Continue
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2.5rem', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.25rem' }}>Register New Hospital</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Creates hospital + dedicated admin account</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '8px', padding: '0.5rem' }}><X size={20} /></button>
        </div>

        {/* Error shown BELOW header so visible at top of scrollable area */}
        {error && <div id="create-hospital-error" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span><span>{error}</span>
        </div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Hospital Name *</label>
              <input name="name" value={form.name} onChange={handleChange} style={inputStyle} placeholder="e.g. Amritsar Emergency Hospital" required />
            </div>
            <div>
              <label style={labelStyle}>Hospital Code *</label>
              <input name="code" value={form.code} onChange={handleChange} style={inputStyle} placeholder="e.g. AMR-HOSP-001" required />
            </div>
            <div>
              <label style={labelStyle}>Hospital Type *</label>
              <select name="hospital_type" value={form.hospital_type} onChange={handleChange} style={inputStyle}>
                <option value="general">General</option>
                <option value="trauma">Trauma Center</option>
                <option value="specialty">Specialty</option>
                <option value="clinic">Clinic</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Address *</label>
              <input name="address" value={form.address} onChange={handleChange} style={inputStyle} placeholder="Full address" required />
            </div>
            <div>
              <label style={labelStyle}>City *</label>
              <input name="city" value={form.city} onChange={handleChange} style={inputStyle} placeholder="City" required />
            </div>
            <div>
              <label style={labelStyle}>State *</label>
              <input name="state" value={form.state} onChange={handleChange} style={inputStyle} placeholder="State" required />
            </div>
            <div>
              <label style={labelStyle}>Emergency Contact *</label>
              <input name="emergency_contact" value={form.emergency_contact} onChange={handleChange} style={inputStyle} placeholder="+91-9000000000" required />
            </div>
            <div>
              <label style={labelStyle}>Ambulance Capacity *</label>
              <input name="ambulance_capacity" type="number" min="1" max="200" value={form.ambulance_capacity} onChange={handleChange} style={inputStyle} required />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Hospital Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} style={inputStyle} placeholder="hospital@domain.com" required />
            </div>
            <div style={{ gridColumn: '1/-1', background: 'rgba(234, 88, 12,0.08)', border: '1px solid rgba(234, 88, 12,0.2)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: '#60a5fa', fontSize: '0.75rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hospital Admin Account</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Admin Login ID *</label>
                  {/* Show friendly slug; @hospital.local is appended automatically */}
                  <input name="admin_login_id" value={friendlyLoginId} onChange={handleChange} style={inputStyle} placeholder="amritsar-hospital-admin" required />
                  <div style={{ fontSize: '0.7rem', color: '#60a5fa', marginTop: '0.3rem', fontFamily: 'monospace' }}>Login email: {friendlyLoginId || 'slug'}@hospital.local</div>
                </div>
                <div>
                  <label style={labelStyle}>Admin Password *</label>
                  <input name="admin_password" value={form.admin_password} onChange={handleChange} style={inputStyle} required />
                </div>
              </div>
            </div>
          </div>
          {/* Error also shown near submit button for visibility */}
          {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.85rem', marginTop: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span><span>{error}</span>
          </div>}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 2, background: loading ? 'rgba(234, 88, 12,0.5)' : 'linear-gradient(135deg, #ea580c, #c2410c)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.8rem', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.95rem', transition: 'all 0.2s' }}>
              {loading ? '⏳ Creating Hospital...' : '+ Create Hospital & Admin Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Hospital Management Page ───────────────────────────────────────────
const HospitalsManagement = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [hospitals, setHospitals] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setListError('');
    // Independent calls — overview failure never blocks the list
    try {
      const hosRes = await api.get('/hospitals');
      setHospitals(hosRes.data.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load hospitals';
      setListError(msg);
      console.error('Hospitals list error:', err.response?.data || err);
    }
    try {
      const ovRes = await api.get('/hospitals/overview');
      setOverview(ovRes.data.data);
    } catch (err) {
      console.error('Overview error:', err.response?.data || err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSuspend = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`${newStatus === 'suspended' ? 'Suspend' : 'Reactivate'} this hospital?`)) return;
    await api.put(`/hospitals/${id}`, { status: newStatus });
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this hospital and ALL associated data? This cannot be undone.')) return;
    await api.delete(`/hospitals/${id}`);
    fetchData();
  };

  const filtered = hospitals.filter(h =>
    h.name?.toLowerCase().includes(search.toLowerCase()) ||
    h.city?.toLowerCase().includes(search.toLowerCase()) ||
    h.code?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s) => s === 'active' ? '#10b981' : s === 'suspended' ? '#ef4444' : '#6b7280';
  const typeIcon = { general: '🏥', trauma: '🚑', specialty: '🔬', clinic: '💊' };

  return (
    <div className="fade-in" style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', minHeight: '100vh', padding: '2.5rem', color: '#0f172a' }}>
      {showCreate && <CreateHospitalModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); fetchData(); }} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(239,68,68,0.25)' }}>
              <Building2 size={22} color="#fff" />
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Hospital Management</h2>
          </div>
          <p style={{ color: '#475569', fontSize: '0.95rem', fontWeight: 500, margin: 0 }}>Centralized hospital ecosystem oversight & control</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={fetchData} style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', padding: '0.65rem 1.25rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.04)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(234, 88, 12, 0.3)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'} onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
            <Plus size={18} /> Register Hospital
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'TOTAL HOSPITALS', value: overview.total_hospitals, color: '#ea580c', icon: <Building2 size={20} /> },
            { label: 'ACTIVE HOSPITALS', value: overview.active_hospitals, color: '#10b981', icon: <CheckCircle size={20} /> },
            { label: 'TOTAL AMBULANCES', value: overview.total_ambulances, color: '#f59e0b', icon: <Truck size={20} /> },
            { label: 'AVAILABLE UNITS', value: overview.available_ambulances, color: '#10b981', icon: <Activity size={20} /> },
            { label: 'DISPATCHED', value: overview.dispatched_ambulances, color: '#ef4444', icon: <AlertTriangle size={20} /> },
            { label: 'HOSPITAL STAFF', value: overview.total_hospital_staff, color: '#8b5cf6', icon: <Users size={20} /> },
          ].map((stat) => (
            <div key={stat.label} style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '16px', padding: '1.25rem', borderLeft: `4px solid ${stat.color}`, backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{stat.label}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: stat.color }}>{stat.value ?? '—'}</div>
                </div>
                <div style={{ color: stat.color, opacity: 0.8 }}>{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search hospitals by name, city, code..."
            style={{ width: '100%', paddingLeft: '2.75rem', background: 'rgba(255, 255, 255, 0.85)', border: '1px solid rgba(15, 23, 42, 0.1)', color: '#0f172a', padding: '0.8rem 1rem 0.8rem 2.75rem', borderRadius: '14px', fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}
          />
        </div>
      </div>

      {/* API Error Banner */}
      {listError && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', color: '#b91c1c', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div><strong>API Error:</strong> {listError} — <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 'inherit' }}>Retry</button></div>
        </div>
      )}

      {/* Hospitals Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
          <Activity size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <div>Loading hospital network...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
          {filtered.map((hospital) => (
            <div key={hospital._id} style={{ background: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(15, 23, 42, 0.06)', borderRadius: '24px', padding: '1.8rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', backdropFilter: 'blur(16px)', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ea580c'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(234, 88, 12, 0.12)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.06)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(15, 23, 42, 0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div>
                {/* Hospital Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '2.2rem', lineHeight: 1, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }}>{typeIcon[hospital.hospital_type] || '🏥'}</div>
                    <div>
                      <div style={{ color: '#0f172a', fontWeight: 900, fontSize: '1.15rem', lineHeight: 1.3, marginBottom: '0.25rem', letterSpacing: '-0.3px' }}>{hospital.name}</div>
                      <div style={{ color: '#ea580c', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px' }}>{hospital.code}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', borderRadius: '50px', background: `${statusColor(hospital.status)}12`, border: `1px solid ${statusColor(hospital.status)}30`, fontSize: '0.7rem', fontWeight: 800, color: statusColor(hospital.status), letterSpacing: '0.5px' }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: statusColor(hospital.status) }}></span> {hospital.status?.toUpperCase()}
                  </div>
                </div>

                {/* Location */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.85rem', marginBottom: '1.25rem', fontWeight: 500 }}>
                  <MapPin size={14} color="#64748b" />
                  {hospital.city}, {hospital.state}
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'STAFF', value: hospital.staff_count ?? 0, color: '#6d28d9', bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.18)' },
                    { label: 'AMBULANCES', value: hospital.ambulance_count ?? 0, color: '#b45309', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.18)' },
                    { label: 'AVAILABLE', value: hospital.available_ambulances ?? 0, color: '#047857', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.18)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '12px', padding: '0.75rem 0.5rem', textAlign: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '1.55rem', fontWeight: 900, color: s.color, lineHeight: 1.1, marginBottom: '0.2rem' }}>{s.value}</div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800, letterSpacing: '0.08em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Admin Credentials */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.1rem', marginBottom: '1.5rem', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1rem' }}>🔑</span> Admin Credentials
                  </div>
                  {/* Login ID */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '0.25rem' }}>LOGIN EMAIL</div>
                    <div style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, wordBreak: 'break-all', background: '#ffffff', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>{hospital.admin_login_id}</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '0.25rem' }}>PASSWORD</div>
                    <div style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, background: '#ffffff', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>{hospital.admin_password_hint || 'Password@123'}</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: 'auto' }}>
                <button onClick={() => navigate(`/hospitals/${hospital.id || hospital._id}`)} style={{ flex: 1, background: 'linear-gradient(135deg, #ea580c, #c2410c)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.7rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'} onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
                  <Eye size={15} /> View Details
                </button>
                <button onClick={() => handleSuspend(hospital.id || hospital._id, hospital.status)} style={{ background: hospital.status === 'active' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${hospital.status === 'active' ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`, color: hospital.status === 'active' ? '#b45309' : '#047857', borderRadius: '10px', padding: '0.7rem 0.9rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = hospital.status === 'active' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)'} onMouseLeave={e => e.currentTarget.style.background = hospital.status === 'active' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'}>
                  {hospital.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
                <button onClick={() => handleDelete(hospital.id || hospital._id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '10px', padding: '0.7rem 0.9rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', color: '#64748b' }}>
              <Building2 size={48} style={{ opacity: 0.15, marginBottom: '1rem' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No hospitals found</div>
              <div style={{ fontSize: '0.85rem' }}>Create your first hospital using the button above</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HospitalsManagement;
