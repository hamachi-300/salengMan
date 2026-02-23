import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import styles from "./ContactDetail.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import MapSelector from "../../components/MapSelector";
import { watchPosition, clearWatch } from '@tauri-apps/plugin-geolocation';
import { useUser } from "../../context/UserContext";
import profileLogo from "../../assets/icon/profile.svg";
import ConfirmPopup from "../../components/ConfirmPopup";
import RequestCancelPopup from "../../components/RequestCancelPopup";
import AlertPopup from "../../components/AlertPopup";

interface Contact {
    id: string;
    post_id: number;
    seller_id: string;
    buyer_id: string;
    chat_id: string;
    status: string;
    post_status: string;
    created_at: string;
    categories: string[];
    remarks: string;
    images?: string[];
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
}

function ContactDetail() {
    const { initialLocation } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const [contact, setContact] = useState<Contact | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showMap, setShowMap] = useState(false);
    const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(initialLocation);
    const [cancelling, setCancelling] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showCancelRequest, setShowCancelRequest] = useState(false);
    const [cancelRequestLoading, setCancelRequestLoading] = useState(false);
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchContactDetails();

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
                            console.log("Contact Detail - Location (Tauri):", pos.coords.latitude, pos.coords.longitude);
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
                        console.log("Contact Detail - Location (Web):", pos.coords.latitude, pos.coords.longitude);
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

    const nextImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (contact?.images && contact.images.length > 0) {
            setCurrentImageIndex((prev) => (prev + 1) % contact.images!.length);
        }
    };

    const prevImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (contact?.images && contact.images.length > 0) {
            setCurrentImageIndex((prev) => (prev - 1 + contact.images!.length) % contact.images!.length);
        }
    };

    const fetchContactDetails = async () => {
        const token = getToken();
        if (!token) {
            navigate("/signin");
            return;
        }

        try {
            if (id) {
                const data = await api.getContact(token, id);
                setContact(data);
            }
        } catch (error) {
            console.error("Failed to fetch contact details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChat = () => {
        if (contact?.chat_id) {
            navigate(`/chat/${contact.chat_id}`);
        } else {
            console.warn("No chat ID available");
        }
    };

    const handleCancelClick = () => {
        if (contact?.post_status === 'pending') {
            setShowCancelRequest(true);
        } else {
            setShowConfirm(true);
        }
    };

    const handleConfirmCancel = async () => {
        if (!contact) return;

        const token = getToken();
        if (!token) return;

        setCancelling(true);
        try {
            await api.deleteContact(token, contact.id);
            navigate('/history');
            setShowConfirm(false);
        } catch (error) {
            console.error("Failed to cancel contact:", error);
            setAlertMessage("Failed to cancel contact. Please try again.");
            setCancelling(false);
            setShowConfirm(false);
        }
    };

    const handleRequestCancel = async (reason: string) => {
        if (!contact) return;
        const token = getToken();
        if (!token) return;

        setCancelRequestLoading(true);
        try {
            await api.cancelContact(token, contact.id, reason);
            setAlertMessage("Contact cancelled and seller notified");
            navigate('/history');
        } catch (error: any) {
            console.error("Failed to cancel contact:", error);
            setAlertMessage(error.message || "Failed to cancel contact. Please try again.");
        } finally {
            setCancelRequestLoading(false);
            setShowCancelRequest(false);
        }
    };

    const handleCompleteClick = () => {
        setShowCompleteConfirm(true);
    };

    const handleConfirmComplete = async () => {
        if (!contact) return;
        const token = getToken();
        if (!token) return;

        setCompleting(true);
        try {
            await api.updateContactStatus(token, contact.id, 'wait complete');
            await fetchContactDetails();
            setShowCompleteConfirm(false);
            setAlertMessage("Status updated to wait complete. Please wait for the seller to confirm.");

            // Redirect to contacts list if this was part of a job exploration flow
            if (location.state?.fromExplore) {
                navigate("/jobs/contacts", {
                    state: { filter: location.state?.filter }
                });
            }
        } catch (error: any) {
            console.error("Failed to update contact status:", error);
            setAlertMessage(error.message || "Failed to update status. Please try again.");
        } finally {
            setCompleting(false);
        }
    };

    const renderChatIcon = () => (
        <div className={styles.chatRoomIcon} onClick={handleChat}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 7v-1.25c0-1.52-1.23-2.75-2.75-2.75H4.75C3.23 3 2 4.23 2 5.75v11c0 1.52 1.23 2.75 2.75 2.75h.5V21l3-3h7c1.52 0 2.75-1.23 2.75-2.75v-1.25" opacity="0.4" />
                <path d="M22 10.75c0-1.52-1.23-2.75-2.75-2.75h-11c-1.52 0-2.75 1.23-2.75 2.75v11c0 1.52 1.23 2.75 2.75 2.75h.5l3-3h7c1.52 0 2.75-1.23 2.75-2.75v-11z" />
                <circle cx="11.5" cy="16.25" r="1" fill="white" />
                <circle cx="14.5" cy="16.25" r="1" fill="white" />
                <circle cx="17.5" cy="16.25" r="1" fill="white" />
            </svg>
            <div className={styles.unreadDot} />
        </div>
    );

    const openMap = () => {
        if (contact?.address_snapshot?.lat && contact?.address_snapshot?.lng) {
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

    if (!contact) {
        return (
            <div className={styles.pageContainer}>
                <PageHeader title="Contact Details" backTo="/history" />
                <div className={styles.emptyState}>Contact not found</div>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            {/* Map Modal */}
            {showMap && contact?.address_snapshot?.lat && contact?.address_snapshot?.lng && (
                <div className={styles.mapModal}>
                    <PageHeader
                        title="Pickup Location"
                        onBack={() => setShowMap(false)}
                    />
                    <div className={styles.mapContent}>
                        <MapSelector
                            onLocationSelect={() => { }} // Read-only map
                            initialLat={parseFloat(contact.address_snapshot.lat)}
                            initialLng={parseFloat(contact.address_snapshot.lng)}
                            driverLat={driverLocation?.lat}
                            driverLng={driverLocation?.lng}
                            isReadOnly={true}
                        />
                    </div>
                </div>
            )}

            {/* Header */}
            <PageHeader
                title="Contact Details"
                backTo={location.state?.fromExplore ? `/jobs/explore/${id}` : "/history"}
                rightElement={renderChatIcon()}
            />

            {/* Content */}
            <div className={styles.content}>
                {/* Image Preview */}
                <div className={styles.imageSection}>
                    <div className={styles.imagePreview}>
                        {contact.images && contact.images.length > 0 ? (
                            <>
                                <img
                                    src={contact.images[currentImageIndex]}
                                    alt={`Item ${currentImageIndex + 1}`}
                                    className={styles.itemImage}
                                />

                                {contact.images.length > 1 && (
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
                                            {currentImageIndex + 1}/{contact.images.length}
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
                    {contact.images && contact.images.length > 1 && (
                        <div className={styles.thumbnailStrip}>
                            {contact.images.map((img, index) => (
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
                        {contact.categories && contact.categories.map((cat, index) => (
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
                            <span>{contact.address_snapshot?.address || 'No address provided'}</span>
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
                        <span>{contact.remarks || 'No remarks provided'}</span>
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
                            if (contact.seller_id) {
                                navigate(`/seller/${contact.seller_id}`, {
                                    state: { sellerValues: { phone: contact.address_snapshot?.phone || contact.seller_phone } }
                                });
                            }
                        }}
                        style={{ cursor: contact.seller_id ? 'pointer' : 'default' }}
                    >
                        <div className={styles.sellerAvatar}>
                            <img src={contact.seller_avatar || profileLogo} alt="Seller" />
                        </div>
                        <div className={styles.sellerInfo}>
                            <span className={styles.sellerName}>{contact.seller_name || 'Unknown'}</span>
                            <span className={styles.viewProfileText}>View Profile</span>
                        </div>
                    </div>
                </div>

                {contact.status !== 'completed' && (
                    <button
                        className={styles.cancelButton}
                        onClick={handleCancelClick}
                        disabled={cancelling}
                    >
                        {cancelling ? 'Cancelling...' : 'Cancel Contact'}
                    </button>
                )}
            </div>

            <div className={styles.bottomBar}>
                {contact.post_status === 'pending' ? (
                    <button
                        className={`${styles.completeContactButton} ${contact.status === 'wait complete' ? styles.waitCompleteStatus : ''}`}
                        onClick={handleCompleteClick}
                        disabled={contact.status === 'wait complete' || contact.status === 'completed' || completing}
                    >
                        {contact.status === 'wait complete' ? 'Wait for Complete' :
                            contact.status === 'completed' ? 'Completed' :
                                completing ? 'Updating...' : 'Complete Contact'}
                        <svg viewBox="0 0 24 24" fill="currentColor" className={styles.cartIcon}>
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                    </button>
                ) : (
                    <button
                        className={styles.addToCartButton}
                        onClick={handleChat}
                    >
                        Chat
                        <svg viewBox="0 0 24 24" fill="currentColor" className={styles.cartIcon}>
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                        </svg>
                    </button>
                )}
            </div>

            <ConfirmPopup
                isOpen={showConfirm}
                title="Cancel Contact"
                message="Are you sure you want to cancel this contact? This action cannot be undone and will remove the contact from your history."
                onConfirm={handleConfirmCancel}
                onCancel={() => setShowConfirm(false)}
                confirmText="Yes, Cancel"
                cancelText="No, Keep"
                confirmColor="#ef4444"
                isLoading={cancelling}
            />

            <ConfirmPopup
                isOpen={showCompleteConfirm}
                title="Complete Contact"
                message="Are you sure you want to mark this contact as complete? This will notify the seller to confirm the transaction."
                onConfirm={handleConfirmComplete}
                onCancel={() => setShowCompleteConfirm(false)}
                confirmText="Yes, Complete"
                cancelText="Not Yet"
                confirmColor="#4CAF50"
                isLoading={completing}
            />

            <RequestCancelPopup
                isOpen={showCancelRequest}
                onConfirm={handleRequestCancel}
                onCancel={() => setShowCancelRequest(false)}
                isLoading={cancelRequestLoading}
            />

            <AlertPopup
                isOpen={alertMessage !== null}
                title={alertMessage?.includes('Failed') || alertMessage?.includes('Error') ? 'Error' : 'Notice'}
                message={alertMessage || ""}
                onClose={() => setAlertMessage(null)}
            />
        </div>
    );
}

export default ContactDetail;
