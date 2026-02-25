import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<div className="card"><h1>Users Management</h1><p>Coming soon...</p></div>} />
          <Route path="orders" element={<div className="card"><h1>Orders Management</h1><p>Coming soon...</p></div>} />
          <Route path="chats" element={<div className="card"><h1>Chats Monitoring</h1><p>Coming soon...</p></div>} />
          <Route path="settings" element={<div className="card"><h1>Settings</h1><p>Coming soon...</p></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
