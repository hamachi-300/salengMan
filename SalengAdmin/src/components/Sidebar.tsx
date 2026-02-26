import { NavLink } from 'react-router-dom';
import { Users, MapPin, X, FileText, Mail } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {

    return (
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <div className="logo-section">
                    <MapPin className="text-primary" size={28} />
                    <h2>Saleng Admin</h2>
                </div>
                <button className="mobile-close" onClick={onClose}>
                    <X size={24} />
                </button>
            </div>

            <nav className="nav-links">
                <NavLink
                    to="/users"
                    onClick={onClose}
                    className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                >
                    <Users size={20} />
                    <span>Users</span>
                </NavLink>
                <NavLink
                    to="/reports"
                    onClick={onClose}
                    className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                >
                    <FileText size={20} />
                    <span>Reports</span>
                </NavLink>
                <NavLink
                    to="/notify"
                    onClick={onClose}
                    className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                >
                    <Mail size={20} />
                    <span>Send Message</span>
                </NavLink>
                <div style={{ flex: 1 }} />
            </nav>
        </div>
    );
};

export default Sidebar;
