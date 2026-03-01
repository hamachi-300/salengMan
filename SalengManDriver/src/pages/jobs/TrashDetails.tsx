import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./TrashDetails.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import MapSelector from "../../components/MapSelector";
import { watchPosition, clearWatch } from '@tauri-apps/plugin-geolocation';
import { useUser } from "../../context/UserContext";
import profileLogo from "../../assets/icon/profile.svg";
import ConfirmPopup from "../../components/ConfirmPopup";
import ImageViewer from "../../components/ImageViewer";

interface TrashPost {
    id: number;
    images: string[];
    remarks: string;
    post_type: string;
    coins_selected: number;
    trash_bag_amount: number;
    status: string;
    address_snapshot?: {
        address?: string;
        lat?: string;
        lng?: string;
        label?: string;
        phone?: string;
        district?: string;
    };

    user_id: string;
    user_name?: string;
    user_phone?: string;
    user_avatar?: string;
}

function TrashDetails() {
    const { initialLocation } = useUser();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [post, setPost] = useState<TrashPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isPickingUp, setIsPickingUp] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(initialLocation);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Image viewer state
    const [viewerImages, setViewerImages] = useState<string[]>([]);
    const [viewerIndex, setViewerIndex] = useState(0);

    useEffect(() => {
        fetchPostDetails();

        let watchId: number | null = null;
        const startTracking = async () => {
            const isTauri = !!(window as any).__TAURI_INTERNALS__;
            if (isTauri) {
                try {
                    watchId = await watchPosition({ enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }, (pos, err) => {
                        if (err) return;
                        if (pos) setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    });
                    return;
                } catch (error) { }
            }
            if ("geolocation" in navigator) {
                navigator.geolocation.watchPosition((pos) => {
                    setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                }, null, { enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 });
            }
        };
        startTracking();
        return () => { if (watchId !== null) clearWatch(watchId); };
    }, [id]);

    const fetchPostDetails = async () => {
        const token = getToken();
        if (!token || !id) return;
        try {
            const data = await api.getTrashPostById(token, id);
            setPost(data);
        } catch (error) {
            console.error("Failed to fetch trash post details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePickUp = async () => {
        const token = getToken();
        if (!token || !id) return;

        setIsPickingUp(true);
        try {
            await api.createContacts(token, [{ id: Number(id), type: 'trash_posts' }]);
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Failed to pick up trash:", error);
            alert("Failed to pick up trash. Please try again.");
        } finally {
            setIsPickingUp(false);
        }
    };

    if (loading) return <div className={styles.loadingState}>Loading...</div>;
    if (!post) return <div className={styles.emptyState}>Trash post not found</div>;

    return (
        <div className={styles.pageContainer}>
            {showMap && post.address_snapshot?.lat && post.address_snapshot?.lng && (
                <div className={styles.mapModal}>
                    <PageHeader title="Pickup Location" onBack={() => setShowMap(false)} />
                    <div className={styles.mapContent}>
                        <MapSelector
                            onLocationSelect={() => { }}
                            initialLat={parseFloat(post.address_snapshot.lat)}
                            initialLng={parseFloat(post.address_snapshot.lng)}
                            driverLat={driverLocation?.lat}
                            driverLng={driverLocation?.lng}
                            isReadOnly={true}
                        />
                    </div>
                </div>
            )}

            <PageHeader title="Trash Details" backTo="/dispose-trash" />

            <div className={styles.content}>
                <div className={styles.imageSection}>
                    <div className={styles.imagePreview}>
                        {post.images && post.images.length > 0 ? (
                            <img
                                src={post.images[currentImageIndex]}
                                alt=""
                                className={styles.itemImage}
                                onClick={() => { setViewerImages(post.images); setViewerIndex(currentImageIndex); }}
                            />
                        ) : (
                            <div className={styles.imagePlaceholder}>No Images</div>
                        )}
                    </div>
                    {post.images && post.images.length > 1 && (
                        <div className={styles.thumbnailStrip}>
                            {post.images.map((img, idx) => (
                                <button
                                    key={idx}
                                    className={`${styles.thumbnail} ${idx === currentImageIndex ? styles.active : ''}`}
                                    onClick={() => setCurrentImageIndex(idx)}
                                >
                                    <img src={img} alt="" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.infoGrid}>
                    <div className={styles.infoCard}>
                        <span className={styles.infoLabel}>Coins Reward</span>
                        <span className={styles.infoValue}>🪙 {post.coins_selected}</span>
                    </div>
                    <div className={styles.infoCard}>
                        <span className={styles.infoLabel}>Bags Count</span>
                        <span className={styles.infoValue}>📦 {post.trash_bag_amount}</span>
                    </div>
                </div>

                <div className={styles.section}>
                    <span className={styles.sectionLabel}>Mode</span>
                    <div className={styles.modeBadge}>
                        {post.post_type === 'fast' ? 'Fix Time' : 'Anytime'}
                    </div>
                </div>

                <div className={styles.section}>
                    <span className={styles.sectionLabel}>Pickup Location</span>
                    <div className={styles.locationRow}>
                        <div className={styles.locationBox}>
                            {post.address_snapshot?.district && (
                                <div style={{ fontWeight: 'bold', color: '#FF9800', marginBottom: '4px' }}>
                                    📍 {post.address_snapshot.district}
                                </div>
                            )}
                            {post.address_snapshot?.address || 'No address'}
                        </div>
                        <button className={styles.mapButton} onClick={() => setShowMap(true)}>📍</button>
                    </div>

                </div>

                <div className={styles.section}>
                    <span className={styles.sectionLabel}>Remarks</span>
                    <div className={styles.remarksBox}>{post.remarks || '-'}</div>
                </div>

                <div className={styles.section}>
                    <span className={styles.sectionLabel}>Customer</span>
                    <div className={styles.sellerCard}>
                        <img src={post.user_avatar || profileLogo} alt="" className={styles.sellerAvatar} />
                        <div className={styles.sellerInfo}>
                            <span className={styles.sellerName}>{post.user_name || 'Customer'}</span>
                            <span className={styles.sellerPhone}>{post.address_snapshot?.phone || post.user_phone}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.bottomBar}>
                <button
                    className={styles.pickupButton}
                    onClick={handlePickUp}
                    disabled={isPickingUp}
                >
                    {isPickingUp ? 'Processing...' : 'Pick Up This Trash'}
                </button>
            </div>

            <ConfirmPopup
                isOpen={showSuccessModal}
                title="Success!"
                message="You have accepted this trash pickup request. You can now chat with the customer in your jobs list."
                onConfirm={() => navigate('/jobs/contacts')}
                confirmText="Go to Jobs"
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

export default TrashDetails;
