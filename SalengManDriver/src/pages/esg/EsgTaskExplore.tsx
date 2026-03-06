import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./EsgTaskExplore.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import MapSelector from "../../components/MapSelector";
import { watchPosition, clearWatch } from '@tauri-apps/plugin-geolocation';
import { useUser } from "../../context/UserContext";

function EsgTaskExplore() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { initialLocation } = useUser();
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(initialLocation);

    useEffect(() => {
        fetchTaskDetails();

        let watchId: number | null = null;
        const startTracking = async () => {
            const isTauri = !!(window as any).__TAURI_INTERNALS__;
            if (isTauri) {
                try {
                    watchId = await watchPosition({ enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }, (pos, err) => {
                        if (err) return;
                        if (pos) setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    });
                } catch (error) {
                    console.warn("Tauri tracking error", error);
                }
            } else if ("geolocation" in navigator) {
                navigator.geolocation.watchPosition(
                    (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    null,
                    { enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }
                );
            }
        };

        startTracking();
        return () => {
            if (watchId !== null) clearWatch(watchId);
        };
    }, [id]);

    const fetchTaskDetails = async () => {
        const token = getToken();
        if (!token || !id) return;
        try {
            const data = await api.getEsgTaskById(token, id);
            setTask(data.task);
        } catch (error) {
            console.error("Failed to fetch task details:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <PageHeader title="แผนที่นำทาง" onBack={() => navigate(-1)} />
                <div className={styles.loading}>กำลังโหลดแผนที่...</div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className={styles.page}>
                <PageHeader title="แผนที่นำทาง" onBack={() => navigate(-1)} />
                <div className={styles.empty}>ไม่พบข้อมูลตำแหน่งสำหรับงานนี้</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageHeader title="แผนที่นำทาง" onBack={() => navigate(-1)} />

            <div className={styles.mapContainer}>
                <MapSelector
                    onLocationSelect={() => { }}
                    initialLat={parseFloat(task.pickup_lat)}
                    initialLng={parseFloat(task.pickup_lng)}
                    driverLat={driverLocation?.lat}
                    driverLng={driverLocation?.lng}
                    isReadOnly={true}
                    showGpsButton={true}
                    showRefreshButton={true}
                    onRefresh={fetchTaskDetails}
                    onGpsClick={(lat, lng) => setDriverLocation({ lat, lng })}
                />
            </div>
        </div>
    );
}

export default EsgTaskExplore;
