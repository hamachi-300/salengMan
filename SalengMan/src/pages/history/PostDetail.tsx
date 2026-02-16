import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./PostDetail.module.css";
import PageHeader from "../../components/PageHeader";
import { api, Address } from "../../config/api";
import { getToken } from "../../services/auth";
import ConfirmPopup from "../../components/ConfirmPopup";
import { useSell } from "../../context/SellContext";

interface Post {
    id: number;
    categories: string[];
    remarks: string;
    created_at: string;
    status: string;
    images?: string[];
    address_snapshot: any;
    pickup_time: any;
    post_type?: 'old_item' | 'trash_disposal';
    contacts?: { contact_id: string; driver_id: string }[];
}

function PostDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { setEditingPost } = useSell();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const isEditable = post?.status === 'waiting';

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
            const data = await api.getPostById(token, id);
            setPost(data);
        } catch (err: any) {
            console.error("Failed to load post:", err);
            setError("Failed to load post details");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    };

    const getPostTypeLabel = (postType?: string) => {
        return postType === 'trash_disposal' ? 'ทิ้งขยะ' : 'ขายของเก่า';
    };

    const handleDelete = async () => {
        setDeleteLoading(true);
        const token = getToken();
        if (!token || !post) return;

        try {
            await api.deletePost(token, post.id);
            navigate("/history");
        } catch (err: any) {
            console.error("Failed to delete post:", err);
            alert(err.message || "Failed to delete post");
        } finally {
            setDeleteLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleEdit = (targetPage: string) => {
        if (!post) return;

        const address = typeof post.address_snapshot === 'string'
            ? JSON.parse(post.address_snapshot)
            : post.address_snapshot;

        const pickupTime = typeof post.pickup_time === 'string'
            ? JSON.parse(post.pickup_time)
            : post.pickup_time;

        // Convert address to the format expected by SellContext
        const addressData: Address | null = address ? {
            id: address.id || 0,
            label: address.label || '',
            address: address.address || '',
            phone: address.phone || '',
            is_default: false,
            icon: 'other',
            lat: address.lat,
            lng: address.lng,
        } : null;

        setEditingPost(post.id, {
            images: post.images || [],
            categories: post.categories || [],
            remarks: post.remarks || '',
            address: addressData,
            pickupTime: pickupTime ? {
                date: pickupTime.date,
                startTime: pickupTime.startTime,
                endTime: pickupTime.endTime,
            } : null,
        });

        navigate(targetPage);
    };

    if (loading) {
        return (
            <div className={styles['page']}>
                <PageHeader title="Post Detail" backTo="/history" />
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
                <PageHeader title="Post Detail" backTo="/history" />
                <div className={styles['error-container']}>
                    <p>{error || "Post not found"}</p>
                </div>
            </div>
        );
    }

    const address = typeof post.address_snapshot === 'string'
        ? JSON.parse(post.address_snapshot)
        : post.address_snapshot;

    const pickupTime = typeof post.pickup_time === 'string'
        ? JSON.parse(post.pickup_time)
        : post.pickup_time;

    return (
        <div className={styles['page']}>
            <PageHeader title="Post Detail" backTo="/history" />

            <div className={styles['content']}>
                {/* Status Badge */}
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
                    <span className={styles['post-type-label']}>{getPostTypeLabel(post.post_type)}</span>
                </div>

                {/* Images Card */}
                {post.images && post.images.length > 0 && (
                    <div className={styles['card']}>
                        <div className={styles['card-title']}>
                            <span>Item Photos</span>
                            {isEditable && (
                                <span className={styles['edit-link']} onClick={() => handleEdit('/sell')}>Edit</span>
                            )}
                        </div>
                        <div className={styles['image-grid']}>
                            {post.images.map((img, idx) => (
                                <img key={idx} src={img} alt={`Item ${idx + 1}`} className={styles['image-item']} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Details Card */}
                <div className={styles['card']}>
                    <div className={styles['card-title']}>
                        <span>Item Details</span>
                        {isEditable && (
                            <span className={styles['edit-link']} onClick={() => handleEdit('/sell')}>Edit</span>
                        )}
                    </div>

                    <div className={styles['detail-row']}>
                        <div className={styles['detail-content']}>
                            <span className={styles['detail-label']}>Categories</span>
                            <div className={styles['tags-wrapper']}>
                                {post.categories.map(cat => (
                                    <span key={cat} className={styles['category-chip']}>{cat}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {post.remarks && (
                        <div className={styles['detail-row']} style={{ marginTop: '12px' }}>
                            <div className={styles['detail-content']}>
                                <span className={styles['detail-label']}>Remarks</span>
                                <p className={styles['remarks-text']}>{post.remarks}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Pickup Information Card */}
                <div className={styles['card']}>
                    <div className={styles['card-title']}>
                        <span>Pickup Information</span>
                    </div>

                    {/* Location Row */}
                    <div className={styles['detail-row']}>
                        <svg className={styles['detail-icon']} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        <div className={styles['detail-content']}>
                            <div className={styles['detail-header']}>
                                <span className={styles['detail-label']}>Pickup Location</span>
                                {isEditable && (
                                    <span className={styles['change-link']} onClick={() => handleEdit('/sell/select-address')}>Change</span>
                                )}
                            </div>
                            {address && (
                                <>
                                    <span className={styles['detail-value']}>{address.label}</span>
                                    <span className={styles['detail-value-small']}>{address.address}</span>
                                    {address.phone && (
                                        <span className={styles['detail-value']}>{address.phone}</span>
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
                            <div className={styles['detail-header']}>
                                <span className={styles['detail-label']}>Pickup Time</span>
                                {isEditable && (
                                    <span className={styles['change-link']} onClick={() => handleEdit('/sell/select-time')}>Change</span>
                                )}
                            </div>
                            {pickupTime && (
                                <>
                                    <span className={styles['detail-value']}>{formatDate(pickupTime.date)}</span>
                                    <span className={styles['detail-value']}>{pickupTime.startTime} - {pickupTime.endTime}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className={styles['action-buttons']}>
                    <button className={styles['view-buyers-btn']}>
                        <svg className={styles['btn-icon']} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                        View Buyers {post.contacts && post.contacts.length > 0 && `(${post.contacts.length})`}
                    </button>
                    {(post.status === 'waiting' || post.status === 'pending') && (
                        <button className={styles['delete-btn']} onClick={() => setShowDeleteConfirm(true)}>
                            <svg className={styles['delete-icon']} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <ConfirmPopup
                isOpen={showDeleteConfirm}
                title="Delete Post?"
                message="คุณแน่ใจหรือไม่ว่าต้องการลบโพสต์นี้ การกระทำนี้ไม่สามารถย้อนกลับได้"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                isLoading={deleteLoading}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    );
}

export default PostDetail;
