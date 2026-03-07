import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EsgTodayTasks.module.css';
import PageHeader from '../../components/PageHeader';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';

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
            if (!token) {
                navigate('/signin');
                return;
            }
            const data = await api.getEsgDriverTodayTasks(token);
            setTasks(data.tasks || []);
        } catch (error) {
            console.error('Failed to fetch today tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status.toLowerCase()) {
            case 'complete':
            case 'completed':
                return { label: 'completed', color: '#22c55e' };
            case 'pending':
            case 'in-progress':
                return { label: 'pending', color: '#ff7a30' };
            case 'skipped':
                return { label: 'skipped', color: '#ef4444' };
            default:
                return { label: 'waiting', color: '#6366f1' };
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <PageHeader title="คนทิ้งขยะวันนี้" onBack={() => navigate('/esg/driver')} />
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Loading Tasks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageHeader title="คนทิ้งขยะวันนี้" onBack={() => navigate('/esg/driver')} />

            <div className={styles.content}>
                {tasks.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📂</div>
                        <h3>ไม่มีรายการที่ต้องเก็บ</h3>
                        <p>วันนี้ไม่มีรายการที่คุณต้องเก็บขยะ</p>
                    </div>
                ) : (
                    <div className={styles.taskList}>
                        {tasks.map((task) => {
                            const statusInfo = getStatusInfo(task.status);
                            const taskDate = new Date(task.date);

                            return (
                                <div
                                    key={task.tasks_id}
                                    className={styles.taskCard}
                                    onClick={() => navigate(`/esg/task-monitor/${task.tasks_id}`)}
                                >
                                    <div className={styles.cardHeader}>
                                        <div className={styles.dateInfo}>
                                            <span className={styles.day}>{taskDate.getDate()}</span>
                                            <div className={styles.monthYear}>
                                                <span className={styles.month}>
                                                    {taskDate.toLocaleDateString('th-TH', { month: 'short' })}
                                                </span>
                                                <span className={styles.year}>
                                                    {taskDate.getFullYear() + 543}
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            className={styles.statusBadge}
                                            style={{
                                                backgroundColor: `var(--${statusInfo.label}-bg)`,
                                                color: `var(--${statusInfo.label}-text)`,
                                                border: `1px solid var(--${statusInfo.label}-border)`
                                            }}
                                        >
                                            {statusInfo.label}
                                        </div>
                                    </div>

                                    <div className={styles.cardBody}>
                                        <div className={styles.infoRow}>
                                            <span className={styles.infoLabel}>customer :</span>
                                            <span className={styles.infoValue}>{task.user_name}</span>
                                        </div>
                                        <div className={styles.infoRow}>
                                            <span className={styles.infoLabel}>package :</span>
                                            <span className={styles.infoValue}>{task.package_name}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EsgTodayTasks;
