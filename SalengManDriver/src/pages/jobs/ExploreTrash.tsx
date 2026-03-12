import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ExploreTrash.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";
import MapSelector from "../../components/MapSelector";
import { useUser } from "../../context/UserContext";

interface TrashPost {
    id: number;
    images?: string[];
    remarks: string;
    address_snapshot: any;
    status: string;
    created_at: string;
}

function ExploreTrash() {
    const navigate = useNavigate();
    const { currentLocation } = useUser();
    const [posts, setPosts] = useState<TrashPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<TrashPost | null>(null);

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
            // Need to add this to Driver API
            const data = await (api as any).getAvailableTrashPosts(token);
            setPosts(data);
        } catch (error) {
            console.error("Failed to fetch trash posts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptJob = async () => {
        if (!selectedPost) return;
        const token = getToken();
        if (!token) return;

        try {
            // In a real flow, this would create a contact or update status
            // For now, let's redirect to a detail page or confirm
            alert(`You accepted trash job #${selectedPost.id}. This featured is under development.`);
        } catch (err) {
            console.error("Failed to accept job:", err);
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

            <div className={styles.mapContainer}>
                <MapSelector
                    onLocationSelect={() => { }} // Read-only
                    initialLat={currentLocation?.lat || 13.7563}
                    initialLng={currentLocation?.lng || 100.5018}
                    isReadOnly={true}
                    showGpsButton={true}
                />
                
                {/* Overlay for markers would go here if MapSelector supported multi-markers */}
                <div className={styles.listOverlay}>
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
                                    className={`${styles.postCard} ${selectedPost?.id === post.id ? styles.selected : ''}`}
                                    onClick={() => setSelectedPost(post)}
                                >
                                    <div className={styles.postInfo}>
                                        <div className={styles.postId}>Job #{post.id}</div>
                                        <div className={styles.postAddress}>{address?.label || 'Unknown Location'}</div>
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

            <PageFooter
                title={selectedPost ? "Accept Job" : "Select a Job"}
                onClick={handleAcceptJob}
                disabled={!selectedPost}
            />
        </div>
    );
}

export default ExploreTrash;
