import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./JobNavigation.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";
import MapSelector from "../../components/MapSelector";
import { useUser } from "../../context/UserContext";

interface TrashPost {
    id: number;
    address_snapshot: any;
    status: string;
}

function JobNavigation() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentLocation } = useUser();
    const [post, setPost] = useState<TrashPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [showArrivePopup, setShowArrivePopup] = useState(false);

    useEffect(() => {
        fetchPostDetails();
    }, [id]);

    const fetchPostDetails = async () => {
        const token = getToken();
        if (!token) {
            navigate("/signin");
            return;
        }

        try {
            if (id) {
                const found = await api.getTrashPost(token, id);
                if (found && found.status === 'waiting' && found.waiting_status === 'accepted') {
                    setPost(found);
                } else if (found) {
                    // Even if status changed, we still show it for navigation if it's the right one
                    // but the user specifically asked for "show post status=waiting and waiting_status=accepted"
                    setPost(found);
                }
            }
        } catch (error) {
            console.error("Failed to fetch post details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleArrived = async () => {
        const token = getToken();
        if (!token || !id) return;

        try {
            await api.receiveTrashPost(token, id);
            setShowArrivePopup(true);
        } catch (error) {
            console.error("Failed to mark post as arrived & received:", error);
            // Optional: alert user of failure
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <PageHeader title="Navigation" backTo="/jobs/explore-trash" />
                <div className={styles.loading}>Loading map...</div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className={styles.page}>
                <PageHeader title="Navigation" backTo="/jobs/explore-trash" />
                <div className={styles.empty}>Post not found or unavailable.</div>
            </div>
        );
    }

    const address = typeof post.address_snapshot === 'string' 
        ? JSON.parse(post.address_snapshot) 
        : post.address_snapshot;

    return (
        <div className={styles.page}>
            <PageHeader title="Road to Trash" backTo="/jobs/explore-trash" />
            
            <div className={styles.mapContainer}>
                <MapSelector
                    onLocationSelect={() => { }}
                    initialLat={address?.lat}
                    initialLng={address?.lng}
                    driverLat={currentLocation?.lat}
                    driverLng={currentLocation?.lng}
                    isReadOnly={true}
                    showGpsButton={true}
                    showRecenterButton={true}
                />
            </div>

            <PageFooter 
                title="Arrived" 
                onClick={handleArrived}
            />

            {showArrivePopup && (
                <div className={styles.modalOverlay} onClick={() => setShowArrivePopup(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Arrive location!</h3>
                        <p className={styles.modalMessage}>You have arrived at the destination.</p>
                        <div className={styles.modalActions}>
                            <button 
                                className={styles.selectJobButton}
                                onClick={() => navigate("/jobs/explore-trash")}
                            >
                                Select job
                            </button>
                            <button 
                                className={styles.receivedOrderButton}
                                onClick={() => navigate(`/jobs/arrived-job/${id}`)}
                            >
                                Received order
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default JobNavigation;
