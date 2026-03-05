import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./EsgTrackDriver.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import MapSelector from "../../components/MapSelector";

function EsgTrackDriver() {
    const navigate = useNavigate();
    const { driverId } = useParams<{ driverId: string }>();
    const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
    const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
        const interval = setInterval(updateDriverLocation, 5000);
        return () => clearInterval(interval);
    }, [driverId]);

    const fetchInitialData = async () => {
        const token = getToken();
        if (!token || !driverId) {
            navigate("/signin");
            return;
        }

        try {
            // 1. Get user's default address for the "Home" marker
            const addresses = await api.getAddresses(token);
            const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
            if (defaultAddr && defaultAddr.lat && defaultAddr.lng) {
                setUserLoc({ lat: Number(defaultAddr.lat), lng: Number(defaultAddr.lng) });
            }

            // 2. Initial driver location
            await updateDriverLocation();
        } catch (err) {
            console.error("Failed to fetch initial data:", err);
        } finally {
            setLoading(false);
        }
    };

    const updateDriverLocation = async () => {
        const token = getToken();
        if (!token || !driverId) return;
        try {
            const loc = await api.getDriverLocation(token, driverId);
            setDriverLoc({ lat: Number(loc.lat), lng: Number(loc.lng) });
        } catch (err) {
            console.error("Failed to fetch driver location:", err);
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <PageHeader title="Track Driver" backTo="/esg/dispose-trash" />
                <div className={styles.loading}>Loading map...</div>
            </div>
        );
    }

    if (!userLoc) {
        return (
            <div className={styles.page}>
                <PageHeader title="Track Driver" backTo="/esg/dispose-trash" />
                <div className={styles.empty}>Your location data not found. Please set a default address.</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageHeader title="Track Driver" backTo="/esg/dispose-trash" />

            <div className={styles.mapContainer}>
                <MapSelector
                    onLocationSelect={() => { }} // Read-only
                    initialLat={userLoc.lat}
                    initialLng={userLoc.lng}
                    driverLat={driverLoc?.lat}
                    driverLng={driverLoc?.lng}
                    isReadOnly={true}
                />
            </div>

            <div className={styles.infoOverlay}>
                <div className={styles.infoItem}>
                    <div className={styles.dot} style={{ backgroundColor: '#2196F3' }} />
                    <span>Your Location (Home)</span>
                </div>
                <div className={styles.infoItem}>
                    <div className={styles.dot} style={{ backgroundColor: '#ff7a30' }} />
                    <span>Driver (Updates every 5s)</span>
                </div>
            </div>
        </div>
    );
}

export default EsgTrackDriver;
