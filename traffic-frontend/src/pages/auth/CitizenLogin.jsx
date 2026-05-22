import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import api from '../../services/api';
import { Eye, EyeOff, Mail, Lock, ShieldAlert, Loader2, Sparkles, RefreshCw, Key, HeartPulse, UserCheck, Smartphone, AlertTriangle, CheckCircle, KeyRound, Clock } from 'lucide-react';

const CitizenLogin = () => {
  // Modes: 'signin' | 'signup' | 'passwordless'
  const [authMode, setAuthMode] = useState('signin'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      // 1. Verify OTP in Laravel backend
      await api.post('/auth/otp/verify', {
        email: otpEmail,
        otp: fullCode
      });

      // 2. Sign in to Supabase and update user metadata to otp_verified: true
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: otpEmail,
        password: password || tempPassword
      });

      if (signInErr) {
        // If login failed (e.g., password changed or state cleared), redirect to signin
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
      // AuthContext will automatically redirect them since isVerified becomes true!
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

    // 1. Empty field validation
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

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    // 3. Password length validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // 4. Confirm password match
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

        // Force sign out to ensure the user is NOT directly logged in
        await supabase.auth.signOut();

        // Save email and password for brief login verification
        setOtpEmail(trimmedEmail);
        setTempPassword(password);
        setOtpCode(['', '', '', '', '', '']);

        // Call Laravel OTP send - wrapped in try-catch to expose real backend errors
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

        // Check if verified via custom otp_verified flag
        const isVerified = data.user?.user_metadata?.otp_verified === true;
        if (data.user && !isVerified) {
          setError('Please verify your email before signing in.');
          setOtpEmail(trimmedEmail);
          setTempPassword(password);
          setOtpCode(['', '', '', '', '', '']);
          
          await supabase.auth.signOut();
          
          // Request a new OTP
          try {
            await api.post('/auth/otp/send', { email: trimmedEmail });
          } catch (otpErr) {
            console.error("Error sending OTP on unverified login:", otpErr);
            const backendMsg = otpErr.response?.data?.message || 'Failed to send OTP verification code.';
            setError(`Please verify your email. (OTP Send Failed: ${backendMsg})`);
          }
          
          setVerificationStep('otp');
        } else {
          // Will redirect natively inside the useEffect below or inside AuthContext
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

      // 1. Update user metadata in Supabase (Non-blocking)
      try {
        await supabase.auth.updateUser({
          data: { full_name: finalName }
        });
      } catch (sbErr) {
        console.warn("Supabase user metadata update bypassed:", sbErr);
      }

      // 2. Save custom profile fields inside MongoDB!
      const profileRes = await api.post('/auth/profile/complete', {
        email: user.email,
        name: finalName,
        phone: profilePhone.trim(),
        emergency_contact: profileEmergency.trim()
      });

      // 3. Update active user state in context using MongoDB response data
      const mongoUser = profileRes.data.data;
      setUser({
        ...user,
        name: mongoUser.name,
        profileCompleted: mongoUser.profile_completed,
        phone: mongoUser.phone || '',
        emergencyContact: mongoUser.emergency_contact || '',
      });

      // 4. Redirect cleanly to dashboard
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
        background: 'var(--bg-color)',
        fontFamily: 'Outfit, Inter, sans-serif'
      }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(33, 112, 228, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2170e4', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
          <HeartPulse size={40} style={{ color: '#2170e4', position: 'absolute' }} />
        </div>
        <h3 style={{ marginTop: '2rem', fontSize: '1.2rem', fontWeight: 800, color: '#191c1e', letterSpacing: '-0.3px' }}>Verifying Civic Credentials...</h3>
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
        background: 'var(--bg-color)',
        padding: '1.5rem',
        fontFamily: 'Outfit, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#191c1e',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2.5rem 2rem',
          background: '#ffffff',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          borderRadius: '20px',
          boxSizing: 'border-box',
          textAlign: 'center',
          boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02)',
          animation: 'fadeIn 0.3s'
        }}>
          {/* Secured Citizen Badge */}
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(33, 112, 228, 0.08)', borderRadius: '50%', border: '1px solid rgba(33, 112, 228, 0.15)', marginBottom: '1.5rem' }}>
            <UserCheck size={36} style={{ color: '#2170e4' }} />
          </div>

          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.025em', color: '#191c1e' }}>Set Up Safety Profile</h2>
          <p style={{ margin: '0.4rem 0 2rem 0', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.45 }}>
            Welcome! Please complete your official civic safety profile before entering the tracking telemetry dashboard.
          </p>

          {profileError && (
            <div style={{
              background: 'rgba(186, 26, 26, 0.08)',
              border: '1px solid rgba(186, 26, 26, 0.18)',
              color: '#ba1a1a',
              padding: '0.8rem 1rem',
              borderRadius: '12px',
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
                  background: 'rgba(186, 26, 26, 0.12)', 
                  border: '1px solid rgba(186, 26, 26, 0.25)', 
                  color: '#ba1a1a', 
                  padding: '0.35rem 0.7rem', 
                  borderRadius: '6px', 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  width: 'fit-content',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(186, 26, 26, 0.2)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(186, 26, 26, 0.12)'}
              >
                🔄 Reset Stale Session (Try This If Account Was Deleted)
              </button>
            </div>
          )}

          <form onSubmit={handleProfileCompletionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
            
            {/* Name input */}
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Official Name <span style={{ color: '#2170e4' }}>*</span></label>
              <input
                type="text"
                placeholder="Enter your official name"
                value={officialName}
                onChange={e => setOfficialName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  background: '#ffffff',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  borderRadius: '12px',
                  color: '#191c1e',
                  outline: 'none',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = '#2170e4';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(33, 112, 228, 0.15)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Mobile phone input */}
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Official Mobile Phone (Optional)</label>
              <div style={{ position: 'relative' }}>
                <Smartphone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={profilePhone}
                  onChange={e => setProfilePhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem 0.7rem 2.4rem',
                    background: '#ffffff',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    borderRadius: '12px',
                    color: '#191c1e',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = '#2170e4';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(33, 112, 228, 0.15)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Emergency contact details input */}
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Emergency Contact Number (Optional)</label>
              <div style={{ position: 'relative' }}>
                <AlertTriangle size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ba1a1a' }} />
                <input
                  type="tel"
                  placeholder="Emergency contact's number"
                  value={profileEmergency}
                  onChange={e => setProfileEmergency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem 0.7rem 2.4rem',
                    background: '#ffffff',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    borderRadius: '12px',
                    color: '#191c1e',
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = '#2170e4';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(33, 112, 228, 0.15)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', width: '100%' }}>
              <button
                type="submit"
                disabled={profileSaving}
                style={{
                  width: '100%',
                  background: '#2170e4',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  borderRadius: '12px',
                  cursor: profileSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { if (!profileSaving) e.currentTarget.style.background = '#0058be'; }}
                onMouseOut={e => { if (!profileSaving) e.currentTarget.style.background = '#2170e4'; }}
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
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  color: '#64748b',
                  padding: '0.75rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.15)';
                  e.currentTarget.style.color = '#191c1e';
                  e.currentTarget.style.background = '#f1f5f9';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.background = 'transparent';
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-color)',
      padding: '1.5rem',
      fontFamily: 'Outfit, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      color: '#191c1e',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        padding: '2.5rem 2rem',
        background: '#ffffff',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        borderRadius: '20px',
        boxSizing: 'border-box',
        boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02)',
      }}>

        {/* ─── WORKFLOW A: BANKING / INSTAGRAM STYLE OTP VERIFICATION ─── */}
        {verificationStep === 'otp' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignSelf: 'center', padding: '1rem', background: 'rgba(33, 112, 228, 0.08)', borderRadius: '50%', border: '1px solid rgba(33, 112, 228, 0.15)', marginBottom: '0.5rem' }}>
              <KeyRound size={36} style={{ color: '#2170e4' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.025em', color: '#191c1e' }}>Enter Code</h2>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.45 }}>
                We sent a 6-digit secure code to:<br/>
                <strong style={{ color: '#191c1e', display: 'block', marginTop: '0.25rem' }}>{otpEmail}</strong>
              </p>
            </div>

            {/* Success and Error alerts */}
            {success && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.18)',
                color: '#10b981',
                padding: '0.9rem 1rem',
                borderRadius: '12px',
                fontSize: '0.88rem',
                textAlign: 'left',
                lineHeight: 1.4,
                boxShadow: '0 4px 12px rgba(15,23,42,0.02)'
              }}>
                <div style={{ fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle size={16} />
                  <span>OTP Sent Successfully</span>
                </div>
                {success}
              </div>
            )}

            {error && (
              <div style={{
                background: 'rgba(186, 26, 26, 0.08)',
                border: '1px solid rgba(186, 26, 26, 0.18)',
                color: '#ba1a1a',
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                textAlign: 'left',
                lineHeight: 1.4
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* 6 Digit Input Fields */}
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', margin: '0.5rem 0' }}>
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

                      // Auto focus next input
                      if (val && idx < 5) {
                        const nextInput = document.getElementById(`otp-input-${idx + 1}`);
                        nextInput?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otpCode[idx] && idx > 0) {
                        const prevInput = document.getElementById(`otp-input-${idx - 1}`);
                        prevInput?.focus();
                      }
                    }}
                    style={{
                      width: '48px',
                      height: '52px',
                      borderRadius: '12px',
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      background: '#ffffff',
                      color: '#191c1e',
                      fontSize: '1.4rem',
                      fontWeight: '700',
                      textAlign: 'center',
                      outline: 'none',
                      transition: 'all 0.2s',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = '#2170e4';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(33, 112, 228, 0.15)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                ))}
              </div>

              <div style={{ fontSize: '0.78rem', color: '#64748b', background: 'rgba(15, 23, 42, 0.02)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(15, 23, 42, 0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left', lineHeight: 1.45 }}>
                <Clock size={16} style={{ color: '#2170e4', flexShrink: 0 }} />
                <span>Code expires in 10 minutes.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#2170e4',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => {
                  if (!loading) e.currentTarget.style.background = '#0058be';
                }}
                onMouseOut={e => {
                  if (!loading) e.currentTarget.style.background = '#2170e4';
                }}
              >
                {loading ? <Loader2 className="animate-spin" size={16} style={{ margin: '0 auto' }} /> : 'Verify'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                style={{
                  width: '100%',
                  background: resendCooldown > 0 ? '#f1f5f9' : 'transparent',
                  color: resendCooldown > 0 ? '#94a3b8' : '#2170e4',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  padding: '0.75rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  borderRadius: '12px',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
              >
                <RefreshCw size={16} className={resendCooldown > 0 ? '' : 'animate-spin'} style={{ animationDuration: '4s' }} />
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
              </button>

              <button
                type="button"
                onClick={handleResetVerificationFlow}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  color: '#64748b',
                  padding: '0.75rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.15)';
                  e.currentTarget.style.color = '#191c1e';
                  e.currentTarget.style.background = '#f1f5f9';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          /* ─── WORKFLOW B: SECURE MINIMALIST LOGIN PANEL ─── */
          <div style={{ animation: 'fadeIn 0.3s' }}>
            
            {/* Header Block */}
            <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#191c1e' }}>
                {authMode === 'signup' ? 'Create an account' : authMode === 'passwordless' ? 'Passwordless login' : 'Welcome back'}
              </h1>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.9rem', color: '#64748b' }}>
                {authMode === 'signup' ? 'Sign up to access your safety portal' : authMode === 'passwordless' ? 'Get a secure email sign-in link' : 'Sign in to your account'}
              </p>
            </div>

            {/* Error/Success Banners */}
            {success && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.18)',
                color: '#10b981',
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                fontSize: '0.85rem',
                textAlign: 'left'
              }}>
                ✅ {success}
              </div>
            )}

            {error && (
              <div style={{
                background: 'rgba(186, 26, 26, 0.08)',
                border: '1px solid rgba(186, 26, 26, 0.18)',
                color: '#ba1a1a',
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                fontSize: '0.85rem',
                textAlign: 'left',
                lineHeight: 1.4
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Google OAuth & Passwordless buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  background: 'transparent',
                  color: '#191c1e',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  padding: '0.70rem 1.5rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onMouseOver={e => {
                  if (!loading) {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.15)';
                  }
                }}
                onMouseOut={e => {
                  if (!loading) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                  }
                }}
              >
                <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24">
                  <path
                    fill="#191c1e"
                    d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.92 1 1 5.92 1 12s4.92 11 11.24 11c6.59 0 11-4.63 11-11.2 0-.75-.08-1.33-.2-1.885H12.24z"
                  />
                </svg>
                Continue with Google
              </button>

              {/* Passwordless switcher button */}
              {authMode !== 'passwordless' ? (
                <button
                  type="button"
                  onClick={() => { setAuthMode('passwordless'); setError(''); setSuccess(''); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    background: 'transparent',
                    color: '#191c1e',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    padding: '0.70rem 1.5rem',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.15)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                  }}
                >
                  <Lock size={15} style={{ color: '#64748b' }} />
                  Continue with passwordless link
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setError(''); setSuccess(''); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    background: 'transparent',
                    color: '#191c1e',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    padding: '0.70rem 1.5rem',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.15)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                  }}
                >
                  Back to standard sign in
                </button>
              )}
            </div>

            {/* divider line */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '1.75rem 0', color: 'rgba(15, 23, 42, 0.08)' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(15, 23, 42, 0.08)' }} />
              <span style={{ fontSize: '0.78rem', color: '#64748b', padding: '0 0.75rem' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(15, 23, 42, 0.08)' }} />
            </div>

            {/* Form Fields Block */}
            {authMode === 'passwordless' ? (
              <form onSubmit={handlePasswordlessLinkSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      background: '#ffffff',
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      borderRadius: '12px',
                      color: '#191c1e',
                      outline: 'none',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s'
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = '#2170e4';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(33, 112, 228, 0.15)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: '#2170e4',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginTop: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => {
                    if (!loading) e.currentTarget.style.background = '#0058be';
                  }}
                  onMouseOut={e => {
                    if (!loading) e.currentTarget.style.background = '#2170e4';
                  }}
                >
                  {loading ? <Loader2 className="animate-spin" size={16} style={{ margin: '0 auto' }} /> : 'Email me a secure sign-in link'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
                
                {/* Email Input */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      background: '#ffffff',
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      borderRadius: '12px',
                      color: '#191c1e',
                      outline: 'none',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s'
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = '#2170e4';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(33, 112, 228, 0.15)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                 {/* Password Input with eye icon toggle */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                    {authMode !== 'signup' && (
                      <button
                        type="button"
                        onClick={() => alert('Please check your Supabase dashboard or your email for verification / credentials configuration.')}
                        style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                        onMouseOver={e => e.currentTarget.style.color = '#191c1e'}
                        onMouseOut={e => e.currentTarget.style.color = '#64748b'}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.7rem 2.5rem 0.7rem 0.9rem',
                        background: '#ffffff',
                        border: '1px solid rgba(15, 23, 42, 0.08)',
                        borderRadius: '12px',
                        color: '#191c1e',
                        outline: 'none',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s'
                      }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = '#2170e4';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(33, 112, 228, 0.15)';
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input (only in signup mode) */}
                {authMode === 'signup' && (
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '0.7rem 2.5rem 0.7rem 0.9rem',
                          background: '#ffffff',
                          border: '1px solid rgba(15, 23, 42, 0.08)',
                          borderRadius: '12px',
                          color: '#191c1e',
                          outline: 'none',
                          fontSize: '0.9rem',
                          boxSizing: 'border-box',
                          transition: 'all 0.2s'
                        }}
                        onFocus={e => {
                          e.currentTarget.style.borderColor = '#2170e4';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(33, 112, 228, 0.15)';
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
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
                    background: '#2170e4',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginTop: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => {
                    if (!loading) e.currentTarget.style.background = '#0058be';
                  }}
                  onMouseOut={e => {
                    if (!loading) e.currentTarget.style.background = '#2170e4';
                  }}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={16} style={{ margin: '0 auto' }} />
                  ) : authMode === 'signup' ? (
                    'Sign up'
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>
            )}

            {/* Bottom Form Switching Links */}
            <div style={{ marginTop: '2rem', fontSize: '0.88rem', color: '#64748b' }}>
              {authMode === 'signup' ? (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setAuthMode('signin'); setError(''); setSuccess(''); setPassword(''); setConfirmPassword(''); setShowPassword(false); setShowConfirmPassword(false); }} style={{ background: 'transparent', border: 'none', color: '#2170e4', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: '0.88rem', textDecoration: 'underline' }}>
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don’t have an account?{' '}
                  <button type="button" onClick={() => { setAuthMode('signup'); setError(''); setSuccess(''); setPassword(''); setConfirmPassword(''); setShowPassword(false); setShowConfirmPassword(false); }} style={{ background: 'transparent', border: 'none', color: '#2170e4', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: '0.88rem', textDecoration: 'underline' }}>
                    Sign up
                  </button>
                </>
              )}
            </div>

            {/* Footer fine print */}
            <div style={{ marginTop: '2.5rem', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4 }}>
              By continuing, you agree to SmartTraffic’s{' '}
              <a href="#tos" style={{ color: '#64748b', textDecoration: 'underline' }}>Terms of Service</a> and{' '}
              <a href="#privacy" style={{ color: '#64748b', textDecoration: 'underline' }}>Privacy Policy</a>, and to receive periodic emails with updates.
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default CitizenLogin;
