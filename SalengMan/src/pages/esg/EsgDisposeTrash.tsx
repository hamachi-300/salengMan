import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./EsgDisposeTrash.module.css";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";
import ConfirmPopup from "../../components/ConfirmPopup";
import profileLogo from "../../assets/icon/profile.svg";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";

function EsgDisposeTrash() {
    const navigate = useNavigate();
    const [task, setTask] = useState<any>(null);
    const [packageName, setPackageName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [skipping, setSkipping] = useState(false);
    const [showConfirmSkip, setShowConfirmSkip] = useState(false);

    const isCompleted = task && (task.status === 'complete' || task.status === 'completed');
    const isToday = task && new Date(task.date).toDateString() === new Date().toDateString() && !isCompleted;

    useEffect(() => {
        fetchNearestTask();
    }, []);

    useEffect(() => {
        if (isCompleted && task?.tasks_id) {
            const seenId = localStorage.getItem('esg_seen_task');
            if (seenId !== task.tasks_id.toString()) {
                localStorage.setItem('esg_seen_task', task.tasks_id.toString());
                navigate(`/esg/task-detail/${task.tasks_id}`, { replace: true });
            }
        }
    }, [isCompleted, task, navigate]);

    const fetchNearestTask = async (upcomingOnly = false) => {
        const token = getToken();
        if (!token) {
            navigate("/signin");
            return;
        }

        try {
            const data = await api.getNearestEsgTask(token, upcomingOnly);

            // If this is a completed task, check if we've already acknowledged it
            if (!upcomingOnly && data.task && (data.task.status === 'complete' || data.task.status === 'completed')) {
                const seenId = localStorage.getItem('esg_seen_task');
                if (seenId === data.task.tasks_id.toString()) {
                    // Already seen this result. Show upcoming date instead.
                    fetchNearestTask(true);
                    return;
                }
            }

            setTask(data.task);
            setPackageName(data.package_name || null);
        } catch (err: any) {
            console.error("Failed to load task:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSkipTask = async () => {
        const token = getToken();
        if (!token || !task) return;

        setSkipping(true);
        try {
            await api.updateEsgTaskStatus(token, task.tasks_id, 'skipped');
            setShowConfirmSkip(false);
            // Re-fetch to get the next task
            setLoading(true);
            await fetchNearestTask();
        } catch (err: any) {
            console.error("Failed to skip task:", err);
            alert("Failed to skip task. Please try again.");
        } finally {
            setSkipping(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <PageHeader title="Dispose Trash" backTo="/esg/trash" />
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }


    return (
        <div className={styles.page}>
            <PageHeader title="Dispose Trash" backTo="/esg/trash" />

            <div className={styles.content}>
                {!task ? (
                    <div className={styles.emptyState}>
                        <p>No upcoming waste disposal tasks scheduled.</p>
                    </div>
                ) : (
                    <div className={styles.taskContainer}>
                        {isCompleted ? (
                            <div className={styles.completedView}>
                                {/* Progress Timeline */}
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

                                {/* Driver Card */}
                                <div className={styles.driverSection}>
                                    <span className={styles.sectionLabel}>DRIVER IN CHARGE</span>
                                    <div
                                        className={styles.driverCard}
                                        onClick={() => navigate(`/esg/driver-detail/${task.driver_user_id}`)}
                                    >
                                        <div className={styles.avatarContainer}>
                                            <img
                                                src={task.driver_avatar || profileLogo}
                                                alt={task.driver_name}
                                                className={styles.avatar}
                                            />
                                            <div className={styles.onlineIndicator} />
                                        </div>
                                        <div className={styles.driverInfo}>
                                            <h3 className={styles.driverName}>{task.driver_name}</h3>
                                            <span className={styles.driverStatus}>ESG Partner</span>
                                        </div>
                                        <svg className={styles.chevronIcon} viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Date Info Section */}
                                <div className={styles.dateInfoSection}>
                                    <div className={styles.dateRow}>
                                        <div className={styles.dateIcon}>🚚</div>
                                        <div className={styles.dateDetails}>
                                            <div className={styles.dateLabel}>วันที่ไปเอาขยะ</div>
                                            <div className={styles.dateValue}>
                                                {new Date(task.created_at).toLocaleDateString('th-TH', {
                                                    day: 'numeric', month: 'long', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.dateRow}>
                                        <div className={styles.dateIcon}>🏁</div>
                                        <div className={styles.dateDetails}>
                                            <div className={styles.dateLabel}>วันที่ปิดงาน</div>
                                            <div className={styles.dateValue}>
                                                {task.complete_time ? new Date(task.complete_time).toLocaleDateString('th-TH', {
                                                    day: 'numeric', month: 'long', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                }) : '---'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Trash & Impact Section */}
                                <div className={styles.actionButtons}>
                                    <button className={styles.outlineBtn} onClick={() => navigate(`/esg/trash-type/${task.tasks_id}`)}>
                                        <div className={styles.btnLeft}>
                                            <span className={styles.btnIcon}>📦</span>
                                            <span className={styles.btnTitle}>ประเภทและน้ำหนักขยะ</span>
                                        </div>
                                        <svg className={styles.btnArrow} viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                                        </svg>
                                    </button>
                                </div>

                                <div className={styles.impactSection}>
                                    <div className={styles.impactInfo}>
                                        <h4>ลด CARBON สะสม</h4>
                                        <div className={styles.impactHighlight}>
                                            <span className={styles.impactNumber}>{task.carbon_reduce || '0.00'}</span>
                                            <span className={styles.impactUnit}>kg</span>
                                        </div>
                                    </div>
                                    <div className={styles.impactBadge}>
                                        <span>🌳</span>
                                        <span>{task.tree_equivalent || '0'}</span>
                                    </div>
                                </div>

                                {/* Evidence Images */}
                                {task.evidences_images && task.evidences_images.length > 0 && (
                                    <div className={styles.imageGallerySection}>
                                        <span className={styles.sectionLabel}>รูปถ่ายตอนส่ง</span>
                                        <div className={styles.previewGallery}>
                                            {task.evidences_images.map((img: string, idx: number) => (
                                                <div key={idx} className={styles.previewSlot}>
                                                    <img src={img} className={styles.previewImage} alt={`Evidence ${idx + 1}`} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Receipt Images */}
                                {task.receipt_images && task.receipt_images.length > 0 && (
                                    <div className={`${styles.imageGallerySection} ${styles.receiptGallery}`}>
                                        <span className={styles.sectionLabel}>รูปถ่ายใบเสร็จ</span>
                                        <div className={styles.previewGallery}>
                                            {task.receipt_images.map((img: string, idx: number) => (
                                                <div key={idx} className={styles.previewSlot}>
                                                    <img src={img} className={styles.previewImage} alt={`Receipt ${idx + 1}`} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : !isToday ? (
                            <div className={styles.upcomingContainer}>
                                <div className={styles.upcomingHeader}>
                                    <div className={styles.calendarIcon}>
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
                                        </svg>
                                    </div>
                                    <div className={styles.upcomingHeaderText}>
                                        <h2>Upcoming Collection</h2>
                                        <p>Mark your calendar for the next pickup.</p>
                                    </div>
                                </div>

                                <div className={styles.dateSection}>
                                    <span className={styles.sectionLabel}>SCHEDULED DATE</span>
                                    <div className={styles.dateCard}>
                                        <div className={styles.dateIcon}>📅</div>
                                        <div className={styles.dateValue}>
                                            {new Date(task.date).toLocaleDateString('th-TH', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                    {packageName && (
                                        <div className={styles.packageBanner}>
                                            <span className={styles.packageName}>{packageName}</span>
                                            <span className={styles.maxWeight}>
                                                Max: {packageName.toLowerCase().includes('enterprise') ? '200' : '50'}kg
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className={styles.prepCard}>
                                    <div className={styles.prepHeader}>
                                        <span className={styles.sectionLabel}>PREPARATION GUIDE</span>
                                    </div>
                                    <div className={styles.prepList}>
                                        <div className={styles.prepItem}>
                                            <div className={styles.prepCheck}>✓</div>
                                            <span>ล้างภาชนะพลาสติกให้สะอาด</span>
                                        </div>
                                        <div className={styles.prepItem}>
                                            <div className={styles.prepCheck}>✓</div>
                                            <span>พับกล่องกระดาษให้แบน</span>
                                        </div>
                                        <div className={styles.prepItem}>
                                            <div className={styles.prepCheck}>✓</div>
                                            <span>แยกกระดาษออกจากโลหะ</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.driverSection}>
                                    <span className={styles.sectionLabel}>DRIVER ASSIGNED</span>
                                    <div
                                        className={styles.driverCard}
                                        onClick={() => navigate(`/esg/driver-detail/${task.driver_user_id}`)}
                                    >
                                        <div className={styles.avatarContainer}>
                                            <img
                                                src={task.driver_avatar || profileLogo}
                                                alt={task.driver_name}
                                                className={styles.avatar}
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    if (target.src !== profileLogo) {
                                                        target.src = profileLogo;
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className={styles.driverInfo}>
                                            <h3 className={styles.driverName}>{task.driver_name}</h3>
                                            <span className={styles.driverStatus} style={{ color: 'var(--color-text)', opacity: 0.6 }}>ESG Partner</span>
                                        </div>
                                        <svg className={styles.chevronIcon} viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                                        </svg>
                                    </div>
                                    <button
                                        className={styles.skipTaskButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowConfirmSkip(true);
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                        </svg>
                                        Skip this collection
                                    </button>
                                </div>
                            </div>
                        ) : task.status === 'pending' || task.status === 'in-progress' ? (
                            <div className={styles.todayContainer}>
                                <div className={styles.todayHeader}>
                                    <div className={styles.pendingIcon}>
                                        <svg viewBox="-3 -3 30 30" fill="currentColor">
                                            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-8.5l1.96 2.5H17V9.5h2.5zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                                        </svg>
                                    </div>
                                    <div className={styles.todayHeaderText}>
                                        <h2>Pending Delivery</h2>
                                        <p>Your trash is on its way to the recycling factory.</p>
                                    </div>
                                </div>

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

                                <div className={styles.impactCard}>
                                    <span className={styles.sectionLabel}>CARBON REDUCTION</span>
                                    <div className={styles.impactContent}>
                                        <div className={styles.impactMain}>
                                            <span className={styles.impactValue}>{task.carbon_reduce || '0.00'}</span>
                                            <span className={styles.impactUnit}>kg CO2 saved</span>
                                        </div>
                                        <div className={styles.impactSub}>
                                            <span className={styles.impactTree}>{task.tree_equivalent || '0'} 🌳</span>
                                            <span className={styles.impactTreeText}>Equivalent to trees planted</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.actionButtons}>
                                    <button className={styles.outlineBtn} onClick={() => navigate(`/esg/trash-type/${task.tasks_id}`)}>
                                        <div className={styles.btnLeft}>
                                            <span className={styles.btnIcon}>📦</span>
                                            <span className={styles.btnTitle}>ประเภทและน้ำหนักขยะ</span>
                                        </div>
                                        <svg className={styles.btnArrow} viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                                        </svg>
                                    </button>
                                </div>

                                <div className={styles.driverSection}>
                                    <span className={styles.sectionLabel}>DRIVER IN CHARGE</span>
                                    <div
                                        className={styles.driverCard}
                                        onClick={() => navigate(`/esg/driver-detail/${task.driver_user_id}`)}
                                    >
                                        <div className={styles.avatarContainer}>
                                            <img
                                                src={task.driver_avatar || profileLogo}
                                                alt={task.driver_name}
                                                className={styles.avatar}
                                            />
                                            <div className={styles.onlineIndicator} />
                                        </div>
                                        <div className={styles.driverInfo}>
                                            <h3 className={styles.driverName}>{task.driver_name}</h3>
                                            <span className={styles.driverStatus}>Delivering...</span>
                                        </div>
                                        <svg className={styles.chevronIcon} viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.todayContainer}>
                                <div className={styles.todayHeader}>
                                    <div className={styles.todayIcon}>
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M11.99 2C6.47 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-12-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                            <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                        </svg>
                                    </div>
                                    <div className={styles.todayHeaderText}>
                                        <h2>Today's Trash</h2>
                                        <p>The driver will arrive at your location today.</p>
                                    </div>
                                </div>
                                {packageName && (
                                    <div className={styles.packageBanner}>
                                        <span className={styles.packageName}>{packageName}</span>
                                        <span className={styles.maxWeight}>
                                            Max: {packageName.toLowerCase().includes('enterprise') ? '200' : '50'}kg
                                        </span>
                                    </div>
                                )}

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

                                <div className={styles.driverSection}>
                                    <div className={styles.sectionHeaderRow}>
                                        <span className={styles.sectionLabel}>DRIVER ASSIGNED</span>
                                        {task.chat_id && (
                                            <button
                                                className={styles.chatIconButton}
                                                onClick={() => navigate(`/chat/${task.chat_id}`)}
                                                title="Chat with driver"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-5H6V7h12v2z" />
                                                </svg>
                                                <span>Chat</span>
                                            </button>
                                        )}
                                    </div>
                                    <div
                                        className={styles.driverCard}
                                        onClick={() => navigate(`/esg/driver-detail/${task.driver_user_id}`)}
                                    >
                                        <div className={styles.avatarContainer}>
                                            <img
                                                src={task.driver_avatar || profileLogo}
                                                alt={task.driver_name}
                                                className={styles.avatar}
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    if (target.src !== profileLogo) {
                                                        target.src = profileLogo;
                                                    }
                                                }}
                                            />
                                            <div className={styles.onlineIndicator} />
                                        </div>
                                        <div className={styles.driverInfo}>
                                            <h3 className={styles.driverName}>{task.driver_name}</h3>
                                            <span className={styles.driverStatus}>Online</span>
                                        </div>
                                        <svg className={styles.chevronIcon} viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                                        </svg>
                                    </div>
                                    <button
                                        className={styles.skipTaskButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowConfirmSkip(true);
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                        </svg>
                                        Skip this collection
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Page Footer Logic */}
            {!isCompleted && (
                !isToday && task ? (
                    <PageFooter
                        title="Skip This Task"
                        onClick={() => setShowConfirmSkip(true)}
                        variant="orange"
                        showArrow={false}
                    />
                ) : isToday && task ? (
                    <PageFooter
                        title={(
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-12-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                </svg>
                                Track Driver
                            </span>
                        )}
                        onClick={() => navigate(`/esg/track-driver/${task.driver_user_id}/${task.tasks_id}${task.status === 'pending' ? '?mode=factory' : ''}`)}
                        variant="orange"
                        showArrow={false}
                    />
                ) : !task ? (
                    <PageFooter
                        title="เลือกวันทิ้งขยะเพิ่มเติม"
                        onClick={() => navigate('/esg/choose-date-driver')}
                        variant="orange"
                        showArrow={false}
                    />
                ) : null
            )}

            <ConfirmPopup
                isOpen={showConfirmSkip}
                title="Skip Task?"
                message={`Are you sure you want to skip the collection on ${new Date(task?.date).toLocaleDateString()}?`}
                onConfirm={handleSkipTask}
                onCancel={() => setShowConfirmSkip(false)}
                isLoading={skipping}
                confirmText="Yes, Skip"
                confirmColor="#ff7a30"
            />
        </div>
    );
}

export default EsgDisposeTrash;
