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
                                onClick={() => navigate(`/esg/task-monitor/${task.tasks_id}`)}
                            >
                                <div className={styles.subInfo}>
                                    <div className={styles.avatarContainer}>
                                        <img src={task.user_avatar || profileLogo} className={styles.avatar} alt="Avatar" />
                                        <div className={styles.onlineIndicator} />
                                    </div>
                                    <div className={styles.details}>
                                        <div className={styles.nameRow}>
                                            <h3 className={styles.name}>{task.user_name}</h3>
                                            <span
                                                className={styles.statusBadge}
                                                style={{
                                                    backgroundColor: `var(--${task.status}-bg)`,
                                                    color: `var(--${task.status}-text)`,
                                                    border: `1px solid var(--${task.status}-border)`
                                                }}
                                            >
                                                {task.status}
                                            </span>
                                        </div>
                                        <p className={styles.packageText}>
                                            package : {task.package_name}
                                        </p>
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
