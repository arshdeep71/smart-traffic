import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Shield, CheckCircle } from 'lucide-react';

export const PoliceDashboard = () => {
  const [accidents, setAccidents] = useState([]);
  
  const fetchPending = async () => {
    try {
      const res = await api.get('/accidents');
      const rawAcc = res.data?.data;
      const accArray = Array.isArray(rawAcc) ? rawAcc : (Array.isArray(rawAcc?.data) ? rawAcc.data : []);
      setAccidents(accArray.filter(a => a.status === 'pending'));
    } catch (e) {}
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleVerify = async (id) => {
    try {
      await api.post(`/accidents/${id}/verify`);
      alert('Accident verified and escalated!');
      fetchPending();
    } catch (e) {
      alert('Failed to verify: ' + (e.response?.data?.message || e.message));
    }
  };

  return (
    <div className="fade-in">
      <h2 style={{ marginBottom: '2rem' }}>Traffic Police Command</h2>
      <div className="glass-panel" style={{ padding: '2rem', borderTop: '4px solid var(--primary-color)' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield color="var(--primary-color)"/> Pending Verifications Queue
        </h3>
        {accidents.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No pending incidents to verify.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {accidents.map((acc, i) => (
              <div key={i} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{acc.title}</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.5rem 0' }}>{acc.description}</div>
                  <span className="badge badge-warning">{acc.severity}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-primary" onClick={() => handleVerify(acc.id || acc._id)}>
                    <CheckCircle size={16} /> Verify Incident
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PoliceDashboard;
