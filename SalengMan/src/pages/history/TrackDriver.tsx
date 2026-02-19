import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./TrackDriver.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import MapSelector from "../../components/MapSelector";

function TrackDriver() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        fetchPostDetails();
    }, [id]);

    useEffect(() => {
        if (!post || !post.contacts || post.contacts.length === 0) return;

        const driverId = post.contacts[0].driver_id;
        if (!driverId) return;

        const updateLocation = async () => {
            const token = getToken();
            if (!token) return;
            try {
                const loc = await api.getDriverLocation(token, driverId);
                setDriverLoc({ lat: Number(loc.lat), lng: Number(loc.lng) });
            } catch (err) {
                console.error("Failed to fetch driver location:", err);
            }
        };

        updateLocation(); // Initial fetch
        const interval = setInterval(updateLocation, 5000);

        return () => clearInterval(interval);
    }, [post]);

    const fetchPostDetails = async () => {
        const token = getToken();
        if (!token || !id) {
            navigate("/signin");
            return;
        }

        try {
            const data = await api.getPostById(token, id);
            setPost(data);
        } catch (error) {
            console.error("Failed to fetch post details:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <PageHeader title="Track Driver" backTo={`/history/${id}`} />
                <div className={styles.loading}>Loading map...</div>
            </div>
        );
    }

    const address = typeof post?.address_snapshot === 'string'
        ? JSON.parse(post.address_snapshot)
        : post?.address_snapshot;

    if (!address || !address.lat || !address.lng) {
        return (
            <div className={styles.page}>
                <PageHeader title="Track Driver" backTo={`/history/${id}`} />
                <div className={styles.empty}>Pickup location data not found.</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageHeader title="Track Driver" backTo={`/history/${id}`} />

            <div className={styles.mapContainer}>
                <MapSelector
                    onLocationSelect={() => { }} // Read-only
                    initialLat={parseFloat(address.lat)}
                    initialLng={parseFloat(address.lng)}
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

export default TrackDriver;
