import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    User,
    Mail,
    Clock,
    Trash2,
    ArrowLeft,
    Eye,
    EyeOff
} from 'lucide-react';
import styles from './ReportDetailView.module.css';

interface ProblemReport {
    id: number;
    user_id: string;
    header: string;
    content: string;
    image_url: string | null;
    is_read: boolean;
    timestamp: string;
    reporter_name: string;
    reporter_email: string;
}

interface UserReport {
    id: number;
    reporter_id: string;
    reported_user_id: string;
    header: string;
    content: string;
    image_url: string | null;
    is_read: boolean;
    timestamp: string;
    reporter_name: string;
    reporter_email: string;
    reported_name: string;
    reported_email: string;
}

const ReportDetailView = () => {
    const { type, id } = useParams<{ type: string; id: string }>();
    const navigate = useNavigate();
    const [report, setReport] = useState<ProblemReport | UserReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('token');

    const fetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = `/admin/reports/${type}/${id}`;
            const response = await fetch(`${API_URL}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch report');
            }

            setReport(data);
        } catch (err: any) {
            console.error('Error fetching report:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [type, id]);

    const toggleRead = async () => {
        if (!report) return;
        try {
            const endpoint = `/admin/reports/${type}/${report.id}/read`;
            await fetch(`${API_URL}${endpoint}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ is_read: !report.is_read })
            });
            setReport({ ...report, is_read: !report.is_read });
        } catch (err) {
            console.error('Error toggling read status:', err);
        }
    };

    const deleteReport = async () => {
        if (!report || !window.confirm('Are you sure you want to delete this report?')) return;
        try {
            const endpoint = `/admin/reports/${type}/${report.id}`;
            await fetch(`${API_URL}${endpoint}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            navigate('/reports');
        } catch (err) {
            console.error('Error deleting report:', err);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) return <div className="loading">Loading report details...</div>;
    if (error) return <div className="error-state text-error">{error}</div>;
    if (!report) return <div className="empty-state">Report not found</div>;

    return (
        <div className={styles.reportDetailPage}>
            <button className={styles.backBtn} onClick={() => navigate('/reports')}>
                <ArrowLeft size={18} />
                Back to Reports
            </button>

            <div className={`${styles.reportDetailContainer} card`}>
                <div className={styles.detailHeader}>
                    <div className={styles.statusBadge} style={{
                        backgroundColor: report.is_read ? '#22c55e20' : '#f59e0b20',
                        color: report.is_read ? '#22c55e' : '#f59e0b'
                    }}>
                        {report.is_read ? 'COMPLETED' : 'PENDING'}
                    </div>
                    <h1>{report.header}</h1>
                    <div className={styles.timestamp}>
                        <Clock size={14} />
                        {formatDate(report.timestamp)}
                    </div>
                </div>

                <div className={styles.detailGrid}>
                    <div className={styles.detailMain}>
                        <div className={styles.detailSection}>
                            <h3 className={styles.sectionTitle}>Report Content</h3>
                            <div className={styles.contentBox}>
                                {report.content}
                            </div>
                        </div>

                        {report.image_url && (
                            <div className={styles.detailSection}>
                                <h3 className={styles.sectionTitle}>Evidence</h3>
                                <div className={styles.evidenceImg}>
                                    <img
                                        src={report.image_url}
                                        alt="Evidence"
                                        onClick={() => window.open(report.image_url!, '_blank')}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.detailSidebar}>
                        <div className={styles.detailSection}>
                            <h3 className={styles.sectionTitle}>Reporter</h3>
                            <div className={styles.userCard}>
                                <div className={styles.userIcon}><User size={20} /></div>
                                <div className={styles.userDetails}>
                                    <div className={styles.name}>{report.reporter_name}</div>
                                    <div className={styles.email}><Mail size={12} /> {report.reporter_email}</div>
                                </div>
                            </div>
                        </div>

                        {type === 'user' && (report as UserReport).reported_name && (
                            <div className={styles.detailSection}>
                                <h3 className={styles.sectionTitle}>Reported User</h3>
                                <div className={`${styles.userCard} ${styles.reported}`}>
                                    <div className={styles.userIcon}><User size={20} /></div>
                                    <div className={styles.userDetails}>
                                        <div className={styles.name}>{(report as UserReport).reported_name}</div>
                                        <div className={styles.email}><Mail size={12} /> {(report as UserReport).reported_email}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={styles.detailActionsVertical}>
                            <button className={styles.btnSecondary} onClick={toggleRead}>
                                {report.is_read ? <EyeOff size={18} /> : <Eye size={18} />}
                                {report.is_read ? 'Mark as Unread' : 'Mark as Read'}
                            </button>
                            <button className={styles.btnError} onClick={deleteReport}>
                                <Trash2 size={18} />
                                Delete Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportDetailView;
