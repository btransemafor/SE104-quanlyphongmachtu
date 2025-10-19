import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PatientManagement from './pages/PatientManagement';
import AppointmentManagement from './pages/AppointmentManagement';
import MedicalRecordForm from './pages/MedicalRecordForm';
import MedicalHistory from './pages/MedicalHistory';
import MedicalHistoryOverview from './pages/MedicalHistoryOverview';
import MedicalRecordsManagement from './pages/MedicalRecordsManagement';
import DoctorMedicalHistory from './pages/DoctorMedicalHistory';
import InvoiceManagement from './pages/InvoiceManagement';
import InvoiceDetails from './pages/InvoiceDetails';
import MedicineManagement from './pages/MedicineManagement';
import DiseaseManagement from './pages/DiseaseManagement';
import UnitManagement from './pages/UnitManagement';
import UsageMethodManagement from './pages/UsageMethodManagement';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import RevenueReport from './pages/RevenueReport';
import MedicineUsageReport from './pages/MedicineUsageReport';
import PatientStatsReport from './pages/PatientStatsReport';
import ReceiptManagement from './pages/ReceiptManagement'; 
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={
          <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
            <PatientManagement />
          </ProtectedRoute>
        } />
        <Route path="/appointments" element={<AppointmentManagement />} />
        <Route path="/medical-record/:appointmentId" element={
          <ProtectedRoute allowedRoles={['doctor', 'admin']}>
            <MedicalRecordForm />
          </ProtectedRoute>
        } />
        <Route path="/medical-history" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MedicalHistoryOverview />
          </ProtectedRoute>
        } />
        <Route path="/doctor-medical-history" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorMedicalHistory />
          </ProtectedRoute>
        } />
        <Route path="/medical-history/:patientId" element={
          <ProtectedRoute allowedRoles={['doctor', 'admin']}>
            <MedicalHistory />
          </ProtectedRoute>
        } />
        <Route path="/medical-records" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MedicalRecordsManagement />
          </ProtectedRoute>
        } />
        <Route path="/invoices" element={
          <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
            <InvoiceManagement />
          </ProtectedRoute>
        } />
        <Route path="/invoices/:id" element={
          <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
            <InvoiceDetails />
          </ProtectedRoute>
        } />
        <Route path="/medicines" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MedicineManagement />
          </ProtectedRoute>
        } />
        <Route path="/diseases" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DiseaseManagement />
          </ProtectedRoute>
        } />
        <Route path="/units" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <UnitManagement />
          </ProtectedRoute>
        } />
        <Route path="/usage-methods" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <UsageMethodManagement />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/reports/revenue" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <RevenueReport />
          </ProtectedRoute>
        } />
        <Route path="/reports/medicine-usage" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MedicineUsageReport />
          </ProtectedRoute>
        } />
        <Route path="/reports/patient-stats" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PatientStatsReport />
          </ProtectedRoute>
        } />
        <Route path="/receipts" element={<ReceiptManagement />} />

        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
