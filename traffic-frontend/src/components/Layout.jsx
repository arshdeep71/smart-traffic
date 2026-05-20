import React, { useContext, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Menu, X, LogOut, LayoutDashboard, Map, AlertTriangle, Users,
  Building2, Truck, Activity, ShieldCheck, Heart, Clock, Home, Compass
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const getMenuItems = () => {
    if (!user) return [];

    // Dashboard route per role
    const dashPath = {
      admin: '/admin', super_admin: '/super_admin', citizen: '/citizen',
      traffic_police: '/police', ambulance_staff: '/ambulance',
      hospital_admin: '/hospital-admin',
      hospital_driver: '/hospital-staff', hospital_staff: '/hospital-staff',
    }[user.role] || '/dashboard';

    const items = [];
    if (user.role !== 'citizen') {
      items.push({ path: dashPath, label: 'Dashboard', icon: <LayoutDashboard size={18} /> });
    }

    if (['admin', 'super_admin', 'traffic_police'].includes(user.role)) {
      items.push({ path: '/map', label: 'Live Map', icon: <Map size={18} /> });
      items.push({ path: '/accidents', label: 'Accidents', icon: <AlertTriangle size={18} /> });
    }

    if (['admin', 'super_admin'].includes(user.role)) {
      items.push({ path: '/users', label: 'Users', icon: <Users size={18} /> });
      items.push({
        path: '/hospitals', label: 'Hospitals', icon: <Building2 size={18} />,
        badge: 'NEW', badgeColor: '#ef4444'
      });
    }

    if (user.role === 'citizen') {
      items.push({ path: '/citizen?tab=home', label: 'Home', icon: <Home size={18} /> });
      items.push({ path: '/citizen?tab=report', label: 'Emergency Report', icon: <AlertTriangle size={18} /> });
      items.push({ path: '/citizen?tab=medical', label: 'Medical Assistant', icon: <Heart size={18} /> });
      items.push({ path: '/citizen?tab=history', label: 'Emergency History', icon: <Clock size={18} /> });
    }

    if (user.role === 'hospital_admin') {
      items.push({ path: '/hospital-admin', label: 'Staff', icon: <Users size={18} /> });
      items.push({ path: '/hospital-admin', label: 'Ambulances', icon: <Truck size={18} /> });
    }

    return items;
  };

  const isActive = (path) => {
    const itemPathname = path.split('?')[0];
    const hasSearch = path.includes('?');
    if (hasSearch) {
      const searchPart = path.substring(path.indexOf('?'));
      if (user?.role === 'citizen' && location.pathname === '/citizen' && !location.search) {
        return path === '/citizen?tab=home';
      }
      return location.pathname === itemPathname && location.search === searchPart;
    }
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));
  };

  // Role display label
  const roleLabel = {
    admin: 'Administrator', super_admin: 'Super Admin', citizen: 'Citizen',
    traffic_police: 'Traffic Police', ambulance_staff: 'Ambulance Staff',
    hospital_admin: 'Hospital Admin', hospital_driver: 'Ambulance Driver',
    hospital_staff: 'Hospital Staff',
  }[user?.role] || user?.role;

  // Sidebar accent color per role
  const roleAccent = {
    hospital_admin: '#ef4444', hospital_driver: '#f59e0b', hospital_staff: '#8b5cf6',
    admin: '#3b82f6', super_admin: '#6366f1', citizen: '#10b981',
    traffic_police: '#f59e0b', ambulance_staff: '#ef4444',
  }[user?.role] || '#3b82f6';

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ borderRight: 'none', background: '#000' }}>
        <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', margin: 0 }}>SmartTraffic</h2>
            <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setSidebarOpen(false)}><X size={18} /></button>
          </div>
          {/* Role badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: `${roleAccent}20`, border: `1px solid ${roleAccent}40`, fontSize: '0.65rem', fontWeight: 700, color: roleAccent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <span>●</span> {roleLabel}
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0.8rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', overflowY: 'auto' }}>
          {getMenuItems().map((item) => {
            const isClickOnly = item.path === '#';
            const componentProps = isClickOnly ? {
              onClick: (e) => {
                e.preventDefault();
                item.onClick();
                setSidebarOpen(false);
              },
              style: {
                display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.75rem 1rem',
                color: '#9ca3af',
                background: 'transparent',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem',
                transition: 'all 0.2s ease', borderLeft: '3px solid transparent',
              }
            } : {
              to: item.path,
              onClick: () => setSidebarOpen(false),
              style: {
                display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.75rem 1rem',
                color: isActive(item.path) ? '#fff' : '#9ca3af',
                background: isActive(item.path) ? `${roleAccent}20` : 'transparent',
                borderRadius: '8px', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem',
                transition: 'all 0.2s ease', borderLeft: isActive(item.path) ? `3px solid ${roleAccent}` : '3px solid transparent',
              }
            };

            const Tag = isClickOnly ? 'button' : Link;

            return (
              <Tag
                key={item.label}
                {...componentProps}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{ background: item.badgeColor, color: '#fff', fontSize: '0.55rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '4px', letterSpacing: '0.05em' }}>{item.badge}</span>
                )}
              </Tag>
            );
          })}
        </nav>

        <div style={{ padding: '1rem 0.8rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {user?.role === 'citizen' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Avatar" 
                  style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${roleAccent}` }} 
                />
              ) : (
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: roleAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '0.85rem' }}>
                  {user?.name?.charAt(0)}
                </div>
              )}
              <div style={{ flex: 1, overflow: 'hidden', textAlign: 'left' }}>
                <div style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div style={{ color: '#9ca3af', fontSize: '0.65rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.15rem' }}>{user?.email}</div>
                {user?.emailVerified && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.58rem', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.05rem 0.35rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    ✅ Verified Citizen
                  </span>
                )}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, borderRadius: '8px', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.color = '#fff'}
            onMouseOut={e => e.currentTarget.style.color = '#9ca3af'}
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <button className="btn btn-outline" style={{ padding: '0.5rem', border: 'none' }} onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user?.role === 'citizen' && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('start-tour'))}
                className="btn btn-outline"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.72rem',
                  borderRadius: '6px',
                  borderColor: 'rgba(0, 0, 0, 0.15)',
                  background: 'transparent',
                  color: '#4b5563',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontWeight: 700,
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = roleAccent;
                  e.currentTarget.style.color = roleAccent;
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.04)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.color = '#4b5563';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Compass size={13} style={{ color: roleAccent }} /> Restart Tour
              </button>
            )}
            <div 
              onClick={() => {
                if (user?.role === 'citizen') {
                  navigate('/citizen?tab=profile');
                } else {
                  setShowProfileModal(true);
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', padding: '0.4rem 0.8rem', borderRadius: '8px', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{roleLabel}</div>
              </div>
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Avatar" 
                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${roleAccent}` }}
                />
              ) : (
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: roleAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '1rem' }}>
                  {user?.name?.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content-area fade-in">
          <Outlet />
        </div>
      </main>

      {/* Immersive Profile Card Modal */}
      {showProfileModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100002, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel pop-in" style={{ width: '380px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: `1px solid ${roleAccent}30`, position: 'relative', background: '#fff' }}>
            
            {/* Close Button */}
            <button 
              onClick={() => setShowProfileModal(false)}
              style={{ position: 'absolute', top: 15, right: 15, background: 'rgba(0,0,0,0.05)', border: 'none', color: '#64748b', fontSize: '1rem', fontWeight: 700, width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
            >
              ×
            </button>

            {/* Profile Avatar Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: roleAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '1.6rem', boxShadow: `0 8px 20px ${roleAccent}30` }}>
                {user?.name?.charAt(0)}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#1f2937' }}>{user?.name}</h3>
                <span style={{ display: 'inline-block', marginTop: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: `${roleAccent}15`, border: `1px solid ${roleAccent}30`, fontSize: '0.65rem', fontWeight: 800, color: roleAccent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* User Account Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Email Address</span>
                <div style={{ fontSize: '0.85rem', color: '#1f2937', fontWeight: 600, marginTop: '0.15rem' }}>{user?.email || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Account Scope</span>
                <div style={{ fontSize: '0.85rem', color: '#1f2937', fontWeight: 600, marginTop: '0.15rem' }}>Smart City Security Clearance Level 3</div>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Telemetry Status</span>
                <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700, marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> GPS Sync Verified
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="btn btn-outline"
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}
              >
                Close Profile
              </button>
              <button 
                onClick={() => {
                  setShowProfileModal(false);
                  handleLogout();
                }}
                className="btn"
                style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '0.5rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', borderRadius: 8 }}
              >
                Log Out
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
