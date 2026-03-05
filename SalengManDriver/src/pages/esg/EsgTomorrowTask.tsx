import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EsgTomorrowTask.module.css';
import PageHeader from '../../components/PageHeader';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';
import profileLogo from '../../assets/icon/profile.svg';

const EsgTomorrowTask: React.FC = () => {
    const navigate = useNavigate();

    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNextTasks();
    }, []);

    const fetchNextTasks = async () => {
        setLoading(true);
        try {
            const token = getToken();
            if (!token) return;
            const data = await api.getEsgDriverNextTask(token);
            setTasks(data.tasks || []);
        } catch (error) {
            console.error('Failed to fetch next tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const groupTasksByDate = (taskList: any[]) => {
        const groups: { [key: string]: any[] } = {};
        taskList.forEach(task => {
            const dateKey = new Date(task.date).toDateString();
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(task);
        });
        return groups;
    };

    const getDateHeader = (dateString: string) => {
        const date = new Date(dateString);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === tomorrow.toDateString()) {
            return "พรุ่งนี้";
        }

        return date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const groupedTasks = groupTasksByDate(tasks);
    const sortedDates = Object.keys(groupedTasks).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return (
        <div className={styles.container}>
            <PageHeader title="งานต่อไป" onBack={() => navigate('/esg/driver')} />

            <div className={styles.dateHeader}>
                <span className={styles.dateLabel}>งานทั้งหมดในอนาคต</span>
            </div>

            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>กำลังโหลด...</div>
                ) : tasks.length === 0 ? (
                    <div className={styles.empty}>ไม่มีงานที่คุณรับไว้ในอนาคต</div>
                ) : (
                    <div className={styles.groupedContainer}>
                        {sortedDates.map((dateKey) => (
                            <div key={dateKey} className={styles.dateGroup}>
                                <div className={styles.groupHeader}>
                                    <span className={styles.groupHeaderText}>{getDateHeader(dateKey)}</span>
                                    <div className={styles.divider} />
                                </div>
                                <div className={styles.subList}>
                                    {groupedTasks[dateKey].map((task) => (
                                        <div
                                            key={task.tasks_id}
                                            className={`${styles.subCard} ${task.status === 'skipped' ? styles.skippedCard : ''}`}
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
                                                    </div>
                                                    <p className={styles.packageText}>
                                                        package : {task.package_name}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EsgTomorrowTask;
