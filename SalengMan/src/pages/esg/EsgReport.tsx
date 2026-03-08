import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./EsgReport.module.css";
import PageHeader from "../../components/PageHeader";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import ConfirmPopup from "../../components/ConfirmPopup";
import { FileText, ClipboardList, ShieldCheck, ChevronRight } from "lucide-react";

function EsgReport() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [monthsSubscribed, setMonthsSubscribed] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({ title: "", message: "", onConfirm: () => { } });

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
                if (monthsSubscribed !== 1 && monthsSubscribed !== 3) {
                    setConfirmConfig({
                        title: "แนะนำความถี่รายงาน",
                        message: "รายงาน Audit Report แนะนำให้ทำที่ 1 หรือ 3 เดือนเพื่อให้เห็นความเปลี่ยนแปลงที่ชัดเจน คุณต้องการดำเนินการต่อหรือไม่?",
                        onConfirm: () => navigate('/esg/report/audit')
                    });
                    setShowConfirm(true);
                } else {
                    navigate('/esg/report/audit');
                }
                break;
            case '56-1':
                if (monthsSubscribed < 3) {
                    setConfirmConfig({
                        title: "แนะนำอายุสมาชิก",
                        message: "รายงาน 56-1 One Report แนะนำให้มีข้อมูลสมาชิกมากกว่า 3 เดือนเพื่อให้รายงานมีความสมบูรณ์ คุณต้องการดำเนินการต่อหรือไม่?",
                        onConfirm: () => navigate('/esg/report/one')
                    });
                    setShowConfirm(true);
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
                                <span className={`${styles.badge} ${styles.recommend}`}>Recommend 1, 3 months</span>
                            </div>
                            <ChevronRight size={20} className={styles.chevron} />
                        </button>

                        {/* 56-1 One Report */}
                        <button
                            className={styles.reportCard}
                            onClick={() => handleReportClick('56-1')}
                        >
                            <div className={styles.iconWrapper}>
                                <ShieldCheck size={24} />
                            </div>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>56-1 One Report</h3>
                                <p className={styles.cardDesc}>มีมาตรฐานตามที่หน่วยงานภาครัฐกำหนด</p>
                                <span className={`${styles.badge} ${monthsSubscribed >= 3 ? styles.recommend : styles.warn}`}>
                                    {monthsSubscribed >= 3 ? "Recommend passed" : "Recommend 3 months"}
                                </span>
                            </div>
                            <ChevronRight size={20} className={styles.chevron} />
                        </button>
                    </div>
                )}
            </div>

            <ConfirmPopup
                isOpen={showConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={() => {
                    setShowConfirm(false);
                    confirmConfig.onConfirm();
                }}
                onCancel={() => setShowConfirm(false)}
                confirmText="ดำเนินการต่อ"
                cancelText="ยกเลิก"
            />
        </div>
    );
}

export default EsgReport;
