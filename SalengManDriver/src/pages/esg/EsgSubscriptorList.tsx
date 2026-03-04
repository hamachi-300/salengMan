import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './EsgSubscriptorList.module.css';
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

const EsgSubscriptorList: React.FC = () => {
    const { initialLocation } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    const [subscriptors, setSubscriptors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState<string>("");
    const [activeTab, setActiveTab] = useState<'accept' | 'waiting' | 'discover'>('discover');
    const [subLocations, setSubLocations] = useState<Record<string, { lat: number, lng: number }>>({});

    useEffect(() => {
        if (location.state?.filterDate) {
            setFilterDate(location.state.filterDate);
        }
        fetchSubscriptors();
    }, [location.state?.filterDate, filterDate]);

    const fetchSubscriptors = async () => {
        setLoading(true);
        try {
            const token = getToken();
            if (!token) return;
            const data = await api.getAvailableEsgSubscriptions(token);
            setSubscriptors(data);

            // Fetch addresses for distance calculation
            const locations: Record<string, { lat: number, lng: number }> = {};
            for (const sub of data) {
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


    const filteredSubscriptors = subscriptors.filter((sub: any) => {
        return sub.pickup_days.some((day: any) => {
            const matchesDate = filterDate ? day.date === parseInt(filterDate) : true;
            const matchesTab = day.category === activeTab;
            return matchesDate && matchesTab;
        });
    });

    return (
        <div className={styles.container}>
            <PageHeader title="รายการผู้จองทิ้งขยะ" backTo="/esg/search_sub" />

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'discover' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('discover')}
                >
                    Discover
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'waiting' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('waiting')}
                >
                    Waiting
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'accept' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('accept')}
                >
                    Accept
                </button>
            </div>

            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>กำลังโหลด...</div>
                ) : filteredSubscriptors.length === 0 ? (
                    <div className={styles.empty}>ไม่พบรายการที่ตรงกับเงื่อนไข</div>
                ) : (
                    <div className={styles.subList}>
                        {filteredSubscriptors.map((sub: any) =>
                            sub.pickup_days
                                .filter((day: any) => {
                                    const matchesDate = filterDate ? day.date === parseInt(filterDate) : true;
                                    const matchesTab = day.category === activeTab;
                                    return matchesDate && matchesTab;
                                })
                                .map((day: any) => {
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
                                                        {day.category === 'accept' && <span className={styles.statusBadge}>ยืนยันแล้ว</span>}
                                                        {day.category === 'waiting' && <span className={styles.statusBadgeWaiting}>รอการยืนยัน</span>}
                                                    </div>
                                                    <p className={styles.address}>
                                                        date : <span className={styles.dateDisplay}>{day.date}</span>
                                                        {distance !== null && <span className={styles.distanceText}> ({distance.toFixed(1)} km)</span>}
                                                    </p>
                                                    <div className={styles.tags}>
                                                        <span className={styles.packageTag}>{sub.package_name}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {day.category === 'waiting' && (
                                                <div className={styles.waitingLabel}>รอการยืนยัน</div>
                                            )}
                                            {day.category === 'accept' && (
                                                <div className={styles.acceptedLabel}>
                                                    <svg viewBox="0 0 24 24" fill="currentColor" width="20">
                                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                                    </svg>
                                                    <span>ตกลงแล้ว</span>
                                                </div>
                                            )}
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

export default EsgSubscriptorList;
