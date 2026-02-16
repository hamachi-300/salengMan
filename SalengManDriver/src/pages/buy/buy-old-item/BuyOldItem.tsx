import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./BuyOldItem.module.css";
import { api } from "../../../config/api";
import { getToken } from "../../../services/auth";
import PageHeader from "../../../components/PageHeader";
import PageFooter from "../../../components/PageFooter";
import { useUser } from "../../../context/UserContext";
import { watchPosition, clearWatch } from '@tauri-apps/plugin-geolocation';

interface Post {
  id: number;
  categories: string[];
  remarks: string;
  created_at: string;
  status: string;
  images?: string[];
  seller_name?: string;
  seller_phone?: string;
  address_snapshot?: {
    lat?: string;
    lng?: string;
    [key: string]: any;
  };
  calculatedDistance?: number;
}

function BuyOldItem() {
  const { initialLocation } = useUser();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cartCount, setCartCount] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(initialLocation);

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    fetchPosts();
    checkCart();

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
          return; // Tauri monitoring started
        } catch (error) {
          console.warn("Tauri watchPosition failed, trying Web API fallback:", error);
        }
      }

      // Fallback for Web API (Browser or Tauri failure)
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

  const checkCart = () => {
    const cart = JSON.parse(localStorage.getItem('driver_cart') || '[]');
    setCartCount(cart.length);
  };



  const fetchPosts = async () => {
    const token = getToken();
    if (!token) {
      navigate("/signin");
      return;
    }

    try {
      const data = await api.getAvailablePosts(token);
      setPosts(data);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  // Get unique categories from posts
  const categories = ["All", ...new Set(posts.flatMap(post => post.categories || []))];

  // Filter and Sort posts
  const filteredPosts = posts
    .filter(post => selectedCategory === "All" || post.categories?.includes(selectedCategory))
    .map(post => {
      let distance = Infinity;
      // Check if userLocation exists and post has valid lat/lng in address_snapshot
      if (userLocation && post.address_snapshot?.lat && post.address_snapshot?.lng) {
        const postLat = parseFloat(post.address_snapshot.lat);
        const postLng = parseFloat(post.address_snapshot.lng);
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
    .sort((a, b) => {
      // Sort by distance (ascending), pushing Infinity to the bottom
      if (a.calculatedDistance === b.calculatedDistance) return 0;
      return (a.calculatedDistance ?? Infinity) - (b.calculatedDistance ?? Infinity);
    })
    .slice(0, 20);

  // Get display tags (max 2, truncated, with +N for more)
  const getDisplayTags = (categories: string[] | undefined) => {
    if (!categories || categories.length === 0) return [];

    // Filter out "อื่นๆ" or similar
    const filtered = categories.filter(cat => !cat.includes('อื่น'));

    return filtered.slice(0, 2).map(cat =>
      cat.length > 10 ? cat.slice(0, 10) + '...' : cat
    );
  };

  const getExtraTagCount = (categories: string[] | undefined) => {
    if (!categories) return 0;
    const filtered = categories.filter(cat => !cat.includes('อื่น'));
    return filtered.length > 2 ? filtered.length - 2 : 0;
  };

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <PageHeader title="Select Items" backTo="/home" />

      {/* Title Section */}
      <div className={styles.titleSection}>
        <div className={styles.titleRow}>
          <p className={styles.subtitle}>Available for pickup nearby</p>
          {categories.length > 1 && (
            <div className={styles.categoryDropdownWrapper}>
              <button
                className={styles.categoryButton}
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              >
                <span>{selectedCategory === "All" ? "Category" : selectedCategory}</span>
                <svg viewBox="0 0 24 24" fill="currentColor" className={styles.dropdownIcon}>
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </button>
              {showCategoryDropdown && (
                <div className={styles.dropdownMenu}>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      className={`${styles.dropdownItem} ${selectedCategory === cat ? styles.active : ''}`}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Posts List */}
      <div className={styles.postsList}>
        {loading ? (
          <div className={styles.loadingState}>Loading items...</div>
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              className={styles.postCard}
              onClick={() => navigate(`/item-details/${post.id}`)}
            >
              <div className={styles.iconContainer}>
                {post.images && post.images.length > 0 ? (
                  <img src={post.images[0]} alt="" className={styles.postImage} />
                ) : (
                  <div className={styles.iconWrapper}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C11.4 4.5 10.9 4.8 10.6 5.3L8.1 9.5L6.3 8.6L8.9 4.2C9.5 3.2 10.7 2.5 12 2.5C13.3 2.5 14.5 3.2 15.1 4.2L17.7 8.6L15.9 9.5L13.4 5.3C13.1 4.8 12.6 4.5 12 4.5M5 11.5C5 10.6 5.4 9.8 6.1 9.3L4.3 8.4L2.6 11.3C2 12.3 2 13.7 2.6 14.7L4.7 18.2L3.8 20L6 21.5L7.4 19.3L5.3 15.9C5.1 15.6 5 15.2 5 14.8L5 11.5M19 11.5L19 14.8C19 15.2 18.9 15.6 18.7 15.9L16.6 19.3L18 21.5L20.2 20L19.3 18.2L21.4 14.7C22 13.7 22 12.3 21.4 11.3L19.7 8.4L17.9 9.3C18.6 9.8 19 10.6 19 11.5M14.6 17.8L15.5 19.6L12.4 21.4C11.4 22 9.9 22 8.9 21.4L6 19.6L6.9 17.8L9.8 19.6C10.5 20 11.4 20 12.1 19.6L14.6 17.8M12 10.5C11.2 10.5 10.5 11.2 10.5 12C10.5 12.8 11.2 13.5 12 13.5C12.8 13.5 13.5 12.8 13.5 12C13.5 11.2 12.8 10.5 12 10.5Z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className={styles.cardContent}>
                <div className={styles.tagsContainer}>
                  {getDisplayTags(post.categories).map((cat, index) => (
                    <span key={index} className={styles.categoryBadge}>
                      {cat}
                    </span>
                  ))}
                  {getExtraTagCount(post.categories) > 0 && (
                    <span className={styles.categoryBadge}>
                      +{getExtraTagCount(post.categories)}
                    </span>
                  )}
                </div>
                <div className={styles.descriptionRow}>
                  <p className={styles.postDescription}>
                    {post.remarks || 'No description available'}
                  </p>
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
          <div className={styles.emptyState}>No items available</div>
        )}
      </div>

      {/* View Cart Button */}
      {cartCount > 0 && (
        <PageFooter
          title={`View Cart (${cartCount})`}
          onClick={() => navigate('/confirm-cart')}
        />
      )}

    </div>
  );
}

export default BuyOldItem;
