import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './EsgTrashType.module.css';
import PageHeader from '../../components/PageHeader';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';

const EsgTrashType: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchTaskDetails();
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

    const getTrashIcon = (type: string) => {
        switch (type) {
            case 'กระดาษ': return '📄';
            case 'พลาสติก': return '🥤';
            case 'โลหะและอลูมิเนียม': return '🥫';
            case 'แก้ว': return '🍷';
            default: return '📦';
        }
    };

    const trashList = task?.weight && Array.isArray(task.weight) ? task.weight : [];

    return (
        <div className={styles.container}>
            <PageHeader title="รายการขยะ" onBack={() => navigate(-1)} />

            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.loadingSpinner}></div>
                        <span>กำลังโหลดข้อมูล...</span>
                    </div>
                ) : !task ? (
                    <div className={styles.empty}>ไม่พบข้อมูลรายการขยะ</div>
                ) : (
                    <>
                        {/* Environmental Impact Summary */}
                        <div className={styles.impactSummary}>
                            <span className={styles.summaryTitle}>ผลลัพธ์ต่อสิ่งแวดล้อม</span>
                            <div className={styles.impactGrid}>
                                <div className={styles.impactItem}>
                                    <span className={styles.impactLabel}>ลด CO2 สะสม</span>
                                    <div className={styles.impactValue}>
                                        <span className={styles.impactNumber}>{task.carbon_reduce || '0.00'}</span>
                                        <span className={styles.impactUnit}>kg</span>
                                    </div>
                                </div>
                                <div className={styles.impactItem}>
                                    <span className={styles.impactLabel}>เทียบเท่าปลูกต้นไม้</span>
                                    <div className={styles.impactValue}>
                                        <span className={`${styles.impactNumber} ${styles.treeValue}`}>{task.tree_equivalent || '0'}</span>
                                        <span className={`${styles.impactUnit} ${styles.treeValue} ${styles.treeIcon}`}>🌳</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trash Material List */}
                        <div className={styles.listHeader}>
                            <span className={styles.sectionLabel}>ขยะที่คุณรวบรวมได้</span>
                        </div>

                        <div className={styles.trashList}>
                            {trashList.length === 0 ? (
                                <div className={styles.empty}>ไม่มีข้อมูลขยะที่บันทึกไว้</div>
                            ) : (
                                trashList.map((item: any, index: number) => (
                                    <div key={index} className={styles.trashCard}>
                                        <div className={styles.trashInfo}>
                                            <div className={styles.trashTypeIcon}>
                                                {getTrashIcon(item.type)}
                                            </div>
                                            <div className={styles.trashDetails}>
                                                <h3 className={styles.trashTitle}>{item.type}</h3>
                                                <p className={styles.trashSub}>น้ำหนักวัสดุรีไซเคิล</p>
                                            </div>
                                        </div>
                                        <div className={styles.trashWeight}>
                                            <span className={styles.weightValue}>{item.weight}</span>
                                            <span className={styles.weightUnit}>kg</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default EsgTrashType;
