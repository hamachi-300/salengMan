import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./ItemDetails.module.css";
import { api } from "../../../config/api";
import { getToken } from "../../../services/auth";
import PageHeader from "../../../components/PageHeader";
import MapSelector from "../../../components/MapSelector";
import { watchPosition, clearWatch } from '@tauri-apps/plugin-geolocation';
import { useUser } from "../../../context/UserContext";
import profileLogo from "../../../assets/icon/profile.svg";

interface Post {
  id: number;
  categories: string[];
  remarks: string;
  created_at: string;
  status: string;
  images?: string[];
  seller_id?: string;
  seller_name?: string;
  seller_phone?: string;
  seller_avatar?: string;
  address_snapshot?: {
    address?: string;
    lat?: string;
    lng?: string;
    label?: string;
    phone?: string;
  };
  pickup_time?: {
    date?: string;
    startTime?: string;
    endTime?: string;
  };
}

function ItemDetails() {
  const { initialLocation } = useUser();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(initialLocation);

  const [isInCart, setIsInCart] = useState(false);

  useEffect(() => {
    fetchPostDetails();
    checkCartStatus();

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
              setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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
            setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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
  }, [id]);

  const checkCartStatus = () => {
    const cart = JSON.parse(localStorage.getItem('driver_cart') || '[]');
    if (id && cart.includes(Number(id))) {
      setIsInCart(true);
    }
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (post?.images && post.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % post.images!.length);
    }
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (post?.images && post.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + post.images!.length) % post.images!.length);
    }
  };

  const fetchPostDetails = async () => {
    const token = getToken();
    if (!token) {
      navigate("/signin");
      return;
    }

    try {
      const data = await api.getAvailablePosts(token);
      const foundPost = data.find((p: Post) => p.id === Number(id));
      if (foundPost) {
        setPost(foundPost);
      }
    } catch (error) {
      console.error("Failed to fetch post details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (isInCart) {
      return;
    }

    setAddingToCart(true);
    const cart = JSON.parse(localStorage.getItem('driver_cart') || '[]');
    if (!cart.includes(Number(id))) {
      cart.push(Number(id));
      localStorage.setItem('driver_cart', JSON.stringify(cart));
      setIsInCart(true);
    }
    setTimeout(() => {
      setAddingToCart(false);
    }, 300);
  };

  const openMap = () => {
    if (post?.address_snapshot?.lat && post?.address_snapshot?.lng) {
      setShowMap(true);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loadingState}>Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className={styles.pageContainer}>
        <PageHeader title="Item Details" backTo="/buy-old-item" />
        <div className={styles.emptyState}>Item not found</div>
      </div>
    );
  }


  return (
    <div className={styles.pageContainer}>
      {/* Map Modal */}
      {showMap && post?.address_snapshot?.lat && post?.address_snapshot?.lng && (
        <div className={styles.mapModal}>
          <PageHeader
            title="Pickup Location"
            onBack={() => setShowMap(false)}
          />
          <div className={styles.mapContent}>
            <MapSelector
              onLocationSelect={() => { }} // Read-only map
              initialLat={parseFloat(post.address_snapshot.lat)}
              initialLng={parseFloat(post.address_snapshot.lng)}
              driverLat={driverLocation?.lat}
              driverLng={driverLocation?.lng}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <PageHeader title="Item Details" backTo="/buy-old-item" />

      {/* Content */}
      <div className={styles.content}>
        {/* Image Preview */}
        {/* Image Preview */}
        <div className={styles.imageSection}>
          <div className={styles.imagePreview}>
            {post.images && post.images.length > 0 ? (
              <>
                <img
                  src={post.images[currentImageIndex]}
                  alt={`Item ${currentImageIndex + 1}`}
                  className={styles.itemImage}
                />

                {post.images.length > 1 && (
                  <>
                    <button className={`${styles.navButton} ${styles.prevButton}`} onClick={prevImage}>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                      </svg>
                    </button>
                    <button className={`${styles.navButton} ${styles.nextButton}`} onClick={nextImage}>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                      </svg>
                    </button>
                    <div className={styles.imageCounter}>
                      {currentImageIndex + 1}/{post.images.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className={styles.imagePlaceholder}>
                <span className={styles.placeholderText}>IMAGE PREVIEW</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {post.images && post.images.length > 1 && (
            <div className={styles.thumbnailStrip}>
              {post.images.map((img, index) => (
                <button
                  key={index}
                  className={`${styles.thumbnail} ${index === currentImageIndex ? styles.active : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <img src={img} alt={`Thumbnail ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Category</span>
          <div className={styles.categoryList}>
            {post.categories && post.categories.map((cat, index) => (
              <span key={index} className={styles.categoryTag}>
                {cat}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.divider}></div>

        {/* Pickup Location */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Pickup Location</span>
          <div className={styles.locationRow}>
            <div className={styles.locationInput}>
              <span>{post.address_snapshot?.address || 'No address provided'}</span>
            </div>
            <button className={styles.mapButton} onClick={openMap}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Remarks */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Remarks</span>
          <div className={styles.remarksBox}>
            <span>{post.remarks || 'No remarks provided'}</span>
            <div className={styles.quoteIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Seller */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Seller</span>
          <div
            className={styles.sellerCard}
            onClick={() => {
              if (post.seller_id) {
                navigate(`/seller/${post.seller_id}`, {
                  state: { sellerValues: { phone: post.address_snapshot?.phone || post.seller_phone } }
                });
              }
            }}
            style={{ cursor: post.seller_id ? 'pointer' : 'default' }}
          >
            <div className={styles.sellerAvatar}>
              <img src={post.seller_avatar || profileLogo} alt="Seller" />
            </div>
            <div className={styles.sellerInfo}>
              <span className={styles.sellerName}>{post.seller_name || 'Unknown'}</span>
              <span className={styles.viewProfileText}>View Profile</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add to Cart Button */}
      <div className={styles.bottomBar}>
        <button
          className={styles.addToCartButton}
          onClick={handleAddToCart}
          disabled={addingToCart || isInCart}
        >
          {addingToCart ? 'Adding...' : isInCart ? 'In Cart' : 'Add to Cart'}
          <svg viewBox="0 0 24 24" fill="currentColor" className={styles.cartIcon}>
            <path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01l-1.1 2-2.76 5H8.53l-.13-.27L6.16 6l-.95-2-.94-2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ItemDetails;
