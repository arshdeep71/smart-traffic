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

  // 1. Detect if page is opened via a Supabase magic link / signup verification hash redirect or with an auth error
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    
    // Parse URL search parameters for errors sent back by Supabase server
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
          {/* Secured Citizen Badge */}
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
            Traffic Management International
          </span>
        </div>

        {/* Center navigation links */}
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <a href="#services" style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Services</a>
          <a href="#products" style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Products</a>
          <a href="#locations" style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Locations</a>
          <a href="#careers" style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase', position: 'relative' }}>
            Careers
            <span style={{ position: 'absolute', top: '-12px', right: '-16px', background: '#fee2e2', color: '#ef4444', fontSize: '0.52rem', fontWeight: 800, padding: '0.05rem 0.25rem', borderRadius: '4px', letterSpacing: '0.02em' }}>HIRING</span>
          </a>
          <a href="#contact" style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Contact</a>
        </nav>

        {/* Right Portal Redirect */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/login')}
            style={{
              background: '#ea580c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50px',
              padding: '0.65rem 1.6rem',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#c2410c'}
            onMouseOut={e => e.currentTarget.style.background = '#ea580c'}
          >
            Officer & Staff Portal
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
        
        {/* Left Side: Bold Marketing Pitch */}
        <div style={{ flex: 1.2, textAlign: 'left' }}>
          <h1 style={{ 
            fontSize: '3.6rem', 
            fontWeight: 900, 
            lineHeight: 1.1, 
            color: '#0f172a', 
            letterSpacing: '-1.5px',
            margin: 0
          }}>
            We never take shortcuts. <br/>
            <span style={{ color: '#ea580c' }}>Quality service</span> is always our priority!
          </h1>
          
          <p style={{ 
            fontSize: '1.2rem', 
            color: '#64748b', 
            lineHeight: 1.5, 
            marginTop: '2rem', 
            maxWidth: '560px',
            fontFamily: "'Inter', sans-serif"
          }}>
            We understand that you may need assistance. SmartTraffic provides highly robust, real-time emergency coordination, silent SOS alerts, AI incident analyses, and dynamic responder dispatches.
          </p>

          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '3rem' }}>
            <a 
              href="#services"
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
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                boxShadow: '0 4px 6px rgba(234,88,12,0.15)',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#c2410c'}
              onMouseOut={e => e.currentTarget.style.background = '#ea580c'}
            >
              Explore Services
            </a>
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
              Report Incident Now →
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

      {/* ─── SERVICES & FEATURE GRID ─── */}
      <section id="services" style={{ background: '#fafafa', padding: '6rem 4rem', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.04em', marginBottom: '4rem', textAlign: 'left' }}>
            Integrated Portals & Emergency Services
          </h2>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '2rem' 
          }}>
            
            {/* Service 1 */}
            <div className="glass-panel" style={{ padding: '2.5rem', background: '#ffffff', borderRadius: '4px', textAlign: 'left' }}>
              <div style={{ color: '#ea580c', marginBottom: '1.5rem' }}><Shield size={32} /></div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Citizen Portal</h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
                Empowering residents with rapid AI-guided incident analysis, silent SOS emergency taps, and real-time incident tracking maps.
              </p>
            </div>

            {/* Service 2 */}
            <div className="glass-panel" style={{ padding: '2.5rem', background: '#ffffff', borderRadius: '4px', textAlign: 'left' }}>
              <div style={{ color: '#ea580c', marginBottom: '1.5rem' }}><Activity size={32} /></div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Hospital & Dispatch</h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
                Seamless hospital coordination and rapid dispatch system. Map telemetry tracking ambulance units from origin directly to targets.
              </p>
            </div>

            {/* Service 3 */}
            <div className="glass-panel" style={{ padding: '2.5rem', background: '#ffffff', borderRadius: '4px', textAlign: 'left' }}>
              <div style={{ color: '#ea580c', marginBottom: '1.5rem' }}><MapPin size={32} /></div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Police Command</h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
                Intelligent police portal supporting active complaint queues, real-time tactical Leaflet map synchronization, and route simulations.
              </p>
            </div>

            {/* Service 4 */}
            <div className="glass-panel" style={{ padding: '2.5rem', background: '#ffffff', borderRadius: '4px', textAlign: 'left' }}>
              <div style={{ color: '#ea580c', marginBottom: '1.5rem' }}><Volume2 size={32} /></div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Silent SOS & Telemetry</h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
                Secure, quiet dispatch triggering using rapid click algorithms. Streams background audio telemetry directly to responders.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FOOTER SECTION ─── */}
      <footer id="contact" style={{ background: '#ffffff', padding: '6rem 4rem 4rem', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ 
          maxWidth: '1440px', 
          margin: '0 auto', 
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '4rem'
        }}>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '3rem'
          }}>
            
            {/* Col 1 */}
            <div style={{ minWidth: '220px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  border: '2px solid #0f172a',
                  transform: 'rotate(45deg)',
                  marginRight: '6px'
                }}>
                  <span style={{ transform: 'rotate(-45deg)', fontWeight: 950, fontSize: '0.52rem', color: '#0f172a' }}>TMI</span>
                </div>
                <span style={{ fontWeight: 900, fontSize: '0.82rem', letterSpacing: '0.08em', color: '#0f172a', textTransform: 'uppercase' }}>SmartTraffic</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, maxWidth: '200px', marginBottom: '1.5rem', fontFamily: "'Inter', sans-serif" }}>
                High-priority intelligent emergency routing and response portal.
              </p>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <a href="#linkedin" style={{ color: '#cbd5e1', display: 'flex' }}>
                  <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
                </a>
                <a href="#twitter" style={{ color: '#cbd5e1', display: 'flex' }}>
                  <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.48.75 2.78 1.9 3.55-.7 0-1.36-.2-1.94-.53v.05c0 2.05 1.46 3.76 3.4 4.15-.36.1-.73.15-1.12.15-.27 0-.54-.03-.8-.08.54 1.68 2.1 2.9 3.95 2.94-1.44 1.13-3.26 1.8-5.23 1.8-.34 0-.67-.02-1-.06C2.62 21.02 4.88 22 7.31 22 14.86 22 19 15.75 19 10.33v-.53c.8-.57 1.49-1.3 2.04-2.13z"/></svg>
                </a>
                <a href="#instagram" style={{ color: '#cbd5e1', display: 'flex' }}>
                  <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
              </div>
            </div>

            {/* Col 2 */}
            <div style={{ minWidth: '150px', textAlign: 'left' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>SERVICES</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem', fontFamily: "'Inter', sans-serif" }}>
                <li><a href="#traffic" style={{ textDecoration: 'none', color: '#64748b' }}>Traffic Control</a></li>
                <li><a href="#equipment" style={{ textDecoration: 'none', color: '#64748b' }}>Equipment Rentals</a></li>
                <li><a href="#engineering" style={{ textDecoration: 'none', color: '#64748b' }}>Engineering</a></li>
                <li><a href="#infrastructure" style={{ textDecoration: 'none', color: '#64748b' }}>Infrastructure</a></li>
                <li><a href="#permits" style={{ textDecoration: 'none', color: '#64748b' }}>Permits</a></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div style={{ minWidth: '150px', textAlign: 'left' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>PRODUCTS</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem', fontFamily: "'Inter', sans-serif" }}>
                <li><a href="#valtir" style={{ textDecoration: 'none', color: '#64748b' }}>Valtir Absorption</a></li>
                <li><a href="#workzone" style={{ textDecoration: 'none', color: '#64748b' }}>Work Zone Equipment</a></li>
                <li><a href="#delineation" style={{ textDecoration: 'none', color: '#64748b' }}>Traffic Delineation</a></li>
                <li><a href="#signs" style={{ textDecoration: 'none', color: '#64748b' }}>Signs & Hardware</a></li>
              </ul>
            </div>

            {/* Col 4 */}
            <div style={{ minWidth: '150px', textAlign: 'left' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>LOCATIONS</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem', fontFamily: "'Inter', sans-serif" }}>
                <li><a href="#hq" style={{ textDecoration: 'none', color: '#64748b' }}>Headquarters</a></li>
                <li><a href="#socal" style={{ textDecoration: 'none', color: '#64748b' }}>Southern California</a></li>
                <li><a href="#bayarea" style={{ textDecoration: 'none', color: '#64748b' }}>Bay Area</a></li>
                <li><a href="#northwest" style={{ textDecoration: 'none', color: '#64748b' }}>Pacific Northwest</a></li>
              </ul>
            </div>

            {/* Col 5 */}
            <div style={{ minWidth: '220px', textAlign: 'left' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>CONTACT US</h4>
              <p style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>Headquarters</p>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, marginTop: '0.5rem', fontFamily: "'Inter', sans-serif" }}>
                4900 Airport Plaza Dr, Ste 300<br/>
                Long Beach, CA 90815
              </p>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem', fontFamily: "'Inter', sans-serif" }}>
                Phone: (866) 790-2698
              </p>
            </div>

          </div>

          <div style={{ 
            borderTop: '1px solid #f1f5f9', 
            paddingTop: '2rem', 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '0.75rem', 
            color: '#94a3b8' 
          }}>
            <span>© {new Date().getFullYear()} Traffic Management Inc. All rights reserved.</span>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="#privacy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy Policy</a>
              <a href="#tos" style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms of Service</a>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default CitizenLogin;
