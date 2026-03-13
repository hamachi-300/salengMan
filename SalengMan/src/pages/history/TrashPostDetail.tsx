import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./TrashPostDetail.module.css";
import PageHeader from "../../components/PageHeader";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import ConfirmPopup from "../../components/ConfirmPopup";
import AlertPopup from "../../components/AlertPopup";
import ImageViewer from "../../components/ImageViewer";

interface TrashPost {
    id: number;
    images: string[];
    remarks: string;
    coins_selected: number;
    trash_bag_amount: number;
    address_snapshot: any;
    status: string;
    created_at: string;
}

function TrashPostDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState<TrashPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    // Image viewer state
    const [viewerImages, setViewerImages] = useState<string[]>([]);
    const [viewerIndex, setViewerIndex] = useState(0);

    useEffect(() => {
        fetchPost();
    }, [id]);

    const fetchPost = async () => {
        const token = getToken();
        if (!token) {
            navigate("/signin");
            return;
        }
        if (!id) return;

        try {
            const data = await api.getTrashPostById(token, id);
            setPost(data);
        } catch (err: any) {
            console.error("Failed to load trash post:", err);
            setError("Failed to load post details");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString("en-US", options);
    };

    const handleDelete = async () => {
        setDeleteLoading(true);
        const token = getToken();
        if (!token || !post) return;

        try {
            await api.deleteTrashPost(token, post.id);
            navigate("/history");
        } catch (err: any) {
            console.error("Failed to delete post:", err);
            setAlertMessage(err.message || "Failed to delete post");
        } finally {
            setDeleteLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    if (loading) {
        return (
            <div className={styles['page']}>
                <PageHeader title="Trash Detail" backTo="/history" />
                <div className={styles['loading-container']}>
                    <div className={styles['spinner']}></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className={styles['page']}>
                <PageHeader title="Trash Detail" backTo="/history" />
                <div className={styles['error-container']}>
                    <p>{error || "Post not found"}</p>
                </div>
            </div>
        );
    }

    const address = typeof post.address_snapshot === 'string'
        ? JSON.parse(post.address_snapshot)
        : post.address_snapshot;

    return (
        <div className={styles['page']}>
            <PageHeader title="Trash Detail" backTo="/history" />

            <div className={styles['content']}>
                {/* Status Section */}
                <div className={styles['status-section']}>
                    <div
                        className={styles['status-badge']}
                        style={{
                            backgroundColor: `var(--${post.status.toLowerCase()}-bg)`,
                            color: `var(--${post.status.toLowerCase()}-text)`,
                            border: `1px solid var(--${post.status.toLowerCase()}-border)`
                        }}
                    >
                        <div className={styles['status-dot']} />
                        {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                    </div>
                    <span className={styles['post-type-label']}>ทิ้งขยะ</span>
                </div>

                {/* Images Card */}
                {post.images && post.images.length > 0 && (
                    <div className={styles['card']}>
                        <div className={styles['card-title']}>Trash Photos</div>
                        <div className={styles['image-grid']}>
                            {post.images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img}
                                    alt={`Item ${idx + 1}`}
                                    className={styles['image-item']}
                                    onClick={() => {
                                        setViewerImages(post.images!);
                                        setViewerIndex(idx);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Volume & Payment Card */}
                <div className={styles['card']}>
                    <div className={styles['card-title']}>Volume & Payment</div>
                    <div className={styles['tags-wrapper']}>
                        <span className={styles['category-chip']}>
                            {post.trash_bag_amount} Bag{post.trash_bag_amount > 1 ? 's' : ''}
                        </span>
                        <span className={styles['category-chip']}>
                            {post.coins_selected} Coin{post.coins_selected > 1 ? 's' : ''}
                        </span>
                    </div>

                    {post.remarks && (
                        <div className={styles['remarks-section']} style={{ marginTop: '16px' }}>
                            <span className={styles['detail-label']}>Remarks</span>
                            <p className={styles['remarks-text']}>{post.remarks}</p>
                        </div>
                    )}
                </div>

                {/* Pickup Information Card */}
                <div className={styles['card']}>
                    <div className={styles['card-title']}>Pickup Information</div>

                    {/* Location Row */}
                    <div className={styles['detail-row']}>
                        <svg className={styles['detail-icon']} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        <div className={styles['detail-content']}>
                            <span className={styles['detail-label']}>Location</span>
                            {address && (
                                <>
                                    <span className={styles['detail-value']}>{address.label}</span>
                                    <span className={styles['detail-value-small']}>{address.address}</span>
                                    {address.phone && (
                                        <span className={styles['detail-value']} style={{ marginTop: '4px' }}>{address.phone}</span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Time Row */}
                    <div className={styles['detail-row']} style={{ marginTop: '16px' }}>
                        <svg className={styles['detail-icon']} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                        </svg>
                        <div className={styles['detail-content']}>
                            <span className={styles['detail-label']}>Posted On</span>
                            <span className={styles['detail-value']}>{formatDate(post.created_at)}</span>
                        </div>
                    </div>
                </div>

                {/* Delete Button (Only for waiting posts) */}
                {post.status.toLowerCase() === 'waiting' && (
                    <div className={styles['action-buttons']}>
                        <button className={styles['delete-btn']} onClick={() => setShowDeleteConfirm(true)}>
                            <svg className={styles['delete-icon']} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1-1H5v2h14V4z" />
                            </svg>
                            Delete Post
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            <ConfirmPopup
                isOpen={showDeleteConfirm}
                title="Delete Trash Post?"
                message="Are you sure you want to delete this post? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                isLoading={deleteLoading}
                confirmText="Delete"
                cancelText="Cancel"
            />

            <AlertPopup
                isOpen={alertMessage !== null}
                title="Notice"
                message={alertMessage || ""}
                onClose={() => setAlertMessage(null)}
            />

            {viewerImages.length > 0 && (
                <ImageViewer
                    images={viewerImages}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerImages([])}
                />
            )}
        </div>
    );
}

export default TrashPostDetail;
