import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./EsgTaskHistory.module.css";
import PageHeader from "../../components/PageHeader";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";

function EsgTaskHistory() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const token = getToken();
        if (!token) {
            navigate("/signin");
            return;
        }

        try {
            const data = await api.getEsgTaskHistory(token);
            setTasks(data.tasks);
        } catch (err: any) {
            console.error("Failed to load history:", err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
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
                <PageHeader title="ประวัติการทิ้งขยะ" backTo="/esg/trash" />
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Loading History...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageHeader title="ประวัติการทิ้งขยะ" backTo="/esg/trash" />

            <div className={styles.content}>
                {tasks.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📂</div>
                        <h3>ไม่มีประวัติการทิ้งขยะ</h3>
                        <p>คุณยังไม่มีรายการทิ้งขยะในอดีตหรือวันนี้</p>
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
                                    onClick={() => navigate(`/esg/task-detail/${task.tasks_id}`)}
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
                                            <span className={styles.infoLabel}>driver :</span>
                                            <span className={styles.infoValue}>{task.driver_name || 'รอยืนยัน'}</span>
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
}

export default EsgTaskHistory;
