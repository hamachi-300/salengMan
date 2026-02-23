import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ConfirmCart.module.css";
import { api } from "../../../config/api";
import { getToken } from "../../../services/auth";
import PageHeader from "../../../components/PageHeader";
import PageFooter from "../../../components/PageFooter";
import SuccessPopup from "../../../components/SuccessPopup";
import ConfirmPopup from "../../../components/ConfirmPopup";
import AlertPopup from "../../../components/AlertPopup";
import { useUser } from "../../../context/UserContext";

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

function ConfirmCart() {
  const navigate = useNavigate();
  const { initialLocation } = useUser();
  const [cartItems, setCartItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [userLocation] = useState<{ lat: number; lng: number } | null>(initialLocation);

  useEffect(() => {
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    const token = getToken();
    if (!token) {
      navigate("/signin");
      return;
    }

    const cartIds: number[] = JSON.parse(localStorage.getItem('driver_cart') || '[]');

    if (cartIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const allPosts = await api.getAvailablePosts(token);
      const items = allPosts.filter((post: Post) => cartIds.includes(post.id));

      // Calculate distances
      const itemsWithDistance = items.map((post: Post) => {
        let distance = Infinity;
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
      });

      setCartItems(itemsWithDistance);
    } catch (error) {
      console.error("Failed to fetch cart items:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  const removeFromCart = (postId: number) => {
    const cartIds: number[] = JSON.parse(localStorage.getItem('driver_cart') || '[]');
    const updatedCart = cartIds.filter(id => id !== postId);
    localStorage.setItem('driver_cart', JSON.stringify(updatedCart));
    setCartItems(prev => prev.filter(item => item.id !== postId));
  };

  const handleMakeContact = async () => {
    const token = getToken();
    if (!token) {
      navigate("/signin");
      return;
    }

    try {
      const addresses = await api.getAddresses(token);
      if (!addresses || addresses.length === 0) {
        setShowAddressPrompt(true);
        return;
      }
    } catch (error) {
      console.error("Failed to check addresses:", error);
      setShowAddressPrompt(true);
      return;
    }

    setSubmitting(true);

    try {
      const postIds = cartItems.map(item => item.id);
      await api.createContacts(token, postIds);

      // Clear cart after successful contact creation
      localStorage.setItem('driver_cart', JSON.stringify([]));

      // Show success popup
      setShowSuccess(true);
    } catch (error) {
      console.error("Failed to create contacts:", error);
      setAlertMessage("Failed to create contact. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessConfirm = () => {
    setShowSuccess(false);
    navigate("/history");
  };

  const getItemTitle = (post: Post) => {
    if (post.remarks) {
      return post.remarks.split(' ').slice(0, 3).join(' ');
    }
    if (post.categories && post.categories.length > 0) {
      return post.categories[0];
    }
    return 'Item';
  };

  const getCategoryLabel = (post: Post) => {
    if (post.categories && post.categories.length > 0) {
      return post.categories[0];
    }
    return 'Other';
  };

  return (
    <div className={styles.pageContainer}>
      <PageHeader title="Select Pickups" backTo="/buy-old-item" />

      <div className={styles.content}>
        <p className={styles.subtitle}>Confirm items on your cart before take next step.</p>

        {loading ? (
          <div className={styles.loadingState}>Loading cart...</div>
        ) : cartItems.length > 0 ? (
          <div className={styles.itemsList}>
            {cartItems.map((item) => (
              <div key={item.id} className={styles.itemCard}>
                <div className={styles.imageContainer}>
                  {item.images && item.images.length > 0 ? (
                    <img src={item.images[0]} alt="" className={styles.itemImage} />
                  ) : (
                    <div className={styles.imagePlaceholder}>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4.5C11.4 4.5 10.9 4.8 10.6 5.3L8.1 9.5L6.3 8.6L8.9 4.2C9.5 3.2 10.7 2.5 12 2.5C13.3 2.5 14.5 3.2 15.1 4.2L17.7 8.6L15.9 9.5L13.4 5.3C13.1 4.8 12.6 4.5 12 4.5M5 11.5C5 10.6 5.4 9.8 6.1 9.3L4.3 8.4L2.6 11.3C2 12.3 2 13.7 2.6 14.7L4.7 18.2L3.8 20L6 21.5L7.4 19.3L5.3 15.9C5.1 15.6 5 15.2 5 14.8L5 11.5M19 11.5L19 14.8C19 15.2 18.9 15.6 18.7 15.9L16.6 19.3L18 21.5L20.2 20L19.3 18.2L21.4 14.7C22 13.7 22 12.3 21.4 11.3L19.7 8.4L17.9 9.3C18.6 9.8 19 10.6 19 11.5M14.6 17.8L15.5 19.6L12.4 21.4C11.4 22 9.9 22 8.9 21.4L6 19.6L6.9 17.8L9.8 19.6C10.5 20 11.4 20 12.1 19.6L14.6 17.8M12 10.5C11.2 10.5 10.5 11.2 10.5 12C10.5 12.8 11.2 13.5 12 13.5C12.8 13.5 13.5 12.8 13.5 12C13.5 11.2 12.8 10.5 12 10.5Z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className={styles.itemContent}>
                  <h3 className={styles.itemTitle}>{getItemTitle(item)}</h3>
                  <p className={styles.itemCategory}>{getCategoryLabel(item)}</p>
                  <div className={styles.distanceRow}>
                    <svg viewBox="0 0 24 24" fill="currentColor" className={styles.locationIcon}>
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    <span className={styles.distanceText}>
                      {item.calculatedDistance !== Infinity && item.calculatedDistance !== undefined
                        ? `${item.calculatedDistance.toFixed(1)} km`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <button
                  className={styles.deleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCart(item.id);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>Your cart is empty</p>
            <button className={styles.browseButton} onClick={() => navigate('/buy-old-item')}>
              Browse Items
            </button>
          </div>
        )}
      </div>

      {cartItems.length > 0 && (
        <PageFooter
          title={submitting ? "Creating Contact..." : "Make Contact"}
          onClick={handleMakeContact}
          disabled={cartItems.length === 0 || submitting}
        />
      )}

      <SuccessPopup
        isOpen={showSuccess}
        title="Contact Created!"
        message="Your contact request has been sent to the seller. You can view the status in your history."
        onConfirm={handleSuccessConfirm}
        confirmText="View History"
      />

      <ConfirmPopup
        isOpen={showAddressPrompt}
        title="Address Required"
        message="You must add a delivery address before you can buy items. Would you like to add one now?"
        onConfirm={() => {
          setShowAddressPrompt(false);
          navigate('/add-address');
        }}
        onCancel={() => setShowAddressPrompt(false)}
        confirmText="Add Address"
        cancelText="Cancel"
        confirmColor="#4CAF50"
      />

      <AlertPopup
        isOpen={alertMessage !== null}
        title="Error"
        message={alertMessage || ""}
        onClose={() => setAlertMessage(null)}
      />
    </div>
  );
}

export default ConfirmCart;
