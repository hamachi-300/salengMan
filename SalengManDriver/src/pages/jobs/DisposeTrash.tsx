import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./DisposeTrash.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import { useUser } from "../../context/UserContext";
import { watchPosition, clearWatch } from '@tauri-apps/plugin-geolocation';
import { Icon } from "@iconify/react";

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

// This component displays a list of available trash posts for Saleng riders (drivers).
// It tracks the user's location, fetches posts from the API, and allows filtering/sorting.
function DisposeTrash() {
    const { initialLocation } = useUser();
    const navigate = useNavigate();

    // --- State Management ---
    // List of trash posts fetched from the backend
    const [posts, setPosts] = useState<TrashPost[]>([]);
    // Loading indicator for API requests
    const [loading, setLoading] = useState(true);
    // Distance filter controlled by the slider (default to 10km)
    const [distanceFilter, setDistanceFilter] = useState(10);
    // User's real-time or initial location for distance calculations
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(initialLocation);
    // Active sorting metric (distance vs coins)
    const [sortBy, setSortBy] = useState<'distance' | 'coins'>('distance');
    // Active sorting order (Min to Max = 'asc', Max to Min = 'desc')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // When component mounts: Fetch posts and start location tracking
    useEffect(() => {
        fetchPosts();

        let watchId: number | null = null;

        // Start tracking user location either via Tauri API (for desktop app) or fallback to Web API
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

    // Function to fetch the available trash posts from the backend API
    const fetchPosts = async () => {
        const token = getToken();
        // Redirect to login if user is not authenticated
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

    // Function to calculate the great-circle distance between two points on the earth (using Haversine formula)
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
        // 1. Calculate distance for each post
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
        // 2. Filter posts by distance
        .filter(post => {
            // Keep posts with uncalculable distance (e.g. no location provided)
            if (post.calculatedDistance === Infinity) return true;
            // Only show posts within the selected distance filter
            return post.calculatedDistance !== undefined && post.calculatedDistance <= distanceFilter;
        })
        // 3. Sort posts based on the selected metric and order
        .sort((a, b) => {
            // If sorting by coins, compare coins first
            if (sortBy === 'coins') {
                const coinDiff = sortOrder === 'asc'
                    ? (a.coins_selected ?? 0) - (b.coins_selected ?? 0) // Min to Max (Ascending)
                    : (b.coins_selected ?? 0) - (a.coins_selected ?? 0); // Max to Min (Descending)

                if (coinDiff !== 0) return coinDiff; // If coins are different, return the difference
            }

            // Fallback to sorting by distance (or if sorting by distance is primary)
            return sortOrder === 'asc'
                ? (a.calculatedDistance ?? Infinity) - (b.calculatedDistance ?? Infinity) // Min to Max
                : (b.calculatedDistance ?? Infinity) - (a.calculatedDistance ?? Infinity); // Max to Min
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
                        Showing trash posts within {distanceFilter} km of your location
                    </p>
                </div>

                <div className={styles.sortSection}>
                    <span className={styles.sortLabel}>Sort by</span>

                    <div className={styles.sortButtonsGroup}>
                        <button
                            className={`${styles.sortButton} ${sortBy === 'distance' ? styles.sortButtonActive : ''}`}
                            onClick={() => setSortBy('distance')}
                        >
                            Distance
                        </button>
                        <button
                            className={`${styles.sortButton} ${sortBy === 'coins' ? styles.sortButtonActive : ''}`}
                            onClick={() => setSortBy('coins')}
                        >
                            Coins
                        </button>
                    </div>

                    <button
                        className={styles.sortOrderToggle}
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    >
                        {sortOrder === 'asc' ? (
                            <><Icon icon="eva:arrow-ios-upward-outline" style={{ fontSize: "20px" }} /></>
                        ) : (
                            <><Icon icon="eva:arrow-ios-downward-outline" style={{ fontSize: "20px" }} /></>
                        )}
                    </button>
                </div>

                <div className={styles.sliderSection}>
                    <div className={styles.sliderLabelRow}>
                        <span className={styles.sliderLabel}>Distance Range</span>
                        <span className={styles.sliderValue}>{distanceFilter} km</span>
                    </div>
                    <input
                        type="range"
                        min={10}
                        max={100}
                        value={distanceFilter}
                        onChange={(e) => setDistanceFilter(Number(e.target.value))}
                        className={styles.slider}
                        style={{
                            background: `linear-gradient(to right, #FF9800 10%, #FF9800 ${distanceFilter}%, #e0e0e0 ${distanceFilter}%, #e0e0e0 100%)`
                        }}
                    />
                    <div className={styles.sliderTicks}>
                        <span>10 km</span>
                        <span>100 km</span>
                    </div>
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

                                        {post.calculatedDistance !== Infinity && post.calculatedDistance !== undefined && post.calculatedDistance <= distanceFilter
                                            ? `${post.calculatedDistance.toFixed(1)} km`
                                            : ''}
                                        {/* {post.calculatedDistance !== Infinity && post.calculatedDistance !== undefined
                                            ? `${post.calculatedDistance.toFixed(1)} km`
                                            : ''} */}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={styles.emptyState}>
                        No trash posts available within {distanceFilter} km of your location
                    </div>
                )}

            </div>
        </div>
    );
}

export default DisposeTrash;
