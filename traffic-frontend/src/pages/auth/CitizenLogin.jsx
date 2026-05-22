import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import api from '../../services/api';
import { 
  Eye, EyeOff, Mail, Lock, ShieldAlert, Loader2, Sparkles, RefreshCw, Key, 
  HeartPulse, UserCheck, Smartphone, AlertTriangle, CheckCircle, KeyRound, Clock,
  ArrowRight, Shield, Activity, MapPin, Volume2
} from 'lucide-react';

const CitizenLogin = () => {
  // Modes: 'signin' | 'signup' | 'passwordless'
  const [authMode, setAuthMode] = useState('signin'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Email verification states
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationStep, setVerificationStep] = useState('auth'); // 'auth' | 'otp'
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpEmail, setOtpEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  // Onboarding Setup States
  const [officialName, setOfficialName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmergency, setProfileEmergency] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Parse URL search parameters for errors sent back by Supabase server
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const serverError = params.get('error_description') || params.get('error');
    if (serverError) {
      setError(decodeURIComponent(serverError).replace(/\+/g, ' '));
    }

    const hasCode = params.has('code');
    if (hash.includes('access_token=') || hasCode) {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const timer = setTimeout(() => {
        setLoading(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Redirect to dashboard if already verified and logged in WITH onboarding complete
  useEffect(() => {
    if (user && user.role === 'citizen') {
      if (user.profileCompleted) {
        navigate('/citizen');
      } else {
        // Pre-populate onboarding fields from social provider metadata if available
        if (!officialName && user.name) setOfficialName(user.name);
        if (!profilePhone && user.phone) setProfilePhone(user.phone);
        if (!profileEmergency && user.emergencyContact) setProfileEmergency(user.emergencyContact);
      }
    }
  }, [user, navigate, officialName, profilePhone, profileEmergency]);

  // Cooldown timers
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Google Login Flow
  const handleGoogleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: (import.meta.env.VITE_APP_URL || window.location.origin) + '/citizen-login'
        }
      });
      if (err) throw err;
    } catch (err) {
      console.error("Supabase Google Auth Error:", err);
      setError(err.message || 'Google authentication failed.');
      setLoading(false);
    }
  };

  // Passwordless Email Link Login Flow
  const handlePasswordlessLinkSend = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: (import.meta.env.VITE_APP_URL || window.location.origin) + '/citizen-login'
        }
      });

      if (err) throw err;
      
      setSuccess(`A secure login link has been sent to ${email}. Please check your inbox to sign in.`);
      setResendCooldown(60);
    } catch (err) {
      console.error("Supabase Magic Link Send Error:", err);
      setError(err.message || 'Failed to send secure login link.');
    } finally {
      setLoading(false);
    }
  };

  // Resend Secure OTP Verification Code
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await api.post('/auth/otp/send', { email: otpEmail });
      setSuccess(res.data.message || 'Verification code resent successfully.');
      setResendCooldown(60);
    } catch (err) {
      console.error("Resend OTP Error:", err);
      setError(err.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP handler
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    const fullCode = otpCode.join('');
    if (fullCode.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/otp/verify', {
        email: otpEmail,
        otp: fullCode
      });

      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: otpEmail,
        password: password || tempPassword
      });

      if (signInErr) {
        setError('Verified successfully! Please sign in with your credentials.');
        setVerificationStep('auth');
        setAuthMode('signin');
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        data: { otp_verified: true }
      });

      if (updateErr) throw updateErr;

      setSuccess('Email verified successfully! Welcome.');
      setVerificationStep('auth');
    } catch (err) {
      console.error("Verify OTP Error:", err);
      setError(err.response?.data?.message || err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset verification workflow
  const handleResetVerificationFlow = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUnverifiedUser(null);
    setPassword('');
    setConfirmPassword('');
    setTempPassword('');
    setOtpCode(['', '', '', '', '', '']);
    setOtpEmail('');
    setVerificationStep('auth');
    setAuthMode('signin');
    setLoading(false);
  };

  // Email/Password login & signup handler with OTP trigger
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (authMode === 'signup' && !confirmPassword) {
      setError('Please confirm your password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (authMode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      if (authMode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: password,
          options: {
            data: {
              otp_verified: false
            }
          }
        });

        if (err) throw err;

        await supabase.auth.signOut();

        setOtpEmail(trimmedEmail);
        setTempPassword(password);
        setOtpCode(['', '', '', '', '', '']);

        try {
          await api.post('/auth/otp/send', { email: trimmedEmail });
          setVerificationStep('otp');
          setSuccess('Verification email with OTP code sent successfully. Please check your inbox.');
          localStorage.removeItem('citizen_tour_completed');
        } catch (otpErr) {
          console.error("Laravel OTP send failed during signup:", otpErr);
          const backendMsg = otpErr.response?.data?.message || 'Failed to send OTP verification code.';
          throw new Error(backendMsg);
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: password
        });

        if (err) {
          throw err;
        }

        const isVerified = data.user?.user_metadata?.otp_verified === true;
        if (data.user && !isVerified) {
          setError('Please verify your email before signing in.');
          setOtpEmail(trimmedEmail);
          setTempPassword(password);
          setOtpCode(['', '', '', '', '', '']);
          
          await supabase.auth.signOut();
          
          try {
            await api.post('/auth/otp/send', { email: trimmedEmail });
          } catch (otpErr) {
            console.error("Error sending OTP on unverified login:", otpErr);
            const backendMsg = otpErr.response?.data?.message || 'Failed to send OTP verification code.';
            setError(`Please verify your email. (OTP Send Failed: ${backendMsg})`);
          }
          
          setVerificationStep('otp');
        }
      }
    } catch (err) {
      console.error("Supabase Email Auth Error:", err);
      let friendlyError = err.message;
      if (err.message?.includes('User already registered') || err.message?.includes('already exists')) {
        friendlyError = 'This email address is already registered. Please login instead.';
      } else if (err.message?.includes('Invalid login credentials') || err.message?.includes('invalid_grant')) {
        friendlyError = 'Invalid email or password. Please try again.';
      } else if (err.message?.includes('invalid_email')) {
        friendlyError = 'Please enter a valid email address.';
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  // Onboarding Onsubmit Handler
  const handleProfileCompletionSubmit = async (e, skipOptional = false) => {
    if (e) e.preventDefault();
    
    if (!skipOptional && !officialName) {
      setProfileError('Full Official Name is required to set up your safety profile.');
      return;
    }

    setProfileSaving(true);
    setProfileError('');

    try {
      const finalName = officialName || user?.name || 'Citizen User';

      try {
        await supabase.auth.updateUser({
          data: { full_name: finalName }
        });
      } catch (sbErr) {
        console.warn("Supabase user metadata update bypassed:", sbErr);
      }

      const profileRes = await api.post('/auth/profile/complete', {
        email: user.email,
        name: finalName,
        phone: profilePhone.trim(),
        emergency_contact: profileEmergency.trim()
      });

      const mongoUser = profileRes.data.data;
      setUser({
        ...user,
        name: mongoUser.name,
        profileCompleted: mongoUser.profile_completed,
        phone: mongoUser.phone || '',
        emergencyContact: mongoUser.emergency_contact || '',
      });

      navigate('/citizen');
    } catch (err) {
      console.error("Error completing citizen safety profile:", err);
      setProfileError(err.message || 'Failed to complete profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Sleek minimalist loading splash
  if (loading && !email && !unverifiedUser) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        fontFamily: 'Outfit, Inter, sans-serif'
      }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(234, 88, 12, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
          <HeartPulse size={40} style={{ color: '#ea580c', position: 'absolute' }} />
        </div>
        <h3 style={{ marginTop: '2rem', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Verifying Civic Credentials...</h3>
        <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Establishing secure connection to SmartTraffic Response Nodes</p>
      </div>
    );
  }

  // ─── ONBOARDING TAKE-OVER PANEL ───
  if (user && user.role === 'citizen' && !user.profileCompleted) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        padding: '1.5rem',
        fontFamily: 'Outfit, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#0f172a',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
          padding: '3rem 2.5rem',
          background: '#fafafa',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          boxSizing: 'border-box',
          textAlign: 'center'
        }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(234, 88, 12, 0.08)', borderRadius: '50%', border: '1px solid rgba(234, 88, 12, 0.15)', marginBottom: '1.5rem' }}>
            <UserCheck size={36} style={{ color: '#ea580c' }} />
          </div>

          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.025em', color: '#0f172a', textTransform: 'uppercase' }}>Set Up Safety Profile</h2>
          <p style={{ margin: '0.4rem 0 2.5rem 0', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.45 }}>
            Welcome! Please complete your official civic safety profile before entering the tracking telemetry dashboard.
          </p>

          {profileError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#ef4444',
              padding: '0.8rem 1rem',
              borderRadius: '4px',
              marginBottom: '1.5rem',
              fontSize: '0.85rem',
              textAlign: 'left',
              lineHeight: 1.4,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}>
              <div>⚠️ {profileError}</div>
              <button 
                type="button" 
                onClick={handleResetVerificationFlow}
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.25)', 
                  color: '#ef4444', 
                  padding: '0.35rem 0.7rem', 
                  borderRadius: '4px', 
                  fontSize: '0.75rem', 
                  fontWeight: 800, 
                  cursor: 'pointer',
                  width: 'fit-content'
                }}
              >
                🔄 Reset Stale Session
              </button>
            </div>
          )}

          <form onSubmit={handleProfileCompletionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
            
            {/* Name input */}
            <div>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Full Official Name *</label>
              <input
                type="text"
                placeholder="Enter your official name"
                value={officialName}
                onChange={e => setOfficialName(e.target.value)}
                required
                style={{
                  width: '100%',
                  border: 'none',
                  borderBottom: '1px solid #cbd5e1',
                  background: 'transparent',
                  padding: '0.6rem 0',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  outline: 'none',
                  fontFamily: "'Inter', sans-serif"
                }}
              />
            </div>

            {/* Mobile phone input */}
            <div>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Official Mobile Phone (Optional)</label>
              <input
                type="tel"
                placeholder="+91 XXXXX XXXXX"
                value={profilePhone}
                onChange={e => setProfilePhone(e.target.value)}
                style={{
                  width: '100%',
                  border: 'none',
                  borderBottom: '1px solid #cbd5e1',
                  background: 'transparent',
                  padding: '0.6rem 0',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  outline: 'none',
                  fontFamily: "'Inter', sans-serif"
                }}
              />
            </div>

            {/* Emergency contact details input */}
            <div>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Emergency Contact Number (Optional)</label>
              <input
                type="tel"
                placeholder="Emergency contact's number"
                value={profileEmergency}
                onChange={e => setProfileEmergency(e.target.value)}
                style={{
                  width: '100%',
                  border: 'none',
                  borderBottom: '1px solid #cbd5e1',
                  background: 'transparent',
                  padding: '0.6rem 0',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  outline: 'none',
                  fontFamily: "'Inter', sans-serif"
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1.5rem', width: '100%' }}>
              <button
                type="submit"
                disabled={profileSaving}
                style={{
                  width: '100%',
                  background: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.85rem',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  borderRadius: '4px',
                  cursor: profileSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { if (!profileSaving) e.currentTarget.style.background = '#c2410c'; }}
                onMouseOut={e => { if (!profileSaving) e.currentTarget.style.background = '#ea580c'; }}
              >
                {profileSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                {profileSaving ? 'Saving Profile...' : 'Save & Enter Dashboard'}
              </button>

              <button
                type="button"
                onClick={(e) => handleProfileCompletionSubmit(e, true)}
                disabled={profileSaving}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid #cbd5e1',
                  color: '#64748b',
                  padding: '0.8rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = '#0f172a';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                Skip Optional & Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Outfit', 'Inter', sans-serif"
    }}>

      {/* ─── PUBLIC HERO HEADER ─── */}
      <header style={{
        height: '75px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 4rem',
        background: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 100
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

        {/* Right Portal Redirect Selector */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={() => {
              setAuthMode('signin');
              document.getElementById('auth-card-anchor')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              background: '#ea580c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50px',
              padding: '0.6rem 1.35rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#c2410c'}
            onMouseOut={e => e.currentTarget.style.background = '#ea580c'}
          >
            Client Portal
          </button>

          <button 
            onClick={() => navigate('/login?admin=true')}
            style={{
              background: 'transparent',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: '50px',
              padding: '0.55rem 1.15rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = '#0f172a';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            Administrative Login
          </button>
        </div>
      </header>

      {/* ─── SPLIT VIEW: HERO TEXT (LEFT) & SECURE LOGIN CARD (RIGHT) ─── */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        padding: '5rem 4rem 6rem',
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        gap: '4rem',
        alignItems: 'center'
      }}>
        
        {/* Left Side: Real Platform Emergency Pitch */}
        <div style={{ flex: 1.2, textAlign: 'left' }}>
          <h1 style={{ 
            fontSize: '3.6rem', 
            fontWeight: 900, 
            lineHeight: 1.1, 
            color: '#0f172a', 
            letterSpacing: '-1.5px',
            margin: 0
          }}>
            Smart City Emergency <br/>
            <span style={{ color: '#ea580c' }}>Response Platform</span>
          </h1>
          
          <p style={{ 
            fontSize: '1.2rem', 
            color: '#64748b', 
            lineHeight: 1.5, 
            marginTop: '2rem', 
            maxWidth: '560px',
            fontFamily: "'Inter', sans-serif"
          }}>
            Civic Sentinel provides high-priority, real-time emergency response coordination, intelligent ambulance routing, silent background SOS alerts, and live multi-portal responder dispatches.
          </p>

          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '3rem' }}>
            <button 
              onClick={() => {
                document.getElementById('gateway-hub-anchor')?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: '#ea580c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50px',
                padding: '0.9rem 2.2rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                boxShadow: '0 4px 6px rgba(234,88,12,0.15)',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#c2410c'}
              onMouseOut={e => e.currentTarget.style.background = '#ea580c'}
            >
              Explore Gateways
            </button>
            <button 
              onClick={() => {
                setAuthMode('signup');
                setError('');
                setSuccess('');
                document.getElementById('auth-card-anchor')?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: 'transparent',
                color: '#ea580c',
                border: '2px solid #ea580c',
                borderRadius: '50px',
                padding: '0.9rem 2.2rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
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
              Access Client Portal →
            </button>
          </div>
        </div>

        {/* Right Side: Embedded Authentication Panel */}
        <div id="auth-card-anchor" style={{ flex: 0.8, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            width: '100%',
            maxWidth: '460px',
            background: '#fafafa',
            border: '1px solid #f1f5f9',
            padding: '3.5rem 3rem',
            borderRadius: '4px',
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.02), 0px 10px 30px rgba(0, 0, 0, 0.03)'
          }}>

            {verificationStep === 'otp' ? (
              /* OTP Code Workflow */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }}>Enter Code</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}>
                  We sent a 6-digit secure code to:<br/>
                  <strong style={{ color: '#0f172a' }}>{otpEmail}</strong>
                </p>

                {success && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.75rem', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600 }}>{success}</div>}
                {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '0.75rem', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600 }}>{error}</div>}

                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem' }}>
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-input-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          const newOtp = [...otpCode];
                          newOtp[idx] = val;
                          setOtpCode(newOtp);

                          if (val && idx < 5) {
                            document.getElementById(`otp-input-${idx + 1}`)?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !otpCode[idx] && idx > 0) {
                            document.getElementById(`otp-input-${idx - 1}`)?.focus();
                          }
                        }}
                        style={{
                          width: '40px',
                          height: '46px',
                          border: 'none',
                          borderBottom: '2px solid #cbd5e1',
                          background: 'transparent',
                          color: '#0f172a',
                          fontSize: '1.3rem',
                          fontWeight: '800',
                          textAlign: 'center',
                          outline: 'none'
                        }}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      background: '#ea580c',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.8rem',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {loading ? 'Verifying...' : 'Verify'}
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      color: '#ea580c',
                      border: '1px solid #ea580c',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetVerificationFlow}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid #cbd5e1',
                      color: '#64748b',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            ) : (
              /* Standard Forms */
              <div>
                <h2 style={{
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '0.05em',
                  marginBottom: '2.5rem',
                  textTransform: 'uppercase',
                  textAlign: 'left'
                }}>
                  {authMode === 'signup' ? 'Create Account' : authMode === 'passwordless' ? 'Secure OTP Link' : 'Resident Sign In'}
                </h2>

                {success && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.75rem', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1.5rem', textAlign: 'left' }}>{success}</div>}
                {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '0.75rem', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1.5rem', textAlign: 'left' }}>{error}</div>}

                {/* Google Sign In Option */}
                {authMode !== 'passwordless' && (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.65rem',
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      padding: '0.8rem',
                      borderRadius: '4px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      marginBottom: '1.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#0f172a'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                  >
                    <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24">
                      <path
                        fill="#0f172a"
                        d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.92 1 1 5.92 1 12s4.92 11 11.24 11c6.59 0 11-4.63 11-11.2 0-.75-.08-1.33-.2-1.885H12.24z"
                      />
                    </svg>
                    Continue with Google
                  </button>
                )}

                {authMode === 'passwordless' ? (
                  <form onSubmit={handlePasswordlessLinkSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', textAlign: 'left' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem', fontFamily: "'Inter', sans-serif" }}>Email Address</label>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          border: 'none',
                          borderBottom: '1px solid #cbd5e1',
                          background: 'transparent',
                          padding: '0.5rem 0',
                          fontSize: '0.95rem',
                          color: '#0f172a',
                          outline: 'none',
                          fontFamily: "'Inter', sans-serif"
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        width: '100%',
                        background: '#ea580c',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.85rem',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {loading ? 'Sending...' : 'Email Login Link →'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', textAlign: 'left' }}>
                    
                    {/* Email Input */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem', fontFamily: "'Inter', sans-serif" }}>Email Address</label>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        required
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
                      />
                    </div>

                    {/* Password Input */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem', fontFamily: "'Inter', sans-serif" }}>Password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          onFocus={() => setPasswordFocused(true)}
                          onBlur={() => setPasswordFocused(false)}
                          required
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
                            alignItems: 'center'
                          }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password (only in signup) */}
                    {authMode === 'signup' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem', fontFamily: "'Inter', sans-serif" }}>Confirm Password</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            onFocus={() => setConfirmFocused(true)}
                            onBlur={() => setConfirmFocused(false)}
                            required
                            style={{
                              width: '100%',
                              border: 'none',
                              borderBottom: confirmFocused ? '2px solid #ea580c' : '1px solid #cbd5e1',
                              background: 'transparent',
                              padding: '0.5rem 2rem 0.5rem 0',
                              fontSize: '0.95rem',
                              color: '#0f172a',
                              outline: 'none',
                              transition: 'border-color 0.2s',
                              fontFamily: "'Inter', sans-serif"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                              alignItems: 'center'
                            }}
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    )}

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
                        cursor: loading ? 'not-allowed' : 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => { if (!loading) e.currentTarget.style.background = '#c2410c'; }}
                      onMouseOut={e => { if (!loading) e.currentTarget.style.background = '#ea580c'; }}
                    >
                      {loading ? 'Processing...' : authMode === 'signup' ? 'Create Account →' : 'Sign In →'}
                    </button>
                  </form>
                )}

                {/* Switcher links */}
                <div style={{ marginTop: '2.5rem', textAlign: 'left' }}>
                  {authMode === 'signup' ? (
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Already have an account?{' '}
                      <button 
                        type="button" 
                        onClick={() => { setAuthMode('signin'); setError(''); setSuccess(''); }}
                        style={{ background: 'transparent', border: 'none', color: '#ea580c', cursor: 'pointer', fontWeight: 700, padding: 0, textDecoration: 'underline' }}
                      >
                        Sign in
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <div style={{ color: '#64748b' }}>
                        Don't have a safety account?{' '}
                        <button 
                          type="button" 
                          onClick={() => { setAuthMode('signup'); setError(''); setSuccess(''); }}
                          style={{ background: 'transparent', border: 'none', color: '#ea580c', cursor: 'pointer', fontWeight: 700, padding: 0, textDecoration: 'underline' }}
                        >
                          Sign up
                        </button>
                      </div>
                      
                      {authMode !== 'passwordless' ? (
                        <button 
                          type="button"
                          onClick={() => { setAuthMode('passwordless'); setError(''); setSuccess(''); }}
                          style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 700, padding: 0, textAlign: 'left', textDecoration: 'underline' }}
                        >
                          🔑 Sign in with secure email link
                        </button>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => { setAuthMode('signin'); setError(''); setSuccess(''); }}
                          style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 700, padding: 0, textAlign: 'left', textDecoration: 'underline' }}
                        >
                          Back to standard sign in
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '2rem', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4, textAlign: 'left' }}>
                  By continuing, you agree to TMI’s{' '}
                  <a href="#tos" style={{ color: '#64748b', textDecoration: 'underline' }}>Terms of Service</a> and{' '}
                  <a href="#privacy" style={{ color: '#64748b', textDecoration: 'underline' }}>Privacy Policy</a>.
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ─── GATEWAY PORTAL HUB DASHBOARD ─── */}
      <section id="gateway-hub-anchor" style={{ 
        background: '#ffffff', 
        padding: '5rem 4rem 6rem', 
        borderTop: '1px solid #f1f5f9',
        boxSizing: 'border-box'
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          
          <div style={{ textAlign: 'left', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.04em', margin: 0 }}>
              Gateway Portal Hub
            </h2>
            <p style={{ color: '#64748b', fontSize: '1rem', marginTop: '0.5rem', fontFamily: "'Inter', sans-serif" }}>
              Select an access gateway below to log into your designated emergency coordination system.
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '2.5rem' 
          }}>
            
            {/* Gateway 1: Client Portal */}
            <div className="glass-panel" style={{ 
              padding: '3rem 2.5rem', 
              background: '#fafafa', 
              border: '1px solid #f1f5f9', 
              borderRadius: '4px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s'
            }}>
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '50px', 
                  height: '50px', 
                  borderRadius: '50%', 
                  background: 'rgba(234, 88, 12, 0.08)', 
                  color: '#ea580c', 
                  marginBottom: '2rem' 
                }}>
                  <Shield size={24} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.8rem', letterSpacing: '0.02em' }}>
                  Client Portal
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2.5rem', fontFamily: "'Inter', sans-serif", minHeight: '75px' }}>
                  Emergency reporting gateway for residents and citizens. Report live issues with instant auto-filled AI analysis, trigger silent SOS dispatches, and track responding emergency units in real-time.
                </p>
              </div>
              <button 
                onClick={() => {
                  setAuthMode('signin');
                  document.getElementById('auth-card-anchor')?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  background: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.85rem 1.8rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: 'fit-content',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#c2410c'}
                onMouseOut={e => e.currentTarget.style.background = '#ea580c'}
              >
                Access Client Portal →
              </button>
            </div>

            {/* Gateway 2: Administrative Login */}
            <div className="glass-panel" style={{ 
              padding: '3rem 2.5rem', 
              background: '#fafafa', 
              border: '1px solid #f1f5f9', 
              borderRadius: '4px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s'
            }}>
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '50px', 
                  height: '50px', 
                  borderRadius: '50%', 
                  background: 'rgba(100, 116, 139, 0.08)', 
                  color: '#64748b', 
                  marginBottom: '2rem' 
                }}>
                  <MapPin size={24} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.8rem', letterSpacing: '0.02em' }}>
                  Administrative Login
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2.5rem', fontFamily: "'Inter', sans-serif", minHeight: '75px' }}>
                  System administration and oversight panel. Audit real-time responder dispatches, supervise incident mapping queues, configure dispatch algorithms, manage hospitals databases, and policy logs.
                </p>
              </div>
              <button 
                onClick={() => navigate('/login?admin=true')}
                style={{
                  background: 'transparent',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '0.8rem 1.8rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: 'fit-content',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = '#0f172a';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                Access Admin Login →
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ─── FOOTER SECTION ─── */}
      <footer style={{ background: '#ffffff', padding: '4rem', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ 
          maxWidth: '1440px', 
          margin: '0 auto', 
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              border: '1.5px solid #0f172a',
              transform: 'rotate(45deg)',
              marginRight: '4px'
            }}>
              <span style={{ transform: 'rotate(-45deg)', fontWeight: 950, fontSize: '0.45rem', color: '#0f172a' }}>TMI</span>
            </div>
            <span>© {new Date().getFullYear()} Civic Sentinel Platform. Secured by TMI.</span>
          </div>

          <div style={{ display: 'flex', gap: '2rem' }}>
            <a href="#privacy" style={{ color: '#64748b', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#tos" style={{ color: '#64748b', textDecoration: 'none' }}>Terms of Service</a>
            <a href="#status" style={{ color: '#64748b', textDecoration: 'none' }}>System Status</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default CitizenLogin;
