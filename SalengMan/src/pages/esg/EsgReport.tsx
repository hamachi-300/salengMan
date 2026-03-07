import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./EsgReport.module.css";
import PageHeader from "../../components/PageHeader";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import AlertPopup from "../../components/AlertPopup";
import { FileText, ClipboardList, ShieldCheck, ChevronRight, Lock } from "lucide-react";

function EsgReport() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [monthsSubscribed, setMonthsSubscribed] = useState(0);
    const [showAlert, setShowAlert] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ title: "", message: "" });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = getToken();
                if (!token) return;
                const data = await api.getEsgUserStats(token);
                if (data.subscription_date) {
                    const createdDate = new Date(data.subscription_date);

                    // Calculate months difference
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    setMonthsSubscribed(Math.floor(diffDays / 30));
                }
            } catch (error) {
                console.error("Failed to fetch ESG stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const handleReportClick = (type: string) => {
        switch (type) {
            case 'executive':
                navigate('/esg/report/executive');
                break;
            case 'audit':
                navigate('/esg/report/audit');
                break;
            case '56-1':
                if (monthsSubscribed < 3) {
                    setAlertConfig({ title: "ยังไม่สามารถดาวน์โหลดได้", message: "คุณต้องเป็นสมาชิกมากกว่า 3 เดือนขึ้นไปจึงจะสามารถดาวน์โหลดรายงาน 56-1 One Report ได้" });
                    setShowAlert(true);
                } else {
                    navigate('/esg/report/one');
                }
                break;
        }
    };

    return (
        <div className={styles.container}>
            <PageHeader title="Select Report" onBack={() => navigate(-1)} />

            <div className={styles.content}>
                <div className={styles.headerSection}>
                    <h2 className={styles.title}>ESG Reports</h2>
                    <p className={styles.subtitle}>
                        เลือกประเภทรายงานที่คุณต้องการดาวน์โหลดเพื่อนำไปใช้ประโยชน์ในด้านต่างๆ
                    </p>
                </div>

                {loading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.loader}></div>
                        <span>กำลังตรวจสอบข้อมูลสมาชิก...</span>
                    </div>
                ) : (
                    <div className={styles.cardContainer}>
                        {/* Executive Summary */}
                        <button className={styles.reportCard} onClick={() => handleReportClick('executive')}>
                            <div className={styles.iconWrapper}>
                                <FileText size={24} />
                            </div>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>Executive Summary Report</h3>
                                <p className={styles.cardDesc}>เป็นรายงานแบบย่อๆ เน้นเห็นภาพรวมคราวๆ</p>
                            </div>
                            <ChevronRight size={20} className={styles.chevron} />
                        </button>

                        {/* Audit Report */}
                        <button className={styles.reportCard} onClick={() => handleReportClick('audit')}>
                            <div className={styles.iconWrapper}>
                                <ClipboardList size={24} />
                            </div>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>Audit Report</h3>
                                <p className={styles.cardDesc}>เป็นรายงานที่มีมาตรฐาน เหมาะสำหรับการตรวจสอบ</p>
                                <span className={`${styles.badge} ${styles.recommend}`}>Recommend 1 month</span>
                            </div>
                            <ChevronRight size={20} className={styles.chevron} />
                        </button>

                        {/* 56-1 One Report */}
                        <button
                            className={styles.reportCard}
                            disabled={monthsSubscribed < 3}
                            onClick={() => handleReportClick('56-1')}
                        >
                            <div className={`${styles.iconWrapper} ${monthsSubscribed < 3 ? styles.locked : ''}`}>
                                {monthsSubscribed < 3 ? <Lock size={24} /> : <ShieldCheck size={24} />}
                            </div>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>56-1 One Report</h3>
                                <p className={styles.cardDesc}>มีมาตรฐานตามที่หน่วยงานภาครัฐกำหนด</p>
                                {monthsSubscribed < 3 && (
                                    <div className={styles.lockedText}>
                                        <span>จำเป็นต้องมีอายุสมาชิก มากกว่า 3 เดือน</span>
                                    </div>
                                )}
                            </div>
                            <ChevronRight size={20} className={styles.chevron} />
                        </button>
                    </div>
                )}
            </div>

            <AlertPopup
                isOpen={showAlert}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => setShowAlert(false)}
            />
        </div>
    );
}

export default EsgReport;
