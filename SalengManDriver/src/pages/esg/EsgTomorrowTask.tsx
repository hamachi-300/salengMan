import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EsgTomorrowTask.module.css';
import PageHeader from '../../components/PageHeader';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';
import profileLogo from '../../assets/icon/profile.svg';
import { useUser } from '../../context/UserContext';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

const EsgTomorrowTask: React.FC = () => {
    const { initialLocation } = useUser();
    const navigate = useNavigate();

    const [subscriptors, setSubscriptors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [subLocations, setSubLocations] = useState<Record<string, { lat: number, lng: number }>>({});
    const [tomorrowDate, setTomorrowDate] = useState<number>(0);

    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const day = tomorrow.getDate();
        setTomorrowDate(day);

        if (day <= 28) {
            fetchSubscriptors(day);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchSubscriptors = async (day: number) => {
        setLoading(true);
        try {
            const token = getToken();
            if (!token) return;
            const data = await api.getAvailableEsgSubscriptions(token, day);

            // Further filter for category 'accept' to double-ensure correct data
            const acceptedOnly = data.map((sub: any) => ({
                ...sub,
                pickup_days: sub.pickup_days.filter((d: any) => d.date === day && d.category === 'accept')
            })).filter((sub: any) => sub.pickup_days.length > 0);

            setSubscriptors(acceptedOnly);

            // Fetch addresses for distance calculation
            const locations: Record<string, { lat: number, lng: number }> = {};
            for (const sub of acceptedOnly) {
                if (!locations[sub.user_id]) {
                    if (sub.lat !== undefined && sub.lng !== undefined) {
                        locations[sub.user_id] = { lat: sub.lat, lng: sub.lng };
                    } else {
                        try {
                            const addresses = await api.getAddressesByUserId(token, sub.user_id);
                            const subAddr = addresses.find((a: any) => a.id === sub.address_id);
                            if (subAddr?.lat !== undefined && subAddr?.lng !== undefined) {
                                locations[sub.user_id] = { lat: subAddr.lat, lng: subAddr.lng };
                            }
                        } catch (e) {
                            console.warn("Failed to fetch address for subscriber", sub.user_id);
                        }
                    }
                }
            }
            setSubLocations(locations);
        } catch (error) {
            console.error('Failed to fetch subscriptors:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <PageHeader title="งานวันพรุ่งนี้" onBack={() => navigate('/esg/driver')} />

            <div className={styles.dateHeader}>
                <span className={styles.dateLabel}>งานประจำวันที่ {tomorrowDate}</span>
            </div>

            <div className={styles.content}>
                {tomorrowDate > 28 ? (
                    <div className={styles.empty}>ไม่มีรอบเก็บขยะในวันที่ {tomorrowDate}</div>
                ) : loading ? (
                    <div className={styles.loading}>กำลังโหลด...</div>
                ) : subscriptors.length === 0 ? (
                    <div className={styles.empty}>ไม่มีงานที่คุณรับไว้ในวันพรุ่งนี้</div>
                ) : (
                    <div className={styles.subList}>
                        {subscriptors.map((sub: any) =>
                            sub.pickup_days.map((day: any) => {
                                const loc = subLocations[sub.user_id];
                                const distance = initialLocation && loc ? calculateDistance(initialLocation.lat, initialLocation.lng, loc.lat, loc.lng) : null;

                                return (
                                    <div
                                        key={`${sub.sup_id}-${day.date}`}
                                        className={styles.subCard}
                                        onClick={() => navigate(`/esg/subscriptor-detail/${sub.sup_id}/${day.date}`)}
                                    >
                                        <div className={styles.subInfo}>
                                            <div className={styles.avatarContainer}>
                                                <img src={sub.avatar_url || profileLogo} className={styles.avatar} alt="Avatar" />
                                                <div className={styles.onlineIndicator} />
                                            </div>
                                            <div className={styles.details}>
                                                <div className={styles.nameRow}>
                                                    <h3 className={styles.name}>{sub.full_name}</h3>
                                                    <span className={styles.statusBadge}>ยืนยันแล้ว</span>
                                                </div>
                                                <p className={styles.address}>
                                                    {sub.sub_district}, {sub.district}
                                                </p>
                                                <div className={styles.tags}>
                                                    <span className={styles.packageTag}>{sub.package_name}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.sideContent}>
                                            {distance !== null && <span className={styles.distanceText}>{distance.toFixed(1)} km</span>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EsgTomorrowTask;
