import { useState, useEffect } from 'react';
import { Mail, Search, Users, Truck, ArrowLeft, X, Calendar, Phone } from 'lucide-react';
import styles from './NotifyUsers.module.css';
import { API_URL } from '../config';

interface User {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    role: string;
    avatar_url: string;
    created_at: string;
}

const NotifyUsers = () => {
    // List state
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Selection/Form state
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [notifyIdentifier, setNotifyIdentifier] = useState('');
    const [notifyHeader, setNotifyHeader] = useState('');
    const [notifyContent, setNotifyContent] = useState('');
    const [sendingNotify, setSendingNotify] = useState(false);
    const [notifyStatus, setNotifyStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const token = localStorage.getItem('token');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSendNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        setSendingNotify(true);
        setNotifyStatus(null);
        try {
            const response = await fetch(`${API_URL}/admin/notifications/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_identifier: notifyIdentifier,
                    notify_header: notifyHeader,
                    notify_content: notifyContent
                })
            });
            const data = await response.json();
            if (response.ok) {
                setNotifyStatus({ type: 'success', message: 'Notification sent successfully!' });
                setNotifyIdentifier('');
                setNotifyHeader('');
                setNotifyContent('');
                setTimeout(() => {
                    setNotifyStatus(null);
                    setSelectedUser(null);
                }, 3000);
            } else {
                setNotifyStatus({ type: 'error', message: data.error || 'Failed to send notification' });
            }
        } catch (error) {
            setNotifyStatus({ type: 'error', message: 'An error occurred while sending notification' });
        } finally {
            setSendingNotify(false);
        }
    };

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        setNotifyIdentifier(user.id);
        setNotifyHeader('');
        setNotifyContent('');
        setNotifyStatus(null);
    };

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className={styles.notifyPage}>
            <div className="header">
                <div>
                    <h1>Send Notifications</h1>
                </div>
            </div>

            <div className={styles.contentCard}>
                {!selectedUser ? (
                    <div className={styles.listView}>
                        <div className={styles.listHeader}>
                            <div className={styles.headerTitle}>
                                <Users size={20} />
                                <h2>Select Recipient</h2>
                            </div>
                            <div className={styles.searchBox}>
                                <Search size={18} className={styles.searchIcon} />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button className={styles.clearSearch} onClick={() => setSearchTerm('')}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className={styles.tableWrapper}>
                            {loading ? (
                                <div className={styles.loadingState}>
                                    <div className="spinner"></div>
                                    <p>Loading users...</p>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <Users size={48} />
                                    <p>No users found</p>
                                </div>
                            ) : (
                                <table className={styles.usersTable}>
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Contact</th>
                                            <th>Role</th>
                                            <th>Joined At</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((u) => (
                                            <tr key={u.id} className={styles.clickableRow} onClick={() => handleSelectUser(u)}>
                                                <td>
                                                    <div className={styles.userInfo}>
                                                        <div className={styles.userAvatar}>
                                                            {u.avatar_url ? (
                                                                <img src={u.avatar_url} alt={u.full_name} />
                                                            ) : (
                                                                u.role === 'driver' ? <Truck size={18} /> : <Users size={18} />
                                                            )}
                                                        </div>
                                                        <div className={styles.userDetailsText}>
                                                            <span className={styles.userNameText}>{u.full_name || 'Anonymous'}</span>
                                                            <span className={styles.userIdText}>ID: {u.id.substring(0, 8)}...</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.contactInfo}>
                                                        <div className={styles.contactItem}>
                                                            <Mail size={12} />
                                                            <span>{u.email}</span>
                                                        </div>
                                                        {u.phone && (
                                                            <div className={styles.contactItem}>
                                                                <Phone size={12} />
                                                                <span>{u.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`${styles.roleChip} ${styles[u.role]}`}>
                                                        {u.role.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={styles.dateInfo}>
                                                        <Calendar size={12} />
                                                        <span>{formatDate(u.created_at)}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <button className={styles.messageBtn}>
                                                        <Mail size={16} />
                                                        <span>Message</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className={styles.formView}>
                        <div className={styles.formHeader}>
                            <button className={styles.backBtn} onClick={() => setSelectedUser(null)}>
                                <ArrowLeft size={18} />
                                <span>Back to List</span>
                            </button>
                        </div>

                        <div className={styles.notifyFormCard}>
                            <div className={styles.notifyHeader}>
                                <div className={styles.headerIconContainer}>
                                    {selectedUser.avatar_url ? (
                                        <img src={selectedUser.avatar_url} className={styles.selectedAvatar} alt="" />
                                    ) : (
                                        <Mail size={24} className={styles.headerIcon} />
                                    )}
                                </div>
                                <div>
                                    <h3>Message to {selectedUser.full_name || selectedUser.email}</h3>
                                    <p className={styles.formSubtitle}>This direct message will appear in their notification center.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSendNotification} className={styles.notifyForm}>
                                <div className={styles.formGroup}>
                                    <label>Recipient ID (UUID)</label>
                                    <input
                                        type="text"
                                        value={notifyIdentifier}
                                        onChange={(e) => setNotifyIdentifier(e.target.value)}
                                        readOnly
                                        className={styles.readOnlyInput}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Message Title</label>
                                    <input
                                        type="text"
                                        placeholder="Enter notification title..."
                                        value={notifyHeader}
                                        onChange={(e) => setNotifyHeader(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Message Content</label>
                                    <textarea
                                        placeholder="Type your message here..."
                                        value={notifyContent}
                                        onChange={(e) => setNotifyContent(e.target.value)}
                                        required
                                    />
                                </div>

                                {notifyStatus && (
                                    <div className={`${styles.statusMessage} ${styles[notifyStatus.type]}`}>
                                        {notifyStatus.message}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className={styles.sendBtn}
                                    disabled={sendingNotify}
                                >
                                    {sendingNotify ? 'Sending...' : 'Send Notification Now'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotifyUsers;
