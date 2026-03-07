import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './EsgTaskMonitor.module.css';
import PageHeader from '../../components/PageHeader';
import PageFooter from '../../components/PageFooter';
import profileLogo from '../../assets/icon/profile.svg';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';

const EsgTaskMonitor: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTaskDetails();

        // Clear all cached trash information when visiting the monitor page
        const keysToRemove = Object.keys(localStorage).filter(key => key.startsWith('trash_info_'));
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }, [id]);

    const fetchTaskDetails = async () => {
        const token = getToken();
        if (!token || !id) return;
        try {
            const data = await api.getEsgTaskById(token, id);
            setTask(data.task);
        } catch (error) {
            console.error("Failed to fetch task details:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <PageHeader title="Task Monitor" onBack={() => navigate('/esg/today_tasks')} />
                <div className={styles.loading}>กำลังโหลด...</div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className={styles.container}>
                <PageHeader title="Task Monitor" onBack={() => navigate('/esg/today_tasks')} />
                <div className={styles.empty}>ไม่พบข้อมูลงาน</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <PageHeader title="Task Monitor" onBack={() => navigate('/esg/today_tasks')} />

            <div className={styles.content}>
                {/* Status Timeline Section */}
                <div className={styles.timelineSection}>
                    <span className={styles.sectionLabel}>TRASH PROGRESS</span>
                    <div className={styles.timeline}>
                        {[
                            { status: 'waiting', label: 'Waiting', icon: '📅' },
                            { status: 'pending', label: 'Pending', icon: '🚚' },
                            { status: 'complete', label: 'Completed', icon: '✅' }
                        ].map((step, index) => {
                            const statuses = ['waiting', 'pending', 'complete'];
                            let currentStatus = task.status;
                            if (currentStatus === 'completed') currentStatus = 'complete';
                            if (currentStatus === 'in-progress') currentStatus = 'pending';

                            const currentIndex = statuses.indexOf(currentStatus) === -1 ? 0 : statuses.indexOf(currentStatus);
                            const isActive = index <= currentIndex;
                            const isCurrent = index === currentIndex;

                            return (
                                <div key={step.status} className={`${styles.timelineStep} ${isActive ? styles.activeStep : ''} ${isCurrent ? styles.currentStep : ''}`}>
                                    <div className={styles.stepIcon}>{step.icon}</div>
                                    <span className={styles.stepLabel}>{step.label}</span>
                                    {index < 2 && <div className={styles.stepLine} />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* GPS Navigation Button */}
                <div className={styles.gpsSection}>
                    <button
                        className={styles.gpsButton}
                        onClick={() => navigate(`/esg/task-explore/${id}`)}
                    >
                        <div className={styles.gpsIcon}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                        </div>
                        <div className={styles.gpsText}>
                            <h3>แผนที่นำทาง</h3>
                            <p>คลิกเพื่อดูเส้นทางไปยังตำแหน่งลูกค้า</p>
                        </div>
                        <div className={styles.chevronIcon}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                            </svg>
                        </div>
                    </button>
                </div>

                {/* Subscriptor Card */}
                <div className={styles.subCardContainer}>
                    <span className={styles.sectionLabel}>SUBSCRIBTOR</span>
                    <div
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
                                </div>
                                <p className={styles.packageText}>
                                    package : {task.package_name}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <PageFooter
                title="ใส่ข้อมูลการทิ้งขยะ"
                onClick={() => navigate(`/esg/trash-info/${id}`)}
                variant="orange"
                showArrow={false}
            />
        </div>
    );
};

export default EsgTaskMonitor;
