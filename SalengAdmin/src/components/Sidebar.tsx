import { NavLink } from 'react-router-dom';
import { Home, Users, ShoppingBag, MapPin, MessageCircle, Settings, LogOut } from 'lucide-react';

const Sidebar = () => {
    return (
        <div className="sidebar">
            <div className="logo-section">
                <MapPin className="text-primary" size={28} />
                <h2>Saleng Admin</h2>
            </div>

            <nav className="nav-links">
                <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <Home size={20} />
                    <span>Dashboard</span>
                </NavLink>
                <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <Users size={20} />
                    <span>Users</span>
                </NavLink>
                <NavLink to="/orders" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <ShoppingBag size={20} />
                    <span>Orders</span>
                </NavLink>
                <NavLink to="/chats" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <MessageCircle size={20} />
                    <span>Chats</span>
                </NavLink>
                <div style={{ flex: 1 }} />
                <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <Settings size={20} />
                    <span>Settings</span>
                </NavLink>
                <button className="nav-item" style={{ background: 'none', border: 'none', width: '100%', justifyContent: 'flex-start', color: 'var(--error)' }}>
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </nav>
        </div>
    );
};

export default Sidebar;
