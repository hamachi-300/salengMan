import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import styles from "./EsgTaskExplore.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import MapSelector from "../../components/MapSelector";
import { useUser } from "../../context/UserContext";

function EsgTaskExplore() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode'); // 'factory' or null/customer
    const { currentLocation } = useUser();
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTaskDetails();
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

    const isFactoryMode = mode === 'factory';
    const destLat = isFactoryMode ? parseFloat(task.factory_lat) : parseFloat(task.pickup_lat);
    const destLng = isFactoryMode ? parseFloat(task.factory_lng) : parseFloat(task.pickup_lng);

    return (
        <div className={styles.page}>
            <PageHeader title={isFactoryMode ? "เส้นทางไปโรงงาน" : "แผนที่นำทาง"} onBack={() => navigate(-1)} />

            <div className={styles.mapContainer}>
                <MapSelector
                    onLocationSelect={() => { }}
                    initialLat={destLat}
                    initialLng={destLng}
                    driverLat={currentLocation?.lat}
                    driverLng={currentLocation?.lng}
                    isReadOnly={true}
                    showGpsButton={!isFactoryMode}
                    showRecenterButton={isFactoryMode}
                    showRefreshButton={true}
                    onRefresh={fetchTaskDetails}
                />
            </div>
        </div>
    );
}

export default EsgTaskExplore;
