import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const user = await login(email, password);
      const map = {
        admin:           '/admin',
        super_admin:     '/super_admin',
        traffic_police:  '/police',
        ambulance_staff: '/ambulance',
        citizen:         '/citizen',
        hospital_admin:  '/hospital-admin',
        hospital_driver: '/hospital-staff',
        hospital_staff:  '/hospital-staff',
      };
      navigate(map[user.role] || `/${user.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#ffffff', 
      display: 'flex', 
      flexDirection: 'column', 
      fontFamily: "'Outfit', 'Inter', sans-serif",
      position: 'relative'
    }}>
      
      {/* Top Header Bar */}
      <header style={{
        height: '75px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        padding: '0 4rem',
        background: '#ffffff',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            border: '2px solid #0f172a',
            transform: 'rotate(45deg)',
            marginRight: '8px'
          }}>
            <span style={{ 
              transform: 'rotate(-45deg)', 
              fontWeight: 950, 
              fontSize: '0.68rem', 
              color: '#0f172a', 
              letterSpacing: '-0.5px' 
            }}>TMI</span>
          </div>
          <span style={{ 
            fontWeight: 900, 
            fontSize: '1rem', 
            letterSpacing: '0.08em', 
            color: '#0f172a',
            textTransform: 'uppercase'
          }}>
            SmartTraffic
          </span>
        </div>
      </header>

      {/* Main Layout Area */}
      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        
        {/* Left Social Links Sidebar */}
        <aside style={{
          position: 'absolute',
          left: '3rem',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          zIndex: 10
        }}>
          <a href="#linkedin" style={{ color: '#cbd5e1', transition: 'color 0.2s', display: 'flex' }} onMouseOver={e => e.currentTarget.style.color = '#64748b'} onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}>
            <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
          </a>
          <a href="#twitter" style={{ color: '#cbd5e1', transition: 'color 0.2s', display: 'flex' }} onMouseOver={e => e.currentTarget.style.color = '#64748b'} onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}>
            <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.48.75 2.78 1.9 3.55-.7 0-1.36-.2-1.94-.53v.05c0 2.05 1.46 3.76 3.4 4.15-.36.1-.73.15-1.12.15-.27 0-.54-.03-.8-.08.54 1.68 2.1 2.9 3.95 2.94-1.44 1.13-3.26 1.8-5.23 1.8-.34 0-.67-.02-1-.06C2.62 21.02 4.88 22 7.31 22 14.86 22 19 15.75 19 10.33v-.53c.8-.57 1.49-1.3 2.04-2.13z"/></svg>
          </a>
          <a href="#instagram" style={{ color: '#cbd5e1', transition: 'color 0.2s', display: 'flex' }} onMouseOver={e => e.currentTarget.style.color = '#64748b'} onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}>
            <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
          </a>
          <a href="#facebook" style={{ color: '#cbd5e1', transition: 'color 0.2s', display: 'flex' }} onMouseOver={e => e.currentTarget.style.color = '#64748b'} onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}>
            <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/></svg>
          </a>
          <a href="#youtube" style={{ color: '#cbd5e1', transition: 'color 0.2s', display: 'flex' }} onMouseOver={e => e.currentTarget.style.color = '#64748b'} onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}>
            <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.516 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.872.507 9.388.507 9.388.507s7.517 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </a>
        </aside>

        {/* Clean Centered Panel */}
        <main style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2rem 1rem'
        }}>
          
          <div style={{
            width: '100%',
            maxWidth: '480px',
            background: '#fafafa',
            border: '1px solid #f1f5f9',
            padding: '3.5rem 3rem',
            borderRadius: '4px',
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.02), 0px 10px 30px rgba(0, 0, 0, 0.03)'
          }}>
            
            <h2 style={{
              fontSize: '1.6rem',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '0.06em',
              marginBottom: '2.5rem',
              textTransform: 'uppercase',
              textAlign: 'left'
            }}>
              Sign In
            </h2>

            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                color: '#ef4444',
                padding: '0.85rem',
                borderRadius: '4px',
                marginBottom: '2rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                textAlign: 'left'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              
              {/* Email Address */}
              <div style={{ marginBottom: '2.25rem', position: 'relative', textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#64748b',
                  marginBottom: '0.25rem',
                  fontFamily: "'Inter', sans-serif"
                }}>
                  Email Address
                </label>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  style={{
                    width: '100%',
                    border: 'none',
                    borderBottom: emailFocused ? '2px solid #ea580c' : '1px solid #cbd5e1',
                    background: 'transparent',
                    padding: '0.5rem 0',
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    fontFamily: "'Inter', sans-serif"
                  }}
                  required
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '3rem', position: 'relative', textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#64748b',
                  marginBottom: '0.25rem',
                  fontFamily: "'Inter', sans-serif"
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    style={{
                      width: '100%',
                      border: 'none',
                      borderBottom: passwordFocused ? '2px solid #ea580c' : '1px solid #cbd5e1',
                      background: 'transparent',
                      padding: '0.5rem 2rem 0.5rem 0',
                      fontSize: '0.95rem',
                      color: '#0f172a',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      fontFamily: "'Inter', sans-serif"
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.25rem'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit CTA Button */}
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.85rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { if (!loading) e.currentTarget.style.background = '#c2410c'; }}
                onMouseOut={e => { if (!loading) e.currentTarget.style.background = '#ea580c'; }}
              >
                {loading ? 'Sign In...' : 'Sign In →'}
              </button>

            </form>

            {/* Forgot Password Link */}
            <div style={{ marginTop: '2rem', textAlign: 'left' }}>
              <a 
                href="#forgot" 
                style={{ 
                  color: '#ea580c', 
                  textDecoration: 'none', 
                  fontSize: '0.85rem', 
                  fontWeight: 700 
                }}
                onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
              >
                Forgot Your Password?
              </a>
            </div>

            {/* Citizen Portal Link */}
            <div style={{ 
              marginTop: '2.5rem', 
              borderTop: '1px solid #e2e8f0', 
              paddingTop: '2rem', 
              textAlign: 'left' 
            }}>
              <p style={{ 
                color: '#64748b', 
                fontSize: '0.78rem', 
                fontWeight: 600, 
                marginBottom: '1rem',
                fontFamily: "'Inter', sans-serif"
              }}>
                Resident or Citizen reporting an emergency?
              </p>
              <button
                type="button"
                onClick={() => navigate('/citizen-login')}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid #ea580c',
                  color: '#ea580c',
                  borderRadius: '4px',
                  padding: '0.8rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = '#ea580c';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#ea580c';
                }}
              >
                🛡️ Enter Citizen Emergency Portal
              </button>
            </div>

          </div>
        </main>

      </div>

    </div>
  );
};

export default Login;
