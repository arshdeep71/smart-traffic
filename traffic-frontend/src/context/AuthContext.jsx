import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to handle active sessions
  const handleAuthSession = async (session) => {
    if (session && session.user) {
      const supabaseUser = session.user;
      
      // Determine verification status (Google provider accounts are pre-verified, passwordless matches requiresOtp false)
      const isGoogle = supabaseUser.app_metadata?.provider === 'google' || 
                       supabaseUser.identities?.some(id => id.provider === 'google') || false;
      const requiresOtp = supabaseUser.user_metadata?.otp_verified !== undefined;
      const isVerified = isGoogle || !requiresOtp || supabaseUser.user_metadata?.otp_verified === true;

      if (isVerified) {
        // Fetch custom profile data safely from MongoDB!
        let profileCompleted = false;
        let savedData = {};

        try {
          const profileRes = await api.post('/auth/profile/get', { email: supabaseUser.email });
          if (profileRes.data && profileRes.data.data) {
            const mongoUser = profileRes.data.data;
            profileCompleted = mongoUser.profile_completed;
            savedData = {
              fullName: mongoUser.name,
              phone: mongoUser.phone,
              emergencyContact: mongoUser.emergency_contact
            };
          }
        } catch (err) {
          console.log("Profile not yet created in MongoDB (needs onboarding).");
        }

        const citizenUserData = {
          uid: supabaseUser.id,
          name: savedData.fullName || supabaseUser.user_metadata?.full_name || 'Citizen User',
          email: supabaseUser.email,
          photoURL: supabaseUser.user_metadata?.avatar_url || '',
          role: 'citizen',
          emailVerified: true,
          profileCompleted,
          phone: savedData.phone || '',
          emergencyContact: savedData.emergencyContact || '',
          authProvider: isGoogle ? 'google' : 'credentials'
        };

        // Sync with Laravel Sanctum API in background
        const localToken = localStorage.getItem('traffic_token');
        if (!localToken) {
          try {
            const res = await api.post('/auth/login', { 
              email: 'citizen@traffic.local', 
              password: 'Password@123' 
            });
            localStorage.setItem('traffic_token', res.data.data.access_token);
          } catch (e) {
            console.error("Sanctum background sync error:", e);
          }
        }

        setUser(citizenUserData);
        localStorage.setItem('traffic_citizen_user', JSON.stringify(citizenUserData));
      } else {
        // Unverified citizen user - block access
        setUser(null);
        localStorage.removeItem('traffic_citizen_user');
        localStorage.removeItem('traffic_token');
      }
      setLoading(false);
    } else {
      // No active Supabase session, check standard credentials dashboard session
      const token = localStorage.getItem('traffic_token');
      const citizenUserStored = localStorage.getItem('traffic_citizen_user');
      
      if (citizenUserStored) {
        localStorage.removeItem('traffic_citizen_user');
        localStorage.removeItem('traffic_token');
        setUser(null);
        setLoading(false);
      } else if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data);
        } catch (error) {
          localStorage.removeItem('traffic_token');
          setUser(null);
        }
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    }
  };

  // Listen to Supabase Auth state modifications
  useEffect(() => {
    // 1. Check initial active session
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await handleAuthSession(session);
      } catch (err) {
        console.error("Initial Supabase session fetch error:", err);
        setLoading(false);
      }
    };

    checkInitialSession();

    // 2. Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Supabase onAuthStateChange triggered:", event);
      await handleAuthSession(session);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('traffic_token', res.data.data.access_token);
    setUser(res.data.data.user);
    return res.data.data.user;
  };

  const logout = async () => {
    if (user?.role === 'citizen') {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Supabase signOut error:", e);
      }
      localStorage.removeItem('traffic_citizen_user');
    } else {
      try {
        await api.post('/auth/logout');
      } catch (e) {}
    }
    localStorage.removeItem('traffic_token');
    setUser(null);
  };

  const authenticated = !!user;
  const onboardingComplete = user ? !!user.profileCompleted : false;

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser, 
      login, 
      logout, 
      loading, 
      authLoading: loading, 
      authenticated, 
      onboardingComplete 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
