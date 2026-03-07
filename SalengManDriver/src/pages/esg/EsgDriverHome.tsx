import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EsgDriverHome.module.css';
import PageHeader from '../../components/PageHeader';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';
import BottomNav from '../../components/BottomNav';

const EsgDriverHome: React.FC = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = getToken();
                if (!token) return;
                const data = await api.getEsgDriverProfile(token);
                setProfile(data);
            } catch (error) {
                console.error('Failed to fetch profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className={styles.container}>
            <PageHeader title="ESG Driver Dashboard" onBack={() => navigate('/home')} />
            <div className={styles.content}>
                {/* Stats Section */}
                <span className={styles.sectionLabel}>สรุปผลงานของคุณ</span>
                <div className={styles.statsGrid}>
                    <div className={styles.statCard} onClick={() => navigate('/esg/deposit')}>
                        <div className={`${styles.statIconWrapper} ${styles.moneyIcon}`}>฿</div>
                        <span className={styles.statLabel}>Coin สะสม</span>
                        <span className={styles.statValue}>{profile?.coin || 0}</span>
                    </div>
                    <div className={styles.statCard} onClick={() => navigate('/esg/weight_stats')}>
                        <div className={`${styles.statIconWrapper} ${styles.weightIcon}`}>♻</div>
                        <span className={styles.statLabel}>ขยะสะสม (kg)</span>
                        <span className={styles.statValue}>{profile?.weight_accumulate || 0}</span>
                    </div>
                </div>

                {/* Primary Action: Start Job Today */}
                <span className={styles.sectionLabel}>ภารกิจวันนี้</span>
                <div
                    className={styles.wideServiceCard}
                    onClick={() => navigate('/esg/today_tasks')}
                >
                    <div className={styles.wideServiceIconWrapper}>
                        <svg className={styles.serviceIcon} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" />
                        </svg>
                    </div>
                    <div className={styles.wideServiceContent}>
                        <h3 className={styles.wideServiceTitle}>เริ่มงานวันนี้</h3>
                        <p className={styles.wideServiceSubtitle}>
                            {profile?.todayJobsCount > 0
                                ? `คุณมีงาน ${profile.todayJobsCount} รายการวันนี้`
                                : 'วันนี้คุณไม่มีงานที่ต้องรับผิดชอบ'}
                        </p>
                    </div>
                </div>

                {/* Secondary Actions */}
                <span className={styles.sectionLabel}>จัดการงาน</span>
                <div className={styles.actionGrid}>
                    <button className={styles.tomorrowJobButton} onClick={() => navigate('/esg/tomorrow_task')}>
                        <span>งานต่อไป</span>
                        <span className={styles.countBadge}>{profile?.tomorrowJobsCount || 0}</span>
                    </button>
                    <button className={styles.menuButton} onClick={() => navigate('/esg/search_sub')}>
                        <span>ตารางงานสัญญาประจำ</span>
                        <span className={styles.menuIcon}>›</span>
                    </button>
                    <button className={styles.menuButton} onClick={() => navigate('/esg/task_history')}>
                        <span>ประวัติการทำงาน</span>
                        <span className={styles.menuIcon}>›</span>
                    </button>
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default EsgDriverHome;
