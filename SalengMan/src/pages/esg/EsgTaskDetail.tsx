import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./EsgTaskDetail.module.css";
import PageHeader from "../../components/PageHeader";
import profileLogo from "../../assets/icon/profile.svg";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";

function EsgTaskDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchTaskDetail();
    }, [id]);

    const fetchTaskDetail = async () => {
        const token = getToken();
        if (!token) {
            navigate("/signin");
            return;
        }

        try {
            const data = await api.getEsgTaskById(token, id!);
            setTask(data.task);

            // Record this task as seen if it's completed
            if (data.task && (data.task.status === 'complete' || data.task.status === 'completed')) {
                localStorage.setItem('esg_seen_task', data.task.tasks_id.toString());
            }
        } catch (err: any) {
            console.error("Failed to load task detail:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <PageHeader title="Task Detail" backTo="/esg/task-history" />
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Loading Detail...</p>
                </div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className={styles.page}>
                <PageHeader title="Task Detail" backTo="/esg/task-history" />
                <div className={styles.emptyState}>
                    <p>Task not found.</p>
                </div>
            </div>
        );
    }

    // Reuse visual logic from EsgDisposeTrash
    // In this page, we treat it as "History", so we use the layouts based on status
    const isCompleted = task.status === 'complete' || task.status === 'completed';
    const isSkipped = task.status === 'skipped';

    // As per user request: "click each task card will link to task detail page that look like /esg/dispose-trash (isToday = true)"
    // This means we use the detailed layouts (timeline, impacts, etc.) regardless of actual date, since it's history.

    return (
        <div className={styles.page}>
            <PageHeader title="Task Detail" backTo="/esg/task-history" />

            <div className={styles.content}>
                <div className={styles.taskContainer}>
                    {/* Progress Timeline - Always show in history detail */}
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
                                if (isSkipped) currentStatus = 'waiting'; // For skipped, show at first step or separate indicator

                                const currentIndex = statuses.indexOf(currentStatus) === -1 ? 0 : statuses.indexOf(currentStatus);
                                const isActive = !isSkipped && index <= currentIndex;
                                const isCurrent = !isSkipped && index === currentIndex;

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

                    {isSkipped && (
                        <div
                            className={styles.skippedCard}
                            onClick={() => {
                                const day = new Date(task.date).getDate();
                                navigate(`/esg/driver-confirm/${task.esg_subscriptor_id}/${day}/${task.driver_user_id}`);
                            }}
                        >
                            <div className={styles.skippedBadge}>SKIPPED</div>
                            <h3>รายการนี้ถูกข้าม</h3>
                            <p>คุณหรือระบบได้ทำการข้ามการทิ้งขยะรอบนี้</p>
                            <div className={styles.viewDriverText}>ดูข้อมูลคนขับ <span>›</span></div>
                        </div>
                    )}

                    {/* Driver Card */}
                    {!isSkipped && (
                        <div className={styles.driverSection}>
                            <span className={styles.sectionLabel}>DRIVER IN CHARGE</span>
                            <div
                                className={styles.driverCard}
                                onClick={() => {
                                    const day = new Date(task.date).getDate();
                                    navigate(`/esg/driver-confirm/${task.esg_subscriptor_id}/${day}/${task.driver_user_id}`);
                                }}
                            >
                                <div className={styles.avatarContainer}>
                                    <img
                                        src={task.driver_avatar || profileLogo}
                                        alt={task.driver_name}
                                        className={styles.avatar}
                                    />
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
                    )}

                    {/* Date Info Section */}
                    <div className={styles.dateInfoSection}>
                        <div className={styles.dateRow}>
                            <div className={styles.dateIcon}>📅</div>
                            <div className={styles.dateDetails}>
                                <div className={styles.dateLabel}>วันที่นัดหมาย</div>
                                <div className={styles.dateValue}>
                                    {new Date(task.date).toLocaleDateString('th-TH', {
                                        day: 'numeric', month: 'long', year: 'numeric'
                                    })}
                                </div>
                            </div>
                        </div>
                        {isCompleted && (
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
                        )}
                    </div>

                    {/* Trash & Impact Section */}
                    {!isSkipped && (
                        <>
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default EsgTaskDetail;
