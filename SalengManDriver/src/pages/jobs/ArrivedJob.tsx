import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ArrivedJob.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";

interface TrashPost {
    id: number;
    trash_bag_amount: number;
    coins_selected: number;
    status: string;
}

function ArrivedJob() {
    const navigate = useNavigate();
    const [posts, setPosts] = useState<TrashPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReceivedPosts = async () => {
            const token = getToken();
            if (!token) return;

            try {
                const data = await api.getReceivedTrashPosts(token);
                setPosts(data);
            } catch (error) {
                console.error("Failed to fetch received posts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReceivedPosts();
    }, []);

    const handleConfirm = () => {
        navigate("/home", { state: { successMessage: "All shifts completed!" } });
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <PageHeader title="Arrived" backTo="/jobs/explore-trash" />
                <div className={styles.loading}>Loading received orders...</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageHeader title="Received Orders" backTo="/jobs/explore-trash" />
            
            <div className={styles.container}>
                <div className={styles.successIcon}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="60" height="60">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                </div>
                <h2 className={styles.title}>History Received!</h2>
                <p className={styles.message}>List of all jobs you have confirmed arrival and received.</p>
                
                <div className={styles.jobList}>
                    {posts.length === 0 ? (
                        <div className={styles.empty}>No received jobs found.</div>
                    ) : (
                        posts.map(post => (
                            <div key={post.id} className={styles.jobBrief}>
                                <div className={styles.briefItem}>
                                    <span className={styles.label}>Job ID</span>
                                    <span className={styles.value}>#{post.id}</span>
                                </div>
                                <div className={styles.briefItem}>
                                    <span className={styles.label}>Volume</span>
                                    <span className={styles.value}>{post.trash_bag_amount} Bags</span>
                                </div>
                                <div className={styles.briefItem}>
                                    <span className={styles.label}>Reward</span>
                                    <span className={styles.value}>{post.coins_selected} Coins</span>
                                </div>
                                <div className={styles.briefItem}>
                                    <span className={styles.label}>Status</span>
                                    <span className={styles.value} style={{color: '#4caf50'}}>{post.status}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <PageFooter 
                title="Finish All" 
                onClick={handleConfirm}
                variant="orange"
            />
        </div>
    );
}

export default ArrivedJob;
