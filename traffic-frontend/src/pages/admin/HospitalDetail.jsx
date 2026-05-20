import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Building2, Users, Truck, ArrowLeft, Plus, Edit2, Trash2, RefreshCw, Phone, Activity, CheckCircle, AlertTriangle, X } from 'lucide-react';

const AddEmployeeModal = ({ hospitalId, onClose, onSuccess }) => {
  const [form, setForm] = useState({ full_name: '', role: 'ambulance_driver', phone: '', department: '', login_id: '', password: 'Password@123' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.875rem' };
  const lbl = { display: 'block', marginBottom: '0.3rem', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' };
  const handleChange = e => { const { name, value } = e.target; setForm(p => ({ ...p, [name]: value })); if (name === 'full_name') setForm(p => ({ ...p, full_name: value, login_id: value.toLowerCase().replace(/\s+/g, '-') + '-01' })); };
  const handleSubmit = async e => { e.preventDefault(); setLoading(true); setError(''); try { const res = await api.post(`/hospitals/${hospitalId}/employees`, form); setCreated(res.data.data); onSuccess(); } catch (err) { setError(err.response?.data?.message || 'Failed'); } finally { setLoading(false); } };
  if (created) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'linear-gradient(135deg,#0f2027,#203a43)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2.5rem', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
        <CheckCircle size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
        <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Employee Created!</h3>
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '1rem', margin: '1rem 0', textAlign: 'left' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Login ID: <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>{created.login_id}</span></div>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Password: <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>{created.admin_password || form.password}</span></div>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.5rem' }}>Employee ID: <span style={{ color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>{created.employee_id}</span></div>
        </div>
        <button onClick={onClose} style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.7rem 2rem', fontWeight: 700, cursor: 'pointer' }}>Close</button>
      </div>
    </div>
  );
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(135deg,#0f2027,#203a43)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2rem', maxWidth: '550px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>Add Hospital Employee</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '8px', padding: '0.4rem' }}><X size={18} /></button>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '0.7rem', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Full Name *</label><input name="full_name" value={form.full_name} onChange={handleChange} style={inp} required /></div>
            <div><label style={lbl}>Role *</label><select name="role" value={form.role} onChange={handleChange} style={inp}><option value="ambulance_driver">Ambulance Driver</option><option value="emergency_responder">Emergency Responder</option><option value="hospital_operator">Hospital Operator</option><option value="paramedic">Paramedic</option><option value="medical_staff">Medical Staff</option></select></div>
            <div><label style={lbl}>Department *</label><input name="department" value={form.department} onChange={handleChange} style={inp} placeholder="e.g. Emergency" required /></div>
            <div><label style={lbl}>Phone *</label><input name="phone" value={form.phone} onChange={handleChange} style={inp} placeholder="+91-9000000000" required /></div>
            <div><label style={lbl}>Login ID *</label><input name="login_id" value={form.login_id} onChange={handleChange} style={inp} placeholder="amritsar-driver-01" required /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Password *</label><input name="password" value={form.password} onChange={handleChange} style={inp} required /></div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 2, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.7rem', cursor: 'pointer', fontWeight: 700 }}>{loading ? 'Creating...' : 'Create Employee'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddAmbulanceModal = ({ hospitalId, onClose, onSuccess }) => {
  const [form, setForm] = useState({ plate_number: '', fuel_level: 100 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inp = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.875rem' };
  const lbl = { display: 'block', marginBottom: '0.3rem', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' };
  const handleSubmit = async e => { e.preventDefault(); setLoading(true); setError(''); try { await api.post(`/hospitals/${hospitalId}/ambulances`, form); onSuccess(); onClose(); } catch (err) { setError(err.response?.data?.message || 'Failed'); } finally { setLoading(false); } };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'linear-gradient(135deg,#0f2027,#203a43)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2rem', maxWidth: '420px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>Add Ambulance</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '8px', padding: '0.4rem' }}><X size={18} /></button>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '0.7rem', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><label style={lbl}>Plate Number *</label><input name="plate_number" value={form.plate_number} onChange={e => setForm(p => ({ ...p, plate_number: e.target.value }))} style={inp} placeholder="PB-10-1234" required /></div>
            <div><label style={lbl}>Fuel Level (%)</label><input type="number" min="0" max="100" value={form.fuel_level} onChange={e => setForm(p => ({ ...p, fuel_level: e.target.value }))} style={inp} /></div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 2, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.7rem', cursor: 'pointer', fontWeight: 700 }}>{loading ? 'Adding...' : 'Add Ambulance'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const statusColor = s => ({ available: '#10b981', dispatched: '#ef4444', maintenance: '#f59e0b', offline: '#6b7280', emergency_active: '#ef4444', on_duty: '#10b981', off_duty: '#6b7280', on_break: '#f59e0b', active: '#10b981', suspended: '#ef4444' })[s] || '#6b7280';

const HospitalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [tab, setTab] = useState('overview');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAddAmbulance, setShowAddAmbulance] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await api.get(`/hospitals/${id}`);
      setHospital(res.data.data);
    } catch (err) {
      const msg = err.response?.status === 404
        ? `Hospital ID "${id}" not found in database.`
        : (err.response?.data?.message || err.message || 'Failed to load hospital — check backend logs.');
      setFetchError(msg);
      console.error('HospitalDetail error:', err.response?.data || err);
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, [id]);

  const deleteEmployee = async eid => { if (!window.confirm('Delete employee?')) return; await api.delete(`/hospitals/${id}/employees/${eid}`); fetchData(); };
  const deleteAmbulance = async aid => { if (!window.confirm('Remove ambulance?')) return; await api.delete(`/hospitals/${id}/ambulances/${aid}`); fetchData(); };
  const updateAmbulanceStatus = async (aid, status) => { await api.put(`/hospitals/${id}/ambulances/${aid}`, { status }); fetchData(); };

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050b14', color: '#64748b' }}><Activity size={32} style={{ marginRight: '1rem', opacity: 0.4 }} />Loading hospital data...</div>;
  if (fetchError || !hospital) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050b14', padding: '2rem', gap: '1rem' }}>
      <AlertTriangle size={48} color="#ef4444" style={{ opacity: 0.5 }} />
      <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>Could Not Load Hospital</div>
      <div style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '500px', textAlign: 'center' }}>{fetchError || 'Hospital data not found.'}</div>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
        <button onClick={() => navigate('/hospitals')} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer' }}>← Back to Hospitals</button>
        <button onClick={fetchData} style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
      </div>
    </div>
  );

  const panelStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.5rem' };
  const tabBtnStyle = (t) => ({ background: tab === t ? 'rgba(59,130,246,0.2)' : 'transparent', border: tab === t ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent', color: tab === t ? '#60a5fa' : '#64748b', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' });

  return (
    <div className="fade-in" style={{ background: 'linear-gradient(135deg,#050b14,#0a1628)', minHeight: '100vh', padding: '2rem', color: '#e2e8f0' }}>
      {showAddEmployee && <AddEmployeeModal hospitalId={id} onClose={() => setShowAddEmployee(false)} onSuccess={fetchData} />}
      {showAddAmbulance && <AddAmbulanceModal hospitalId={id} onClose={() => setShowAddAmbulance(false)} onSuccess={fetchData} />}

      {/* Back + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', padding: '0.6rem', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ArrowLeft size={20} /></button>
        <div>
          <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '1.6rem', margin: 0 }}>{hospital.name}</h2>
          <div style={{ color: '#64748b', fontSize: '0.8rem', fontFamily: 'monospace' }}>{hospital.code} · {hospital.city}, {hospital.state}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', borderRadius: '20px', background: `${statusColor(hospital.status)}20`, border: `1px solid ${statusColor(hospital.status)}40`, color: statusColor(hospital.status), fontSize: '0.75rem', fontWeight: 700 }}>● {hospital.status?.toUpperCase()}</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['overview', 'staff', 'ambulances'].map(t => <button key={t} style={tabBtnStyle(t)} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={panelStyle}>
            <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1rem', fontWeight: 700 }}>Hospital Information</h3>
            {[['Type', hospital.hospital_type], ['Address', hospital.address], ['City', hospital.city], ['State', hospital.state], ['Emergency Contact', hospital.emergency_contact], ['Email', hospital.email], ['Ambulance Capacity', hospital.ambulance_capacity]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>{k}</span><span style={{ color: '#e2e8f0', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={panelStyle}>
            <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1rem', fontWeight: 700 }}>Admin Account</h3>
            {[['Login Email', hospital.admin_login_id], ['Password', hospital.admin_password_hint || 'Password@123'], ['Name', hospital.admin?.name], ['Status', hospital.admin?.status]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>{k}</span>
                <span style={{ color: k === 'Password' ? '#fbbf24' : '#60a5fa', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.82rem' }}>{v || '—'}</span>
              </div>
            ))}
            <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[{ label: 'TOTAL STAFF', value: hospital.staff?.length || 0, color: '#8b5cf6' }, { label: 'AMBULANCES', value: hospital.ambulances?.length || 0, color: '#f59e0b' }].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Staff Tab */}
      {tab === 'staff' && (
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#fff', margin: 0, fontWeight: 700 }}>Hospital Staff ({hospital.staff?.length || 0})</h3>
            <button onClick={() => setShowAddEmployee(true)} style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><Plus size={16} /> Add Employee</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{['Employee', 'Role', 'Employee ID', 'Login ID', 'Phone', 'Shift', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>)}</tr></thead>
              <tbody>{(hospital.staff || []).map(emp => (
                <tr key={emp._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem', color: '#e2e8f0', fontWeight: 600 }}>{emp.full_name}</td>
                  <td style={{ padding: '0.75rem' }}><span style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>{emp.role?.replace(/_/g, ' ')}</span></td>
                  <td style={{ padding: '0.75rem', color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.8rem' }}>{emp.employee_id}</td>
                  <td style={{ padding: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.8rem' }}>{emp.login_id}</td>
                  <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{emp.phone}</td>
                  <td style={{ padding: '0.75rem' }}><span style={{ color: statusColor(emp.shift_status), fontWeight: 600, fontSize: '0.75rem' }}>● {emp.shift_status?.replace(/_/g, ' ')}</span></td>
                  <td style={{ padding: '0.75rem' }}><span style={{ color: statusColor(emp.account_status), fontWeight: 600, fontSize: '0.75rem' }}>● {emp.account_status}</span></td>
                  <td style={{ padding: '0.75rem' }}><button onClick={() => deleteEmployee(emp._id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem' }}>Delete</button></td>
                </tr>
              ))}</tbody>
            </table>
            {!hospital.staff?.length && <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}><Users size={32} style={{ opacity: 0.15, marginBottom: '0.5rem' }} /><div>No staff members yet.</div></div>}
          </div>
        </div>
      )}

      {/* Ambulances Tab */}
      {tab === 'ambulances' && (
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#fff', margin: 0, fontWeight: 700 }}>Ambulances ({hospital.ambulances?.length || 0})</h3>
            <button onClick={() => setShowAddAmbulance(true)} style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><Plus size={16} /> Add Ambulance</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem' }}>
            {(hospital.ambulances || []).map(amb => (
              <div key={amb._id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${statusColor(amb.status)}30`, borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ color: '#f59e0b', fontWeight: 800, fontSize: '1rem', fontFamily: 'monospace' }}>{amb.ambulance_id}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{amb.plate_number}</div>
                  </div>
                  <span style={{ color: statusColor(amb.status), background: `${statusColor(amb.status)}20`, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, border: `1px solid ${statusColor(amb.status)}40` }}>● {amb.status}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '0.4rem 0.6rem' }}><div style={{ color: '#64748b' }}>GPS</div><div style={{ color: '#10b981', fontWeight: 700 }}>{amb.gps_status}</div></div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '0.4rem 0.6rem' }}><div style={{ color: '#64748b' }}>Fuel</div><div style={{ color: amb.fuel_level > 50 ? '#10b981' : '#ef4444', fontWeight: 700 }}>{amb.fuel_level}%</div></div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select onChange={e => updateAmbulanceStatus(amb._id, e.target.value)} value={amb.status} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px', padding: '0.35rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                    {['available', 'dispatched', 'maintenance', 'offline', 'emergency_active'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => deleteAmbulance(amb._id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '6px', padding: '0.35rem 0.6rem', cursor: 'pointer' }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {!hospital.ambulances?.length && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#64748b' }}><Truck size={32} style={{ opacity: 0.15, marginBottom: '0.5rem' }} /><div>No ambulances registered yet.</div></div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalDetail;
