import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ChooseDateDriver.module.css";
import PageHeader from "../../components/PageHeader";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";

function ChooseDateDriver() {
    const navigate = useNavigate();
    const [pickupDays, setPickupDays] = useState<{ date: number, have_driver: boolean, driver: string[] }[]>([]);
    const [supId, setSupId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            const token = getToken();
            if (!token) {
                navigate("/home");
                return;
            }
            try {
                const status = await api.checkEsgSubscriptionStatus(token);
                if (status.hasActiveSubscription && status.pickup_days) {
                    setPickupDays(status.pickup_days);
                    setSupId(status.sup_id || null);
                } else {
                    // Fallback if no subscription found and directly accessed
                    navigate("/esg/trash");
                }
            } catch (error) {
                console.error("Failed to load pickup days", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
    }, [navigate]);

    return (
        <div className={styles.container}>
            <PageHeader title="เลือกคนทิ้งขยะ" backTo="/esg/trash" />

            <div className={styles.content}>
                <h2 className={styles.subtitle}>วันที่เลือกไว้</h2>

                {loading ? (
                    <p className={styles.loadingText}>กำลังโหลดข้อมูล...</p>
                ) : (
                    <div className={styles.datesList}>
                        {pickupDays.filter(d => d !== null).sort((a, b) => a.date - b.date).map((day, index) => (
                            <div
                                key={index}
                                className={styles.dateRow}
                                onClick={() => supId && navigate(`/esg/drivers/${supId}/${day.date}`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className={styles.dateBox}>
                                    วันที่ {day.date}
                                </div>
                                <div className={`${styles.statusIcon} ${day.have_driver ? styles.statusHave : styles.statusNot}`}>
                                    {day.have_driver ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    )}
                                </div>
                            </div>
                        ))}
                        {pickupDays.length === 0 && (
                            <p className={styles.loadingText}>ยังไม่ได้เลือกวันทิ้งขยะ</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChooseDateDriver;
