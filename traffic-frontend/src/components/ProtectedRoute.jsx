import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ROLE_HOMES = {
  admin:           '/admin',
  super_admin:     '/super_admin',
  citizen:         '/citizen',
  traffic_police:  '/police',
  ambulance_staff: '/ambulance',
  hospital_admin:  '/hospital-admin',
  hospital_driver: '/hospital-staff',
  hospital_staff:  '/hospital-staff',
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return null; // Block routing and render nothing (no white flashes) until hydration completes
  }

  if (!user) {
    // STRICT SEPARATION: Redirect unauthenticated citizen routes to /citizen-login, and command center routes to /login
    if (location.pathname.startsWith('/citizen') || (allowedRoles && allowedRoles.includes('citizen'))) {
      return <Navigate to="/citizen-login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated but accessing route they are not authorized for
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const home = ROLE_HOMES[user.role] || '/login';
    return <Navigate to={home} replace />;
  }

  return children;
};

export default ProtectedRoute;
