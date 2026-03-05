import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EsgTodayTasks.module.css';
import PageHeader from '../../components/PageHeader';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';
import profileLogo from '../../assets/icon/profile.svg';

const EsgTodayTasks: React.FC = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTodayTasks();
    }, []);

    const fetchTodayTasks = async () => {
        setLoading(true);
        try {
            const token = getToken();
            if (!token) return;
            const data = await api.getEsgDriverTodayTasks(token);
            setTasks(data.tasks || []);
        } catch (error) {
            console.error('Failed to fetch today tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <PageHeader title="คนทิ้งขยะวันนี้" onBack={() => navigate('/esg/driver')} />

            <div className={styles.dateHeader}>
                <span className={styles.dateLabel}>รายการเก็บขยะประจำวัน</span>
            </div>

            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>กำลังโหลด...</div>
                ) : tasks.length === 0 ? (
                    <div className={styles.empty}>วันนี้ไม่มีรายการที่คุณต้องเก็บขยะ</div>
                ) : (
                    <div className={styles.subList}>
                        {tasks.map((task) => (
                            <div
                                key={task.tasks_id}
                                className={styles.subCard}
                                onClick={() => navigate(`/esg/subscriptor-detail/${task.esg_subscriptor_id}/${new Date(task.date).getDate()}`)}
                            >
                                <div className={styles.subInfo}>
                                    <div className={styles.avatarContainer}>
                                        <img src={task.user_avatar || profileLogo} className={styles.avatar} alt="Avatar" />
                                        <div className={styles.onlineIndicator} />
                                    </div>
                                    <div className={styles.details}>
                                        <div className={styles.nameRow}>
                                            <h3 className={styles.name}>{task.user_name}</h3>
                                            <span className={styles.statusBadge}>นัดหมายแล้ว</span>
                                        </div>
                                        <p className={styles.dateText}>
                                            เวลานัดหมาย : 08:00 น.
                                        </p>
                                        <div className={styles.tags}>
                                            <span className={styles.packageTag}>{task.package_name}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.sideContent}>
                                    <span className={styles.arrow}>›</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EsgTodayTasks;
