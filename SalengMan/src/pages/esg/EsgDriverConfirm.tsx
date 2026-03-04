import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./EsgDriverConfirm.module.css";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";
import profileLogo from "../../assets/icon/profile.svg";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import SuccessPopup from "../../components/SuccessPopup";
import AlertPopup from "../../components/AlertPopup";

interface DriverProfile {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    avatar_url?: string;
    created_at: string;
}

function EsgDriverConfirm() {
    const { supId, date, driverId } = useParams<{ supId: string, date: string, driverId: string }>();
    const navigate = useNavigate();
    const [driver, setDriver] = useState<DriverProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [driverId]);

    const fetchData = async () => {
        const token = getToken();
        if (!token || !driverId) {
            navigate("/signin");
            return;
        }

        try {
            const driverData = await api.getPublicProfile(token, driverId);
            setDriver(driverData);
        } catch (err: any) {
            console.error("Failed to load driver data:", err);
            setError("Failed to load driver information");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        const token = getToken();
        if (!token || !supId || !date || !driverId) return;

        setConfirming(true);
        try {
            await api.confirmEsgDriver(token, supId, parseInt(date), driverId);
            setShowSuccess(true);
        } catch (err: any) {
            console.error("Failed to confirm driver:", err);
            setAlertMessage(err.message || "Failed to confirm driver. Please try again.");
        } finally {
            setConfirming(false);
        }
    };

    if (error) {
        return (
            <div className={styles['page']}>
                <PageHeader title="Confirm Driver" backTo={`/esg/drivers/${supId}/${date}`} />
                <div className={styles['error-container']}>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (loading || !driver) {
        return (
            <div className={styles['page']}>
                <PageHeader title="Confirm Driver" backTo={`/esg/drivers/${supId}/${date}`} />
                <div className={styles['loading-container']}>
                    <div className={styles['spinner']}></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles['page']}>
            <PageHeader
                title="Confirm Driver"
                backTo={`/esg/drivers/${supId}/${date}`}
            />

            <div className={styles['content']}>
                <div className={styles['avatar-section']}>
                    <img
                        src={driver.avatar_url || profileLogo}
                        alt={driver.full_name}
                        className={styles['avatar']}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== profileLogo) {
                                target.src = profileLogo;
                            }
                        }}
                    />
                    <div className={styles['verified-badge']}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                    </div>
                </div>

                <div className={styles['info-container']}>
                    <h2 className={styles['section-label']}>DRIVER INFORMATION</h2>

                    {/* Name */}
                    <div className={styles['info-card']}>
                        <div className={styles['icon-wrapper']}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </div>
                        <div className={styles['info-content']}>
                            <span className={styles['label']}>Name</span>
                            <span className={styles['value']}>{driver.full_name}</span>
                        </div>
                    </div>

                    {/* Phone */}
                    <div className={styles['info-card']}>
                        <div className={styles['icon-wrapper']}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                            </svg>
                        </div>
                        <div className={styles['info-content']}>
                            <span className={styles['label']}>Phone Number</span>
                            <span className={styles['value']}>{driver.phone || '-'}</span>
                        </div>
                    </div>

                    {/* Member Since */}
                    <div className={styles['info-card']}>
                        <div className={styles['icon-wrapper']}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
                            </svg>
                        </div>
                        <div className={styles['info-content']}>
                            <span className={styles['label']}>Member Since</span>
                            <span className={styles['value']}>{new Date(driver.created_at).toLocaleDateString('en-GB')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles['footer-wrapper']}>
                <div className={styles['agreement-text']}>
                    <svg className={styles['info-icon']} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                    <span>By confirming, you agree to select this driver for your waste pickup and other requests for this date will be closed.</span>
                </div>
            </div>

            <PageFooter
                title={confirming ? 'Confirming...' : 'Confirm Driver'}
                onClick={handleConfirm}
                disabled={confirming}
                showArrow={false}
            />

            <SuccessPopup
                isOpen={showSuccess}
                title="Success!"
                message="คุณได้ยืนยันคนขับเรียบร้อยแล้ว รายการอื่นๆ สำหรับวันนี้จะถูกปิดโดยอัตโนมัติ"
                onConfirm={() => navigate(`/esg/choose-date-driver`)}
                confirmText="ตกลง"
            />

            <AlertPopup
                isOpen={alertMessage !== null}
                title="Error"
                message={alertMessage || ""}
                onClose={() => setAlertMessage(null)}
            />
        </div>
    );
}

export default EsgDriverConfirm;
