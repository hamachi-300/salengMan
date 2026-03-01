import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./DisposeTrash.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import { useUser } from "../../context/UserContext";
import { watchPosition, clearWatch } from '@tauri-apps/plugin-geolocation';

interface TrashPost {
    id: number;
    images?: string[];
    remarks: string;
    post_type: 'anytime' | 'fast';
    coins_selected: number;
    trash_bag_amount: number;
    status: string;
    address_snapshot?: {
        lat?: number;
        lng?: number;
        [key: string]: any;
    };
    user_name?: string;
    user_phone?: string;
    calculatedDistance?: number;
}

function DisposeTrash() {
    const { initialLocation } = useUser();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<TrashPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(initialLocation);


    useEffect(() => {
        fetchPosts();

        let watchId: number | null = null;

        const startTracking = async () => {
            const isTauri = !!(window as any).__TAURI_INTERNALS__;

            if (isTauri) {
                try {
                    watchId = await watchPosition({ enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }, (pos, err) => {
                        if (err) {
                            console.error("Watch position error:", err);
                            return;
                        }
                        if (pos) {
                            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        }
                    });
                    return;
                } catch (error) {
                    console.warn("Tauri watchPosition failed, trying Web API fallback:", error);
                }
            }

            if ("geolocation" in navigator) {
                navigator.geolocation.watchPosition(
                    (pos) => {
                        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    },
                    (err) => {
                        console.warn("Web watchPosition timeout or brief error:", err);
                    },
                    { enableHighAccuracy: true, timeout: 60000, maximumAge: 5000 }
                );
            }
        };

        startTracking();

        return () => {
            if (watchId !== null) {
                clearWatch(watchId);
            }
        };
    }, []);

    const fetchPosts = async () => {
        const token = getToken();
        if (!token) {
            navigate("/signin");
            return;
        }

        try {
            // Use the new API method add to config/api.ts earlier
            const data = await api.getAvailableTrashPosts(token);
            setPosts(data);
        } catch (error) {
            console.error("Failed to fetch trash posts:", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    };

    // Filter and Sort posts
    const filteredPosts = posts
        .map(post => {
            let distance = Infinity;
            if (userLocation && post.address_snapshot?.lat && post.address_snapshot?.lng) {
                const postLat = parseFloat(post.address_snapshot.lat as any);
                const postLng = parseFloat(post.address_snapshot.lng as any);
                if (!isNaN(postLat) && !isNaN(postLng)) {
                    distance = calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        postLat,
                        postLng
                    );
                }
            }
            return { ...post, calculatedDistance: distance };
        })
        .filter(post => {
            // Show ALL posts ONLY if they are within 10km
            return post.calculatedDistance !== undefined && post.calculatedDistance <= 10;
        })
        .sort((a, b) => {
            return (a.calculatedDistance ?? Infinity) - (b.calculatedDistance ?? Infinity);
        });


    const handlePostClick = (postId: number) => {
        navigate(`/trash-details/${postId}`);
    };


    return (
        <div className={styles.pageContainer}>
            <PageHeader title="Dispose Trash" backTo="/home" />

            <div className={styles.titleSection}>
                <div className={styles.titleRow}>
                    <p className={styles.subtitle}>
                        Showing trash posts within 10km radius of your current location
                    </p>
                </div>
            </div>


            <div className={styles.postsList}>
                {loading ? (
                    <div className={styles.loadingState}>Searching for trash posts...</div>
                ) : filteredPosts.length > 0 ? (
                    filteredPosts.map((post) => (
                        <div
                            key={post.id}
                            className={styles.postCard}
                            onClick={() => handlePostClick(post.id)}
                        >
                            <div className={styles.imageContainer}>
                                {post.images && post.images.length > 0 ? (
                                    <img src={post.images[0]} alt="" className={styles.postImage} />
                                ) : (
                                    <div className={styles.iconWrapper}>
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div className={styles.cardContent}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.coinBadge}>
                                        <span>🪙</span> {post.coins_selected}
                                    </div>
                                    <div className={styles.bagInfo}>
                                        {post.trash_bag_amount} Bags
                                    </div>
                                </div>

                                <div className={styles.descriptionRow}>
                                    <div style={{ flex: 1 }}>
                                        <p className={styles.postDescription}>
                                            {post.remarks || 'No description provided'}
                                        </p>
                                        <div className={styles.locationRow}>
                                            {post.address_snapshot?.district && (
                                                <span className={styles.districtBadge}>
                                                    📍 {post.address_snapshot.district}
                                                </span>
                                            )}
                                            {post.calculatedDistance !== undefined && post.calculatedDistance <= 10 && (
                                                <span className={styles.nearbyBadge}>Nearby Driver</span>
                                            )}
                                        </div>

                                    </div>
                                    <span className={styles.distanceText}>
                                        {post.calculatedDistance !== Infinity && post.calculatedDistance !== undefined
                                            ? `${post.calculatedDistance.toFixed(1)} km`
                                            : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={styles.emptyState}>
                        No trash posts available within 10km of your location
                    </div>
                )}

            </div>
        </div>
    );
}

export default DisposeTrash;
