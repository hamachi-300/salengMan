import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./EsgDriverConfirm.module.css";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";
import profileLogo from "../../assets/icon/profile.svg";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";

interface DriverProfile {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    avatar_url?: string;
    created_at: string;
    user_phone?: string;
    address_phone?: string;
}

function EsgDriverDetail() {
    const { driverId } = useParams<{ driverId: string }>();
    const navigate = useNavigate();
    const [driver, setDriver] = useState<DriverProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chatId, setChatId] = useState<string | null>(null);

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
            const resolvedPhone = driverData.address_phone || driverData.user_phone || '-';
            driverData.phone = resolvedPhone;
            setDriver(driverData);

            // Fetch chatId: Find the chat ID in the user's pickup days
            try {
                const subStatus = await api.checkEsgSubscriptionStatus(token);
                if (subStatus.pickup_days) {
                    const matchedDay = subStatus.pickup_days.find((d: any) => d && (d.confirmed_driver_id === driverData.esg_driver_id || d.driver?.includes(driverData.esg_driver_id)));
                    if (matchedDay?.chat_id) {
                        setChatId(matchedDay.chat_id);
                    }
                }
            } catch (subErr) {
                console.warn("Failed to fetch subscription status for chat detection:", subErr);
            }
        } catch (err: any) {
            console.error("Failed to load driver data:", err);
            setError("Failed to load driver information");
        } finally {
            setLoading(false);
        }
    };

    if (error) {
        return (
            <div className={styles['page']}>
                <PageHeader title="Driver Detail" backTo="/esg/dispose-trash" />
                <div className={styles['error-container']}>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (loading || !driver) {
        return (
            <div className={styles['page']}>
                <PageHeader title="Driver Detail" backTo="/esg/dispose-trash" />
                <div className={styles['loading-container']}>
                    <div className={styles['spinner']}></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles['page']}>
            <PageHeader title="Driver Detail" backTo="/esg/dispose-trash" />

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

                    {/* Email */}
                    <div className={styles['info-card']}>
                        <div className={styles['icon-wrapper']}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                            </svg>
                        </div>
                        <div className={styles['info-content']}>
                            <span className={styles['label']}>Email</span>
                            <span className={styles['value']}>{driver.email || '-'}</span>
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

                    {/* Report User */}
                    <div className={styles['report-section']}>
                        <button
                            className={styles['report-button']}
                            onClick={() => navigate("/user-report", { state: { reportedUser: driver } })}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                            </svg>
                            Report This User
                        </button>
                    </div>
                </div>
            </div>

            {chatId && (
                <PageFooter
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-5H6V7h12v2z" />
                            </svg>
                            <span>Chat with driver</span>
                        </div>
                    }
                    onClick={() => navigate(`/chat/${chatId}`)}
                    showArrow={false}
                />
            )}
        </div>
    );
}

export default EsgDriverDetail;
