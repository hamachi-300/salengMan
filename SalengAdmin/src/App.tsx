import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Reports from './pages/Reports';
import ReportDetailView from './pages/ReportDetailView';
import UsersManagement from './pages/UsersManagement';
import NotifyUsers from './pages/NotifyUsers';
import './App.css';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
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
