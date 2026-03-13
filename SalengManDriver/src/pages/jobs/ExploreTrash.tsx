import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ExploreTrash.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import { useUser } from "../../context/UserContext";

interface TrashPost {
    id: number;
    images?: string[];
    remarks: string;
    address_snapshot: any;
    status: string;
    waiting_status: string;
    coins_selected: number;
    trash_bag_amount: number;
    created_at: string;
}

function ExploreTrash() {
    const navigate = useNavigate();
    const { currentLocation } = useUser();
    const [posts, setPosts] = useState<TrashPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<TrashPost | null>(null);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    const formatDistance = (dist: number) => {
        if (dist < 1) return `${(dist * 1000).toFixed(0)} m`;
        return `${dist.toFixed(1)} km`;
    }

    useEffect(() => {
        fetchAvailableTrash();
    }, []);

    const fetchAvailableTrash = async () => {
        const token = getToken();
        if (!token) {
            navigate("/signin");
            return;
        }

        try {
            const data = await api.getAvailableTrashPosts(token);
            setPosts(data);
        } catch (error) {
            console.error("Failed to fetch trash posts:", error);
        } finally {
            setLoading(false);
        }
    };


    const handleAcceptJob = async (jobId: number) => {
        const token = getToken();
        if (!token) return;

        try {
            await api.acceptTrashPost(token, jobId);
            navigate(`/jobs/trash-navigation/${jobId}`);
        } catch (error: any) {
            console.error("Failed to accept job:", error);
            alert(error.message || "Failed to accept job");
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <PageHeader title="Find Trash" backTo="/home" />
                <div className={styles.loading}>Loading trash posts...</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageHeader title="Find Trash" backTo="/home" />

            <div className={styles.container}>
                <div className={styles.headerActions}>
                    <button 
                        className={styles.viewArrivedButton}
                        onClick={() => navigate("/jobs/arrived-job")}
                    >
                        View arrived job
                    </button>
                </div>

                <div className={styles.jobList}>
                    {posts.length === 0 ? (
                        <div className={styles.empty}>No trash posts available nearby.</div>
                    ) : (
                        posts.map(post => {
                            const address = typeof post.address_snapshot === 'string' 
                                ? JSON.parse(post.address_snapshot) 
                                : post.address_snapshot;
                            
                            return (
                                <div 
                                    key={post.id} 
                                    className={styles.postCard}
                                    onClick={() => setSelectedJob(post)}
                                >
                                    <div className={styles.postInfo}>
                                        <div className={styles.postId}>Job #{post.id}</div>
                                        <div className={styles.postDistance}>
                                            {address?.lat && address?.lng && currentLocation 
                                                ? `${formatDistance(calculateDistance(currentLocation.lat, currentLocation.lng, address.lat, address.lng))} away`
                                                : address?.label || 'Unknown Location'}
                                        </div>
                                        <div className={styles.postStats}>
                                            <span className={styles.bagTag}>{post.trash_bag_amount} Bags</span>
                                            <span className={styles.coinTag}>{post.coins_selected} Coins</span>
                                        </div>
                                        <div className={styles.postRemarks}>{post.remarks}</div>
                                    </div>
                                    {post.images && post.images.length > 0 && (
                                        <img src={post.images[0]} alt="Trash" className={styles.postImage} />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {selectedJob && (
                <div className={styles.modalOverlay} onClick={() => setSelectedJob(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalTitle}>Job Details</div>
                            <button className={styles.closeButton} onClick={() => setSelectedJob(null)}>×</button>
                        </div>
                        
                        <div className={styles.modalBody}>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Reward</span>
                                <span className={styles.detailValue}>{selectedJob.coins_selected} Coins</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Volume</span>
                                <span className={styles.detailValue}>{selectedJob.trash_bag_amount} Bags</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Distance</span>
                                <span className={styles.detailValue}>
                                    {(() => {
                                        const addr = typeof selectedJob.address_snapshot === 'string' 
                                            ? JSON.parse(selectedJob.address_snapshot) 
                                            : selectedJob.address_snapshot;
                                        return addr?.lat && addr?.lng && currentLocation 
                                            ? formatDistance(calculateDistance(currentLocation.lat, currentLocation.lng, addr.lat, addr.lng))
                                            : 'N/A';
                                    })()}
                                </span>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button 
                                className={styles.exploreButton}
                                onClick={() => handleAcceptJob(selectedJob.id)}
                            >
                                Explore Map
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ExploreTrash;
