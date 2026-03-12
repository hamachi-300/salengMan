import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EsgSearchSub.module.css';
import PageHeader from '../../components/PageHeader';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';

const EsgSearchSub: React.FC = () => {
    const navigate = useNavigate();
    const [pickupDays, setPickupDays] = useState<any[]>([]);

    useEffect(() => {
        fetchDriverProfile();
    }, []);

    const fetchDriverProfile = async () => {
        const token = getToken();
        if (!token) return;
        try {
            const profile = await api.getEsgDriverProfile(token);
            if (profile && profile.pickup_days) {
                setPickupDays(profile.pickup_days);
            }
        } catch (error) {
            console.error("Failed to fetch driver profile", error);
        }
    };

    // Generate dates 1-28
    const dates = Array.from({ length: 28 }, (_, i) => i + 1);

    const isDateAccepted = (date: number) => {
        const dayData = pickupDays.find(d => d && d.date === date);
        if (!dayData || !dayData.contract_user) return false;
        return dayData.contract_user.some((c: any) => c.is_accept === true);
    };

    const handleDateClick = (date: number) => {
        navigate('/esg/subscriptors', { state: { filterDate: date } });
    };

    return (
        <div className={styles.container}>
            <PageHeader title="ค้นหาผู้จอง (ESG)" onBack={() => navigate('/esg/driver')} />
            <div className={styles.content}>
                <h2 className={styles.sectionTitle}>เลือกวันที่ต้องการทำสัญญา</h2>
                <div className={styles.dateGrid}>
                    {dates.map((date) => {
                        const accepted = isDateAccepted(date);
                        return (
                            <div
                                key={date}
                                className={`${styles.dateCard} ${accepted ? styles.acceptedCard : ''}`}
                                onClick={() => handleDateClick(date)}
                            >
                                <span className={`${styles.dateNumber} ${accepted ? styles.acceptedNumber : ''}`}>{date}</span>
                                <span className={`${styles.dateLabel} ${accepted ? styles.acceptedLabel : ''}`}>วันที่</span>
                            </div>
                        );
                    })}
                </div>

                <div className={styles.actionArea}>
                    <button
                        className={styles.searchAllButton}
                        onClick={() => navigate('/esg/subscriptors')}
                    >
                        ค้นหาทั้งหมด
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EsgSearchSub;
