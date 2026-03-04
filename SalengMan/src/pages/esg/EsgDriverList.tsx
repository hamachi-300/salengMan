import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./EsgDriverList.module.css";
import PageHeader from "../../components/PageHeader";
import profileLogo from "../../assets/icon/profile.svg";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";

function EsgDriverList() {
    const { supId, date } = useParams();
    const navigate = useNavigate();
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchDrivers();
    }, [supId, date]);

    const fetchDrivers = async () => {
        const token = getToken();
        if (!token) {
            navigate("/signin");
            return;
        }

        if (!supId || !date) return;

        try {
            const data = await api.getEsgInterestedDrivers(token, supId, parseInt(date));
            setDrivers(data);
        } catch (err: any) {
            console.error("Failed to load drivers:", err);
            setError("Failed to load interested drivers");
        } finally {
            setLoading(false);
        }
    };

    if (error) {
        return (
            <div className={styles['page']}>
                <PageHeader title="Interested Driver" backTo={`/esg/choose-date-driver`} />
                <div className={styles['error-container']}>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles['page']}>
                <PageHeader title="Interested Driver" backTo={`/esg/choose-date-driver`} />
                <div className={styles['loading-container']}>
                    <div className={styles['spinner']}></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles['page']}>
            <PageHeader title="Interested Driver" backTo={`/esg/choose-date-driver`} />

            <div className={styles['content']}>
                <h2 className={styles['section-title']}>
                    PENDING REQUESTS ({drivers.length})
                </h2>

                <div className={styles['driver-list']}>
                    {drivers.length > 0 ? (
                        drivers.map((driver) => (
                            <div
                                key={driver.id}
                                className={styles['driver-card']}
                                onClick={() => navigate(`/esg/driver-confirm/${supId}/${date}/${driver.id}`)}
                            >
                                <div className={styles['avatar-container']}>
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
                                    <div className={styles['online-indicator']} />
                                </div>
                                <div className={styles['driver-info']}>
                                    <h3 className={styles['driver-name']}>{driver.full_name}</h3>
                                    <span className={styles['member-since']}>Member since {new Date(driver.created_at).getFullYear()}</span>
                                </div>
                                <svg className={styles['chevron-icon']} viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                                </svg>
                            </div>
                        ))
                    ) : (
                        <p className={styles['empty-state']}>No interested drivers yet.</p>
                    )}
                </div>
            </div>

            <div className={styles['footer-wrapper']}>
                <p className={styles['footer-text']}>Interested Driver can also link to driver profile</p>
            </div>
        </div>
    );
}

export default EsgDriverList;
