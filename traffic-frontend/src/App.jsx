import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import CitizenLogin from './pages/auth/CitizenLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import SuperAdminDashboard from './pages/super_admin/SuperAdminDashboard';
import IncidentAnalysis from './pages/admin/IncidentAnalysis';
import HospitalsManagement from './pages/admin/HospitalsManagement';
import HospitalDetail from './pages/admin/HospitalDetail';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import PoliceDashboard from './pages/police/PoliceDashboard';
import AmbulanceDashboard from './pages/ambulance/AmbulanceDashboard';
import HospitalAdminDashboard from './pages/hospital/HospitalAdminDashboard';
import HospitalEmployeePortal from './pages/hospital/HospitalEmployeePortal';
import SmartMap from './pages/SmartMap';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

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

const RoleRedirect = () => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/citizen-login" replace />;
  return <Navigate to={ROLE_HOMES[user.role] || '/login'} replace />;
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/citizen-login" element={<CitizenLogin />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<RoleRedirect />} />
          <Route path="dashboard" element={<RoleRedirect />} />

          {/* Admin */}
          <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="super_admin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="admin/incidents/:id" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><IncidentAnalysis /></ProtectedRoute>} />

          {/* Hospital Management — Admin/Super Admin */}
          <Route path="hospitals" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><HospitalsManagement /></ProtectedRoute>} />
          <Route path="hospitals/:id" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><HospitalDetail /></ProtectedRoute>} />

          {/* Smart Map */}
          <Route path="map" element={<ProtectedRoute allowedRoles={['admin','super_admin','traffic_police']}><ErrorBoundary><SmartMap /></ErrorBoundary></ProtectedRoute>} />

          {/* Citizen */}
          <Route path="citizen" element={<ProtectedRoute allowedRoles={['citizen']}><CitizenDashboard /></ProtectedRoute>} />

          {/* Traffic Police */}
          <Route path="police" element={<ProtectedRoute allowedRoles={['traffic_police']}><PoliceDashboard /></ProtectedRoute>} />

          {/* Ambulance */}
          <Route path="ambulance" element={<ProtectedRoute allowedRoles={['ambulance_staff']}><AmbulanceDashboard /></ProtectedRoute>} />

          {/* Hospital Admin Portal */}
          <Route path="hospital-admin" element={<ProtectedRoute allowedRoles={['hospital_admin']}><HospitalAdminDashboard /></ProtectedRoute>} />

          {/* Hospital Driver / Staff Portal */}
          <Route path="hospital-staff" element={<ProtectedRoute allowedRoles={['hospital_driver','hospital_staff']}><HospitalEmployeePortal /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
