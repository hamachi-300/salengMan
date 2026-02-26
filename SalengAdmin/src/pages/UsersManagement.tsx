import { useState, useEffect } from 'react';
import { Users, Truck, ShoppingBag, Ban, Search, UserCheck, Mail, Phone, Calendar, Coins, MapPin, X } from 'lucide-react';
import styles from './UsersManagement.module.css';

interface User {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    role: string;
    gender: string;
    avatar_url: string;
    created_at: string;
    coin: number;
    default_address: string;
}

interface BannedEmail {
    email: string;
    reason: string;
    banned_at: string;
}

const UsersManagement = () => {
    const [activeTab, setActiveTab] = useState<'all' | 'driver' | 'seller' | 'banned'>('all');
    const [users, setUsers] = useState<User[]>([]);
    const [bannedEmails, setBannedEmails] = useState<BannedEmail[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showBanModal, setShowBanModal] = useState(false);
    const [banEmail, setBanEmail] = useState('');
    const [banReason, setBanReason] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('token');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const roleParam = activeTab === 'all' || activeTab === 'banned' ? '' : `?role=${activeTab}`;
            const endpoint = activeTab === 'banned' ? '/admin/banned-emails' : `/admin/users${roleParam}`;

            const response = await fetch(`${API_URL}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (activeTab === 'banned') {
                setBannedEmails(data);
            } else {
                setUsers(data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [activeTab]);

    const handleBanUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/admin/users/ban`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: banEmail, reason: banReason })
            });
            if (response.ok) {
                setShowBanModal(false);
                setBanEmail('');
                setBanReason('');
                fetchUsers();
            }
        } catch (error) {
            console.error('Error banning user:', error);
        }
    };

    const handleUnban = async (email: string) => {
        if (!window.confirm(`Are you sure you want to unban ${email}?`)) return;
        try {
            const response = await fetch(`${API_URL}/admin/users/ban/${email}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                fetchUsers();
            }
        } catch (error) {
            console.error('Error unbanning user:', error);
        }
    };


    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const filteredData = activeTab === 'banned'
        ? bannedEmails.filter(b => b.email.toLowerCase().includes(searchTerm.toLowerCase()))
        : users.filter(u =>
            u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <div className={styles.usersManagementPage}>
            <div className="header">
                <div>
                    <h1>User Management</h1>
                </div>
            </div>

            <div className={styles.mgmtCard}>
                <div className={styles.cardHeaderWithSearch}>
                    <div className={styles.managementTabs}>
                        <button
                            className={`${styles.mgmtTab} ${activeTab === 'all' ? styles.active : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            <Users size={18} />
                            <span>All Users</span>
                        </button>
                        <button
                            className={`${styles.mgmtTab} ${activeTab === 'driver' ? styles.active : ''}`}
                            onClick={() => setActiveTab('driver')}
                        >
                            <Truck size={18} />
                            <span>Drivers</span>
                        </button>
                        <button
                            className={`${styles.mgmtTab} ${activeTab === 'seller' ? styles.active : ''}`}
                            onClick={() => setActiveTab('seller')}
                        >
                            <ShoppingBag size={18} />
                            <span>Sellers</span>
                        </button>
                        <button
                            className={`${styles.mgmtTab} ${activeTab === 'banned' ? styles.active : ''}`}
                            onClick={() => setActiveTab('banned')}
                        >
                            <Ban size={18} />
                            <span>Banned List</span>
                        </button>
                    </div>
                    <div className={styles.searchBox}>
                        <Search size={18} className={styles.searchIconMain} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm ? (
                            <button className={styles.searchClearBtn} onClick={() => setSearchTerm('')}>
                                <X size={14} />
                            </button>
                        ) : (
                            <div className={styles.searchShortcut}>
                                <span>K</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="users-list-container">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading users...</p>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="empty-state">
                            <Users size={48} />
                            <p>No users found</p>
                        </div>
                    ) : (
                        <div className={styles.usersTableWrapper}>
                            <table className={styles.usersTable}>
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Contact</th>
                                        <th>Role</th>
                                        <th>{activeTab === 'banned' ? 'Banned At' : 'Joined'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeTab === 'banned' ? (
                                        (filteredData as BannedEmail[]).map((b) => (
                                            <tr key={b.email}>
                                                <td>
                                                    <div className={styles.userInfo}>
                                                        <div className={`${styles.userAvatar} ${styles.banned}`}>
                                                            <Ban size={20} />
                                                        </div>
                                                        <div className={styles.userDetails}>
                                                            <span className={styles.userName}>{b.email}</span>
                                                            <span className={styles.userSubtext}>Reason: {b.reason}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><span className={styles.userSubtext}>{b.email}</span></td>
                                                <td><span className={`${styles.roleChip} ${styles.banned}`}>BANNED</span></td>
                                                <td>
                                                    <div className="date-info">
                                                        <Calendar size={14} />
                                                        <span>{formatDate(b.banned_at)}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <button className="btn-secondary" onClick={() => handleUnban(b.email)}>
                                                        <UserCheck size={16} />
                                                        <span>Unban</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        (filteredData as User[]).map((u) => (
                                            <tr key={u.id} onClick={() => { setSelectedUser(u); setShowDetailsModal(true); }} className={styles.clickableRow}>
                                                <td>
                                                    <div className={styles.userInfo}>
                                                        <div className={styles.userAvatar}>
                                                            {u.avatar_url ? (
                                                                <img src={u.avatar_url} alt={u.full_name} className={styles.userAvatarImg} />
                                                            ) : (
                                                                u.role === 'driver' ? <Truck size={20} /> : <Users size={20} />
                                                            )}
                                                        </div>
                                                        <div className={styles.userDetails}>
                                                            <span className={styles.userName}>{u.full_name || 'Anonymous User'}</span>
                                                            <span className={styles.userSubtext}>ID: {u.id.substring(0, 8)}...</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="contact-details">
                                                        <div className="contact-item">
                                                            <Mail size={14} />
                                                            <span>{u.email}</span>
                                                        </div>
                                                        <div className="contact-item">
                                                            <Phone size={14} />
                                                            <span>{u.phone || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`${styles.roleChip} ${styles[u.role]}`}>
                                                        {u.role.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="date-info">
                                                        <Calendar size={14} />
                                                        <span>{formatDate(u.created_at)}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showBanModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.banModal}>
                        <h2>Ban User Email</h2>
                        <p>This will prevent any user with this email from accessing or registering on the platform.</p>
                        <form onSubmit={handleBanUser}>
                            <div className={styles.formGroup}>
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={banEmail}
                                    onChange={(e) => setBanEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Reason for Ban</label>
                                <textarea
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                    placeholder="e.g. Repeated scamming, policy violation..."
                                    required
                                />
                            </div>
                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowBanModal(false)}>Cancel</button>
                                <button type="submit" className={styles.confirmBanBtn}>Confirm Ban</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDetailsModal && selectedUser && (
                <div className={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
                    <div className={styles.userDetailsModal} onClick={e => e.stopPropagation()}>
                        <button className={styles.closeDetailsBtn} onClick={() => setShowDetailsModal(false)}>
                            X
                        </button>

                        <div className={styles.detailsHeader}>
                            <div className={styles.detailsAvatar}>
                                {selectedUser.avatar_url ? (
                                    <img src={selectedUser.avatar_url} alt={selectedUser.full_name} className={styles.largeAvatarImg} />
                                ) : (
                                    selectedUser.role === 'driver' ? <Truck size={40} /> : <Users size={40} />
                                )}
                            </div>
                            <div className={styles.detailsTitle}>
                                <h2>{selectedUser.full_name || 'Anonymous User'}</h2>
                                <span className={`${styles.roleChip} ${styles[selectedUser.role]}`}>{selectedUser.role.toUpperCase()}</span>
                            </div>
                        </div>

                        <div className={styles.detailsGrid}>
                            <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                                <label><Mail size={16} /> Email Address</label>
                                <p>{selectedUser.email}</p>
                            </div>
                            <div className={styles.detailItem}>
                                <label><Phone size={16} /> Phone Number</label>
                                <p>{selectedUser.phone || 'N/A'}</p>
                            </div>
                            <div className={styles.detailItem}>
                                <label><Users size={16} /> Gender</label>
                                <p>{selectedUser.gender || 'Not specified'}</p>
                            </div>
                            <div className={styles.detailItem}>
                                <label><Coins size={16} /> Total Coins</label>
                                <p className={styles.coinDisplay}>{selectedUser.coin || 0}</p>
                            </div>
                            <div className={styles.detailItem}>
                                <label><Calendar size={16} /> Join Date</label>
                                <p>{formatDate(selectedUser.created_at)}</p>
                            </div>
                            <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                                <label><MapPin size={16} /> Default Address</label>
                                <p className={styles.addressDisplay}>{selectedUser.default_address || 'No address set'}</p>
                            </div>
                        </div>

                        <div className={styles.detailsFooter}>
                            <button className={styles.actionBtnFullWidth} onClick={() => {
                                setShowDetailsModal(false);
                                setBanEmail(selectedUser.email);
                                setShowBanModal(true);
                            }}>
                                <Ban size={18} />
                                <span>Ban This User</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersManagement;
