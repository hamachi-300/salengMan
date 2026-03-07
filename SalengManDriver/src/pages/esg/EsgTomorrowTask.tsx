import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EsgTomorrowTask.module.css';
import PageHeader from '../../components/PageHeader';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';

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
            if (!token) {
                navigate('/signin');
                return;
            }
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

    const groupedTasks = groupTasksByDate(tasks);
    const sortedDates = Object.keys(groupedTasks).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    if (loading) {
        return (
            <div className={styles.page}>
                <PageHeader title="งานต่อไป" onBack={() => navigate('/esg/driver')} />
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Loading Tasks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageHeader title="งานต่อไป" onBack={() => navigate('/esg/driver')} />

            <div className={styles.dateHeader}>
                <span className={styles.dateLabel}>งานทั้งหมดในอนาคต</span>
            </div>

            <div className={styles.content}>
                {tasks.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📂</div>
                        <h3>ไม่มีงานที่คุณรับไว้ในอนาคต</h3>
                        <p>ขณะนี้ยังไม่มีรายการงานที่คุณรับล่วงหน้าไว้</p>
                    </div>
                ) : (
                    <div className={styles.groupedContainer}>
                        {sortedDates.map((dateKey) => (
                            <div key={dateKey} className={styles.dateGroup}>
                                <div className={styles.groupHeader}>
                                    <span className={styles.groupHeaderText}>{getDateHeader(dateKey)}</span>
                                    <div className={styles.divider} />
                                </div>
                                <div className={styles.taskList}>
                                    {groupedTasks[dateKey].map((task) => {
                                        const statusInfo = getStatusInfo(task.status);
                                        const taskDate = new Date(task.date);

                                        return (
                                            <div
                                                key={task.tasks_id}
                                                className={`${styles.taskCard} ${task.status === 'skipped' ? styles.skippedCard : ''}`}
                                                onClick={() => navigate(`/esg/subscriptor-detail/${task.esg_subscriptor_id}/${new Date(task.date).getDate()}`)}
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
                                                        style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color }}
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
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EsgTomorrowTask;
