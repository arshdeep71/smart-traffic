import React, { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { Activity, Truck, Users, AlertTriangle, CheckCircle, Clock, Building2, Plus, Edit2, Trash2, X, Phone } from 'lucide-react';

const sc = s => ({ available: '#10b981', dispatched: '#ef4444', maintenance: '#f59e0b', offline: '#6b7280', emergency_active: '#ef4444', on_duty: '#10b981', off_duty: '#6b7280', on_break: '#f59e0b', active: '#10b981', suspended: '#ef4444' })[s] || '#64748b';

const AddEmployeeModal = ({ hospitalId, onClose, onSuccess }) => {
  const [form, setForm] = useState({ full_name: '', role: 'ambulance_driver', phone: '', department: '', login_id: '', password: 'Password@123' });
  const [friendlyLogin, setFriendlyLogin] = useState('');
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(null);
  const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.875rem' };
  const lbl = { display: 'block', marginBottom: '0.3rem', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' };
  const hc = e => {
    const { name, value } = e.target;
    if (name === 'full_name') {
      const slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setFriendlyLogin(slug);
      setForm(p => ({ ...p, full_name: value, login_id: slug + '@hospital.local' }));
    } else if (name === 'login_id') {
      const slug = value.replace(/[^a-z0-9-]/g, '');
      setFriendlyLogin(slug);
      setForm(p => ({ ...p, login_id: slug + '@hospital.local' }));
    } else {
      setForm(p => ({ ...p, [name]: value }));
    }
  };
  const sub = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try { const r = await api.post(`/hospital-admin/hospital/${hospitalId}/employees`, form); setDone(r.data.data); onSuccess(); }
    catch (err) { setError(err.response?.data?.message || JSON.stringify(err.response?.data?.errors) || 'Failed to create employee'); }
    finally { setLoading(false); }
  };
  if (done) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'linear-gradient(135deg,#0f2027,#203a43)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2.5rem', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
        <CheckCircle size={48} color="#10b981" style={{ marginBottom: '1rem' }} /><h3 style={{ color: '#fff', marginBottom: '1rem' }}>Employee Created!</h3>
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '1rem', textAlign: 'left', marginBottom: '1.5rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Employee ID: <span style={{ color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>{done.employee_id}</span></div>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Login Email: <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>{done.login_id}</span></div>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Password: <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>{form.password}</span></div>
        </div>
        <button onClick={onClose} style={{ background: 'linear-gradient(135deg,#ea580c,#ea580c)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.7rem 2rem', fontWeight: 700, cursor: 'pointer' }}>Close</button>
      </div>
    </div>
  );
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(135deg,#0f2027,#203a43)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2rem', maxWidth: '550px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}><h3 style={{ color: '#fff', margin: 0 }}>Add Staff Member</h3><button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '8px', padding: '0.4rem' }}><X size={18} /></button></div>
        {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '0.7rem', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '1rem' }}>⚠️ {error}</div>}
        <form onSubmit={sub}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Full Name *</label><input name="full_name" value={form.full_name} onChange={hc} style={inp} required /></div>
          <div><label style={lbl}>Role *</label><select name="role" value={form.role} onChange={hc} style={inp}><option value="ambulance_driver">Ambulance Driver</option><option value="emergency_responder">Emergency Responder</option><option value="hospital_operator">Operator</option><option value="paramedic">Paramedic</option><option value="medical_staff">Medical Staff</option></select></div>
          <div><label style={lbl}>Department *</label><input name="department" value={form.department} onChange={hc} style={inp} placeholder="Emergency" required /></div>
          <div><label style={lbl}>Phone *</label><input name="phone" value={form.phone} onChange={hc} style={inp} placeholder="+91-9000000000" required /></div>
          <div><label style={lbl}>Login ID (slug) *</label><input name="login_id" value={friendlyLogin} onChange={hc} style={inp} placeholder="amritsar-driver-01" required /><div style={{ fontSize: '0.7rem', color: '#60a5fa', marginTop: '0.25rem', fontFamily: 'monospace' }}>Email: {friendlyLogin || 'slug'}@hospital.local</div></div>
          <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Password *</label><input name="password" value={form.password} onChange={hc} style={inp} required /></div>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '0.7rem', color: '#fca5a5', fontSize: '0.8rem', marginTop: '1rem' }}>⚠️ {error}</div>}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button type="button" onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ flex: 2, background: loading ? 'rgba(139,92,246,0.5)' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.7rem', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700 }}>{loading ? '⏳ Creating...' : 'Create Employee'}</button>
        </div></form>
      </div>
    </div>
  );
};

const HospitalAdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [dash, setDash] = useState(null);
  const [staff, setStaff] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [tab, setTab] = useState('dashboard');
  const [showAdd, setShowAdd] = useState(false);
  const hospitalId = user?.hospital_id;

  const fetchAll = async () => {
    if (!hospitalId) return;
    try {
      const [dRes, sRes, aRes] = await Promise.all([
        api.get(`/hospital-admin/hospital/${hospitalId}/dashboard`),
        api.get(`/hospital-admin/hospital/${hospitalId}/employees`),
        api.get(`/hospital-admin/hospital/${hospitalId}/ambulances`),
      ]);
      setDash(dRes.data.data);
      setStaff(sRes.data.data || []);
      setAmbulances(aRes.data.data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchAll(); }, [hospitalId]);

  const updateAmbStatus = async (aid, status) => { await api.put(`/hospital-admin/hospital/${hospitalId}/ambulances/${aid}`, { status }); fetchAll(); };
  const deleteEmployee = async eid => { if (!window.confirm('Delete?')) return; await api.delete(`/hospital-admin/hospital/${hospitalId}/employees/${eid}`); fetchAll(); };

  const panelStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.5rem' };
  const tabBtnStyle = t => ({ background: tab === t ? 'rgba(239,68,68,0.2)' : 'transparent', border: tab === t ? '1px solid rgba(239,68,68,0.4)' : '1px solid transparent', color: tab === t ? '#f87171' : '#64748b', padding: '0.5rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' });

  return (
    <div className="fade-in" style={{ background: 'linear-gradient(135deg,#050b14,#0a1628)', minHeight: '100vh', padding: '2rem', color: '#e2e8f0' }}>
      {showAdd && hospitalId && <AddEmployeeModal hospitalId={hospitalId} onClose={() => setShowAdd(false)} onSuccess={fetchAll} />}

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg,#ef4444,#dc2626)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={22} color="#fff" /></div>
          <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '1.6rem', margin: 0 }}>Hospital Command Center</h2>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{dash?.hospital?.name || 'Loading...'} · Emergency Operations Dashboard</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['dashboard', 'staff', 'ambulances'].map(t => <button key={t} style={tabBtnStyle(t)} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
      </div>

      {/* Dashboard Tab */}
      {tab === 'dashboard' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'AVAILABLE AMBULANCES', value: dash?.available_ambulances ?? '—', color: '#10b981', icon: <Truck size={20} /> },
              { label: 'DISPATCHED', value: dash?.dispatched_ambulances ?? '—', color: '#ef4444', icon: <AlertTriangle size={20} /> },
              { label: 'TOTAL STAFF', value: dash?.total_staff ?? '—', color: '#8b5cf6', icon: <Users size={20} /> },
              { label: 'ON DUTY', value: dash?.on_duty_staff ?? '—', color: '#f59e0b', icon: <Activity size={20} /> },
              { label: 'AVG RESPONSE', value: dash?.avg_response_time ?? '—', color: '#ea580c', icon: <Clock size={20} /> },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.color}20`, borderLeft: `3px solid ${s.color}`, borderRadius: '14px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div><div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{s.label}</div><div style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color }}>{s.value}</div></div>
                  <div style={{ color: s.color, opacity: 0.7 }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Status Row */}
          <div style={panelStyle}>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>Live Ambulance Fleet</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '0.75rem' }}>
              {ambulances.map(amb => (
                <div key={amb._id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${sc(amb.status)}25`, borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem' }}>{amb.ambulance_id}</span>
                    <span style={{ color: sc(amb.status), fontSize: '0.7rem', fontWeight: 700 }}>● {amb.status}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{amb.plate_number} · Fuel: {amb.fuel_level}%</div>
                </div>
              ))}
              {!ambulances.length && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#64748b', padding: '2rem' }}>No ambulances registered.</div>}
            </div>
          </div>
        </>
      )}

      {/* Staff Tab */}
      {tab === 'staff' && (
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#fff', margin: 0, fontWeight: 700 }}>Staff Management ({staff.length})</h3>
            <button onClick={() => setShowAdd(true)} style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><Plus size={16} /> Add Staff</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{['Name', 'Role', 'Employee ID', 'Login ID', 'Phone', 'Shift', 'Actions'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
              <tbody>{staff.map(emp => (
                <tr key={emp._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem', color: '#e2e8f0', fontWeight: 600 }}>{emp.full_name}</td>
                  <td style={{ padding: '0.75rem' }}><span style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>{emp.role?.replace(/_/g, ' ')}</span></td>
                  <td style={{ padding: '0.75rem', color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.78rem' }}>{emp.employee_id}</td>
                  <td style={{ padding: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.78rem' }}>{emp.login_id}</td>
                  <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{emp.phone}</td>
                  <td style={{ padding: '0.75rem' }}><span style={{ color: sc(emp.shift_status), fontWeight: 600, fontSize: '0.75rem' }}>● {emp.shift_status?.replace(/_/g, ' ')}</span></td>
                  <td style={{ padding: '0.75rem' }}><button onClick={() => deleteEmployee(emp._id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem' }}>Delete</button></td>
                </tr>
              ))}</tbody>
            </table>
            {!staff.length && <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}><Users size={32} style={{ opacity: 0.15, marginBottom: '0.5rem' }} /><div>No staff yet. Add your first team member.</div></div>}
          </div>
        </div>
      )}

      {/* Ambulances Tab */}
      {tab === 'ambulances' && (
        <div style={panelStyle}>
          <h3 style={{ color: '#fff', marginBottom: '1.5rem', fontWeight: 700 }}>Ambulance Fleet ({ambulances.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem' }}>
            {ambulances.map(amb => (
              <div key={amb._id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${sc(amb.status)}30`, borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 800, fontFamily: 'monospace' }}>{amb.ambulance_id}</span>
                  <span style={{ color: sc(amb.status), background: `${sc(amb.status)}20`, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700 }}>● {amb.status}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>{amb.plate_number} · Fuel: {amb.fuel_level}% · GPS: {amb.gps_status}</div>
                <select onChange={e => updateAmbStatus(amb._id, e.target.value)} value={amb.status} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '8px', padding: '0.45rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                  {['available', 'dispatched', 'maintenance', 'offline', 'emergency_active'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))}
            {!ambulances.length && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#64748b' }}><Truck size={32} style={{ opacity: 0.15, marginBottom: '0.5rem' }} /><div>No ambulances registered.</div></div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalAdminDashboard;
