import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './Reports.module.css';

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

const Reports = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'problem' | 'user'>('problem');
    const [problemReports, setProblemReports] = useState<ProblemReport[]>([]);
    const [userReports, setUserReports] = useState<UserReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('token');

    const fetchReports = async () => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = activeTab === 'problem' ? '/admin/reports/problem' : '/admin/reports/user';
            const response = await fetch(`${API_URL}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch reports');
            }

            if (Array.isArray(data)) {
                if (activeTab === 'problem') setProblemReports(data);
                else setUserReports(data);
            } else {
                console.error('Invalid reports data format:', data);
                setError('Invalid data received from server');
            }
        } catch (error: any) {
            console.error('Error fetching reports:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [activeTab]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className={styles.reportsPage}>
            <div className={styles.header}>
                <h1>Reports Management</h1>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'problem' ? styles.active : ''}`}
                        onClick={() => setActiveTab('problem')}
                    >
                        <AlertTriangle size={18} />
                        Problem Reports
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'user' ? styles.active : ''}`}
                        onClick={() => setActiveTab('user')}
                    >
                        <AlertTriangle size={18} />
                        User Reports
                    </button>
                </div>
            </div>

            <div className={styles.reportsContainerSingle}>
                {loading ? (
                    <div className="loading">Loading reports...</div>
                ) : error ? (
                    <div className="error-state text-error" style={{ padding: '2rem', textAlign: 'center' }}>
                        <AlertTriangle size={32} style={{ marginBottom: '1rem' }} />
                        <p>{error}</p>
                        <button
                            className="btn-secondary"
                            style={{ marginTop: '1rem' }}
                            onClick={fetchReports}
                        >
                            Retry
                        </button>
                    </div>
                ) : (activeTab === 'problem' ? problemReports : userReports).length === 0 ? (
                    <div className="empty-state">No reports found</div>
                ) : (
                    <div className={styles.reportsGridList}>
                        {(activeTab === 'problem' ? problemReports : userReports).map((report: ProblemReport | UserReport) => (
                            <div
                                key={report.id}
                                className={`${styles.reportCard} ${report.is_read ? styles.read : styles.unread}`}
                                onClick={() => navigate(`/reports/${activeTab}/${report.id}`)}
                            >
                                <div className={styles.reportCardHeader}>
                                    <div className={styles.reportTitleRow}>
                                        <div className={styles.statusDot}></div>
                                        <h3>{report.header}</h3>
                                    </div>
                                    <span className={`${styles.statusBadge} ${report.is_read ? styles.read : styles.unread}`}>
                                        {report.is_read ? 'Complete' : 'New'}
                                    </span>
                                </div>
                                <div className={styles.reportCardFooter}>
                                    <span className={styles.date}>
                                        <Clock size={14} />
                                        {formatDate(report.timestamp)}
                                    </span>
                                    <ChevronRight size={18} className={styles.arrowIcon} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
