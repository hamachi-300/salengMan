import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./EsgSubscriptorDetail.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import MapSelector from "../../components/MapSelector";
import { watchPosition, clearWatch } from '@tauri-apps/plugin-geolocation';
import profileLogo from "../../assets/icon/profile.svg";
import { useUser } from "../../context/UserContext";
import SuccessPopup from "../../components/SuccessPopup";
import AlertPopup from "../../components/AlertPopup";

interface Subscriptor {
    sup_id: string;
    user_id: string;
    full_name: string;
    email: string;
    user_phone: string;
    address_phone: string;
    avatar_url?: string;
    package_name: string;
    sub_district: string;
    district: string;
    address_id: number;
    pickup_days: any[];
    created_at: string;
}

function EsgSubscriptorDetail() {
    const { initialLocation } = useUser();
    const navigate = useNavigate();
    const { supId, date } = useParams<{ supId: string, date: string }>();
    const [subscriptor, setSubscriptor] = useState<Subscriptor | null>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(initialLocation);
    const [subLocation, setSubLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [subAddressText, setSubAddressText] = useState("");

    // Popup states
    const [showSuccess, setShowSuccess] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: "",
        message: "",
    });

    useEffect(() => {
        fetchSubscriptorDetail();
        setupLocationTracking();
    }, [supId]);

    const setupLocationTracking = async () => {
        let watchId: number | null = null;
        const isTauri = !!(window as any).__TAURI_INTERNALS__;

        if (isTauri) {
            try {
                watchId = await watchPosition({ enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }, (pos) => {
                    if (pos) setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                });
            } catch (e) { console.warn("Tauri GPS failed", e); }
        }

        if ("geolocation" in navigator) {
            navigator.geolocation.watchPosition(
                (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                null,
                { enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }
            );
        }

        return () => {
            if (watchId !== null) clearWatch(watchId);
        };
    };

    const fetchSubscriptorDetail = async () => {
        const token = getToken();
        if (!token || !supId) return;

        try {
            const data = await api.getAvailableEsgSubscriptions(token);
            const found = data.find((s: any) => s.sup_id === supId);

            if (found) {
                // Fetch full user profile to get the most up-to-date email and other details
                // per user request: "use that user_id to find email inside users table"
                try {
                    const publicProfile = await api.getPublicProfile(token, found.user_id);
                    // Merge data, prioritizing publicProfile for core user fields
                    setSubscriptor({
                        ...found,
                        email: publicProfile.email,
                        user_phone: publicProfile.user_phone,
                        address_phone: publicProfile.address_phone,
                        created_at: publicProfile.created_at || found.created_at
                    });
                } catch (profileErr) {
                    console.warn("Failed to fetch explicit profile, falling back to aggregate data", profileErr);
                    setSubscriptor(found);
                }

                if (found.lat !== undefined && found.lng !== undefined) {
                    setSubLocation({ lat: found.lat, lng: found.lng });
                    setSubAddressText(found.address);
                } else {
                    try {
                        const addresses = await api.getAddressesByUserId(token, found.user_id);
                        const subAddr = addresses.find((a: any) => a.id === found.address_id);
                        if (subAddr && subAddr.lat !== undefined && subAddr.lng !== undefined) {
                            setSubLocation({ lat: subAddr.lat, lng: subAddr.lng });
                            setSubAddressText(subAddr.address);
                        }
                    } catch (addrErr) {
                        console.warn("Failed to fetch subscriptor address", addrErr);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load subscriptor", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSignContract = async () => {
        const token = getToken();
        if (!token || !supId || !date) return;

        setSigning(true);
        try {
            // Check task limit before signing
            const driverProfile = await api.getEsgDriverProfile(token);
            if (driverProfile && driverProfile.pickup_days) {
                const dayData = driverProfile.pickup_days.find((d: any) => d && d.date === parseInt(date));
                const acceptedCount = dayData?.contract_user?.filter((c: any) => c.is_accept === true).length || 0;

                if (acceptedCount >= 4) {
                    setAlertConfig({
                        isOpen: true,
                        title: "ขีดจํากัดการรับงาน",
                        message: "คุณรับงานครบ 4 รายการสำหรับวันนี้แล้ว เพื่อคุณภาพการบริการ โปรดรับงานในวันอื่นแทน"
                    });
                    setSigning(false);
                    return;
                }
            }

            await api.signEsgContract(token, supId, parseInt(date));
            setShowSuccess(true);
        } catch (err: any) {
            setAlertConfig({
                isOpen: true,
                title: "Error",
                message: err.message || "Failed to sign contract"
            });
        } finally {
            setSigning(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading...</div>;
    if (!subscriptor) return <div className={styles.error}>Subscriptor not found</div>;

    const currentDay = subscriptor.pickup_days.find(d => d.date === parseInt(date || "0"));
    const isAlreadySigned = currentDay?.category === 'waiting' || currentDay?.category === 'accept';
    const chatId = currentDay?.chat_id;

    const resolvedPhone = subscriptor.address_phone || subscriptor.user_phone || "Not provided";
    const memberSinceDate = new Date(subscriptor.created_at).toLocaleDateString();

    const handleReportUser = () => {
        navigate('/user-report', {
            state: {
                userId: subscriptor.user_id,
                userName: subscriptor.full_name,
                userType: 'subscriptor'
            }
        });
    };

    return (
        <div className={styles.container}>
            {showMap && subLocation && (
                <div className={styles.mapModal}>
                    <PageHeader title="Pickup Location" onBack={() => setShowMap(false)} />
                    <div className={styles.mapContent}>
                        <MapSelector
                            onLocationSelect={() => { }}
                            initialLat={subLocation.lat}
                            initialLng={subLocation.lng}
                            driverLat={driverLocation?.lat}
                            driverLng={driverLocation?.lng}
                            isReadOnly={true}
                        />
                    </div>
                </div>
            )}

            <PageHeader title="Subscriptor Information" onBack={() => navigate(-1)} />

            <div className={styles.profileHeader}>
                <div className={styles.avatarWrapper}>
                    <img src={subscriptor.avatar_url || profileLogo} className={styles.avatar} alt="" />
                    <div className={styles.verifiedBadge}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                    </div>
                    {chatId && (
                        <button
                            className={styles.chatButton}
                            onClick={() => navigate(`/chat/${chatId}`)}
                            title="Chat with subscriptor"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-5H6V7h12v2z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.sectionTitle}>SUBSCRIPTOR INFORMATION</div>

                <div className={styles.infoCard}>
                    <div className={styles.cardLeft}>
                        <div className={styles.iconWrapper}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </div>
                        <div className={styles.infoContent}>
                            <span className={styles.label}>Name</span>
                            <span className={styles.value}>{subscriptor.full_name}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.infoCard}>
                    <div className={styles.cardLeft}>
                        <div className={styles.iconWrapper}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                            </svg>
                        </div>
                        <div className={styles.infoContent}>
                            <span className={styles.label}>Phone Number</span>
                            <span className={styles.value}>{resolvedPhone}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.infoCard}>
                    <div className={styles.cardLeft}>
                        <div className={styles.iconWrapper}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                            </svg>
                        </div>
                        <div className={styles.infoContent}>
                            <span className={styles.label}>Email</span>
                            <span className={styles.value}>{subscriptor.email || "Not provided"}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.infoCard}>
                    <div className={styles.cardLeft}>
                        <div className={styles.iconWrapper}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                            </svg>
                        </div>
                        <div className={styles.infoContent}>
                            <span className={styles.label}>Member Since</span>
                            <span className={styles.value}>{memberSinceDate}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.infoCard}>
                    <div className={styles.cardLeft}>
                        <div className={styles.iconWrapper}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 8.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z" />
                            </svg>
                        </div>
                        <div className={styles.infoContent}>
                            <span className={styles.label}>แพ็กเกจ:</span>
                            <span className={styles.value}>{subscriptor.package_name}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.divider}></div>

                <div className={styles.sectionTitle}>PICKUP LOCATION</div>
                <div className={styles.locationCard}>
                    <div className={styles.locationInfo}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={styles.locIcon}>
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        <span>{subAddressText || `${subscriptor.sub_district}, ${subscriptor.district}`}</span>
                    </div>
                    <button className={styles.mapButton} onClick={() => setShowMap(true)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" />
                        </svg>
                    </button>
                </div>

                <div className={styles.reportSection}>
                    <p className={styles.reportTitle}>พบเจอปัญหาจากการใช้บริการ?</p>
                    <button className={styles.reportButton} onClick={handleReportUser}>
                        Report This User
                    </button>
                </div>
            </div>

            <div className={styles.footer}>
                <button
                    className={`${styles.signButton} ${isAlreadySigned ? styles.disabled : ''}`}
                    onClick={handleSignContract}
                    disabled={signing || isAlreadySigned}
                >
                    {signing ? "กำลังดำเนินการ..." : isAlreadySigned ? "ทำสัญญาแล้ว" : "ทำสัญญารับทิ้งขยะ"}
                </button>
            </div>

            <SuccessPopup
                isOpen={showSuccess}
                title="Success!"
                message="คุณได้ทำสัญญาเรียบร้อยแล้ว กรุณารอการยืนยันจากผู้ใช้"
                onConfirm={() => navigate('/esg/subscriptors')}
                confirmText="ตกลง"
            />

            <AlertPopup
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
            />
        </div >
    );
}

export default EsgSubscriptorDetail;
