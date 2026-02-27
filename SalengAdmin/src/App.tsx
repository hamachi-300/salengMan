import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Reports from './pages/Reports';
import ReportDetailView from './pages/ReportDetailView';
import UsersManagement from './pages/UsersManagement';
import NotifyUsers from './pages/NotifyUsers';
import Login from './pages/Login';
import './App.css';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/users" replace />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="notify" element={<NotifyUsers />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:type/:id" element={<ReportDetailView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
