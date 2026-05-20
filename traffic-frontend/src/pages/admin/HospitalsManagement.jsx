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
        <button onClick={onClose} style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.8rem 2rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
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
            <div style={{ gridColumn: '1/-1', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '1.25rem' }}>
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
            <button type="submit" disabled={loading} style={{ flex: 2, background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.8rem', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.95rem', transition: 'all 0.2s' }}>
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
    <div className="fade-in" style={{ background: 'linear-gradient(135deg, #050b14 0%, #0a1628 100%)', minHeight: '100vh', padding: '2rem', color: '#e2e8f0' }}>
      {showCreate && <CreateHospitalModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); fetchData(); }} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={22} color="#fff" />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>Hospital Management</h2>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Centralized hospital ecosystem oversight & control</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={fetchData} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', padding: '0.6rem 1rem', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}>
            <Plus size={18} /> Register Hospital
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'TOTAL HOSPITALS', value: overview.total_hospitals, color: '#3b82f6', icon: <Building2 size={20} /> },
            { label: 'ACTIVE HOSPITALS', value: overview.active_hospitals, color: '#10b981', icon: <CheckCircle size={20} /> },
            { label: 'TOTAL AMBULANCES', value: overview.total_ambulances, color: '#f59e0b', icon: <Truck size={20} /> },
            { label: 'AVAILABLE UNITS', value: overview.available_ambulances, color: '#10b981', icon: <Activity size={20} /> },
            { label: 'DISPATCHED', value: overview.dispatched_ambulances, color: '#ef4444', icon: <AlertTriangle size={20} /> },
            { label: 'HOSPITAL STAFF', value: overview.total_hospital_staff, color: '#8b5cf6', icon: <Users size={20} /> },
          ].map((stat) => (
            <div key={stat.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', borderLeft: `3px solid ${stat.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{stat.label}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: stat.color }}>{stat.value ?? '—'}</div>
                </div>
                <div style={{ color: stat.color, opacity: 0.7 }}>{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search hospitals by name, city, code..."
            style={{ width: '100%', paddingLeft: '2.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', padding: '0.7rem 0.8rem 0.7rem 2.5rem', borderRadius: '10px', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {/* API Error Banner */}
      {listError && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', color: '#fca5a5', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div><strong>API Error:</strong> {listError} — <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 'inherit' }}>Retry</button></div>
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
            <div key={hospital._id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.75rem', transition: 'all 0.3s ease', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.background = 'rgba(59,130,246,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              {/* Hospital Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '2rem', lineHeight: 1 }}>{typeIcon[hospital.hospital_type] || '🏥'}</div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.3, marginBottom: '0.2rem' }}>{hospital.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>{hospital.code}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.75rem', borderRadius: '20px', background: `${statusColor(hospital.status)}20`, border: `1px solid ${statusColor(hospital.status)}40`, fontSize: '0.7rem', fontWeight: 700, color: statusColor(hospital.status) }}>
                  <span>●</span> {hospital.status?.toUpperCase()}
                </div>
              </div>

              {/* Location */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem' }}>
                <MapPin size={14} />
                {hospital.city}, {hospital.state}
              </div>

              {/* Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'STAFF', value: hospital.staff_count ?? 0, color: '#8b5cf6' },
                  { label: 'AMBULANCES', value: hospital.ambulance_count ?? 0, color: '#f59e0b' },
                  { label: 'AVAILABLE', value: hospital.available_ambulances ?? 0, color: '#10b981' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Admin Credentials */}
              <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.65rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>🔑 Admin Credentials</div>
                {/* Login ID — stacked so full email is always visible */}
                <div style={{ marginBottom: '0.4rem' }}>
                  <div style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: '0.15rem' }}>LOGIN EMAIL</div>
                  <div style={{ color: '#93c5fd', fontFamily: 'monospace', fontSize: '0.73rem', fontWeight: 700, wordBreak: 'break-all' }}>{hospital.admin_login_id}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: '0.15rem' }}>PASSWORD</div>
                  <div style={{ color: '#fcd34d', fontFamily: 'monospace', fontSize: '0.73rem', fontWeight: 700 }}>{hospital.admin_password_hint || 'Password@123'}</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => navigate(`/hospitals/${hospital.id || hospital._id}`)} style={{ flex: 1, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.55rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Eye size={15} /> View Details
                </button>
                <button onClick={() => handleSuspend(hospital.id || hospital._id, hospital.status)} style={{ background: hospital.status === 'active' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', border: `1px solid ${hospital.status === 'active' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`, color: hospital.status === 'active' ? '#f59e0b' : '#10b981', borderRadius: '8px', padding: '0.55rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  {hospital.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
                <button onClick={() => handleDelete(hospital.id || hospital._id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', borderRadius: '8px', padding: '0.55rem 0.75rem', cursor: 'pointer' }}>
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
