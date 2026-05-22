import React, { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { Truck, Activity, Clock, MapPin, Phone, Building2, CheckCircle, AlertTriangle } from 'lucide-react';
import AmbulanceDashboard from '../ambulance/AmbulanceDashboard';

const sc = s => ({ available: '#10b981', dispatched: '#ef4444', maintenance: '#f59e0b', offline: '#6b7280', emergency_active: '#ef4444', on_duty: '#10b981', off_duty: '#6b7280', on_break: '#f59e0b' })[s] || '#64748b';

const HospitalEmployeePortal = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    try { const res = await api.get('/hospital/me'); setData(res.data.data); } 
    catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (field, value) => {
    setUpdating(true);
    try { await api.put('/hospital/me/status', { [field]: value }); fetchData(); } 
    catch (err) { console.error(err); } 
    finally { setUpdating(false); }
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#050b14,#0a1628)', color: '#64748b' }}>
      <Activity size={32} style={{ marginRight: '1rem', opacity: 0.4 }} /> Loading portal...
    </div>
  );

  const { employee, hospital, ambulance } = data || {};
  const panelStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.5rem' };

  return (
    <div className="fade-in" style={{ background: 'linear-gradient(135deg,#050b14,#0a1628)', minHeight: '100vh', padding: '2rem', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg,#ef4444,#dc2626)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>{user?.name?.charAt(0)}</div>
          <div>
            <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>{user?.name}</h2>
            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{employee?.role?.replace(/_/g, ' ')} · {employee?.employee_id}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 1rem', borderRadius: '20px', background: `${sc(employee?.shift_status)}20`, border: `1px solid ${sc(employee?.shift_status)}40`, color: sc(employee?.shift_status), fontWeight: 700, fontSize: '0.8rem' }}>
            ● {employee?.shift_status?.replace(/_/g, ' ')?.toUpperCase() || 'UNKNOWN'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Identity Card */}
        <div style={panelStyle}>
          <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={18} color="#10b981" /> Employee Identity</h3>
          {[['Employee ID', employee?.employee_id], ['Department', employee?.department], ['Phone', employee?.phone], ['Login ID', employee?.login_id]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>{k}</span><span style={{ color: '#60a5fa', fontFamily: 'monospace', fontWeight: 600 }}>{v || '—'}</span>
            </div>
          ))}
        </div>

        {/* Hospital Info */}
        <div style={panelStyle}>
          <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={18} color="#ea580c" /> Assigned Hospital</h3>
          {[['Hospital', hospital?.name], ['Code', hospital?.code], ['City', hospital?.city], ['Emergency', hospital?.emergency_contact]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>{k}</span><span style={{ color: '#e2e8f0', fontWeight: 500 }}>{v || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={panelStyle}>
          <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>Shift Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
            {['on_duty', 'off_duty', 'on_break'].map(s => (
              <button key={s} onClick={() => updateStatus('shift_status', s)} disabled={updating} style={{ padding: '0.7rem 0.5rem', borderRadius: '10px', border: employee?.shift_status === s ? `2px solid ${sc(s)}` : '2px solid rgba(255,255,255,0.1)', background: employee?.shift_status === s ? `${sc(s)}20` : 'rgba(255,255,255,0.04)', color: employee?.shift_status === s ? sc(s) : '#64748b', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s' }}>
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        <div style={panelStyle}>
          <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>Operational Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
            {['available', 'dispatched', 'offline'].map(s => (
              <button key={s} onClick={() => updateStatus('operational_status', s)} disabled={updating} style={{ padding: '0.7rem 0.5rem', borderRadius: '10px', border: employee?.operational_status === s ? `2px solid ${sc(s)}` : '2px solid rgba(255,255,255,0.1)', background: employee?.operational_status === s ? `${sc(s)}20` : 'rgba(255,255,255,0.04)', color: employee?.operational_status === s ? sc(s) : '#64748b', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assigned Ambulance */}
      {ambulance && (
        <div style={{ ...panelStyle, borderLeft: `3px solid #f59e0b`, marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Truck size={18} color="#f59e0b" /> Assigned Ambulance</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem' }}>
            {[['Unit ID', ambulance.ambulance_id], ['Plate', ambulance.plate_number], ['Status', ambulance.status], ['Fuel', `${ambulance.fuel_level}%`], ['GPS', ambulance.gps_status], ['Health', ambulance.health_status]].map(([k, v]) => (
              <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{k}</div>
                <div style={{ color: k === 'Status' ? sc(v) : '#f59e0b', fontWeight: 700, fontFamily: 'monospace' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!ambulance && user?.role === 'hospital_driver' && (
        <div style={{ ...panelStyle, textAlign: 'center', color: '#64748b', borderStyle: 'dashed', marginBottom: '1.5rem' }}>
          <Truck size={32} style={{ opacity: 0.15, marginBottom: '0.5rem' }} /><div>No ambulance assigned. Contact your hospital admin.</div>
        </div>
      )}

      {/* NEW: LIVE EMERGENCY CONSOLE FOR DRIVERS */}
      {user?.role === 'hospital_driver' && (
        <div style={{ marginTop: '2rem' }}>
          <AmbulanceDashboard />
        </div>
      )}
    </div>
  );
};

export default HospitalEmployeePortal;
