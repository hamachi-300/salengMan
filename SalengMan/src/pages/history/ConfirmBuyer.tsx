import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./ConfirmBuyer.module.css";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";
import profileLogo from "../../assets/icon/profile.svg";
import { api, Contact } from "../../config/api";
import { getToken } from "../../services/auth";
import SuccessPopup from "../../components/SuccessPopup";

interface BuyerProfile {
    id: string;
    full_name: string;
    email: string;
    user_phone: string;
    avatar_url?: string;
    created_at: string;
    default_address?: string;
    address_phone?: string;
}

function ConfirmBuyer() {
    const { contactId } = useParams<{ contactId: string }>();
    const navigate = useNavigate();
    const [contact, setContact] = useState<Contact | null>(null);
    const [buyer, setBuyer] = useState<BuyerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        fetchData();
    }, [contactId]);

    const fetchData = async () => {
        const token = getToken();
        if (!token || !contactId) {
            navigate("/signin");
            return;
        }

        try {
            const contactData = await api.getContact(token, contactId);
            setContact(contactData);

            if (contactData.buyer_id) {
                const buyerData = await api.getPublicProfile(token, contactData.buyer_id);
                setBuyer(buyerData);
            }
        } catch (err: any) {
            console.error("Failed to load data:", err);
            setError("Failed to load buyer information");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        const token = getToken();
        if (!token || !contactId) return;

        setConfirming(true);
        try {
            await api.updateContactStatus(token, contactId, 'confirmed');
            setShowSuccess(true);
        } catch (err: any) {
            console.error("Failed to confirm buyer:", err);
            alert("Failed to confirm buyer. Please try again.");
        } finally {
            setConfirming(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    if (error) {
        return (
            <div className={styles['page']}>
                <PageHeader title="Confirm Buyer" backTo="/history" />
                <div className={styles['error-container']}>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (loading || !contact || !buyer) {
        return (
            <div className={styles['page']}>
                <PageHeader title="Confirm Buyer" backTo="/history" />
                <div className={styles['loading-container']}>
                    <div className={styles['spinner']}></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    const renderChatIcon = () => (
        <div className={styles['chat-room-icon']} onClick={() => navigate(`/chat/${contact.chat_id}`, { state: { postId: contact.post_id } })}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                {/* Back bubble */}
                <path d="M18 7v-1.25c0-1.52-1.23-2.75-2.75-2.75H4.75C3.23 3 2 4.23 2 5.75v11c0 1.52 1.23 2.75 2.75 2.75h.5V21l3-3h7c1.52 0 2.75-1.23 2.75-2.75v-1.25" opacity="0.4" />
                {/* Front bubble */}
                <path d="M22 10.75c0-1.52-1.23-2.75-2.75-2.75h-11c-1.52 0-2.75 1.23-2.75 2.75v11c0 1.52 1.23 2.75 2.75 2.75h.5l3-3h7c1.52 0 2.75-1.23 2.75-2.75v-11z" />
                {/* Dots */}
                <circle cx="11.5" cy="16.25" r="1" fill="white" />
                <circle cx="14.5" cy="16.25" r="1" fill="white" />
                <circle cx="17.5" cy="16.25" r="1" fill="white" />
            </svg>
            <div className={styles['unread-dot']} />
        </div>
    );

    // Prioritize phone from address if available
    const displayPhone = buyer.address_phone || buyer.user_phone;

    return (
        <div className={styles['page']}>
            <PageHeader
                title="Confirm Buyer"
                backTo={`/history/${contact.post_id}/buyers`}
                rightElement={renderChatIcon()}
            />

            <div className={styles['content']}>
                <div className={styles['avatar-section']}>
                    <img
                        src={buyer.avatar_url || profileLogo}
                        alt={buyer.full_name}
                        className={styles['avatar']}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== profileLogo) {
                                target.src = profileLogo;
                            }
                        }}
                    />
                    <div className={styles['verified-badge']}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                    </div>
                </div>

                <div className={styles['info-container']}>
                    <h2 className={styles['section-label']}>BUYER INFORMATION</h2>

                    {/* Name */}
                    <div className={styles['info-card']}>
                        <div className={styles['icon-wrapper']}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </div>
                        <div className={styles['info-content']}>
                            <span className={styles['label']}>Name</span>
                            <span className={styles['value']}>{buyer.full_name}</span>
                        </div>
                    </div>

                    {/* Phone */}
                    <div className={styles['info-card']}>
                        <div className={styles['icon-wrapper']}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                            </svg>
                        </div>
                        <div className={styles['info-content']}>
                            <span className={styles['label']}>Phone Number</span>
                            <span className={styles['value']}>{displayPhone || '-'}</span>
                        </div>
                        {displayPhone && (
                            <button className={styles['copy-button']} onClick={() => copyToClipboard(displayPhone)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                                </svg>
                            </button>
                        )}
                    </div>


                    {/* Address (New) */}
                    {buyer.default_address && (
                        <div className={styles['info-card']}>
                            <div className={styles['icon-wrapper']}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                </svg>
                            </div>
                            <div className={styles['info-content']}>
                                <span className={styles['label']}>Address</span>
                                <span className={styles['value']}>{buyer.default_address}</span>
                            </div>
                        </div>
                    )}

                    {/* Email */}
                    <div className={styles['info-card']}>
                        <div className={styles['icon-wrapper']}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                            </svg>
                        </div>
                        <div className={styles['info-content']}>
                            <span className={styles['label']}>Email</span>
                            <span className={styles['value']}>{buyer.email}</span>
                        </div>
                    </div>

                    {/* Member Since */}
                    <div className={styles['info-card']}>
                        <div className={styles['icon-wrapper']}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
                            </svg>
                        </div>
                        <div className={styles['info-content']}>
                            <span className={styles['label']}>Member Since</span>
                            <span className={styles['value']}>{new Date(buyer.created_at).toLocaleDateString('en-GB')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles['footer-wrapper']}>
                <div className={styles['agreement-text']}>
                    <svg className={styles['info-icon']} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                    <span>By confirming, you agree to sell this item to this buyer and other requests will be closed.</span>
                </div>
            </div>

            <PageFooter
                title={confirming ? 'Confirming...' : contact.post_status === 'confirmed' ? 'Confirmed' : 'Confirm Buyer'}
                onClick={handleConfirm}
                disabled={confirming || contact.post_status === 'confirmed'}
                showArrow={false}
            />

            <SuccessPopup
                isOpen={showSuccess}
                title="Success!"
                message="คุณได้ยืนยันผู้ซื้อเรียบร้อยแล้ว รายการอื่นๆ จะถูกปิดโดยอัตโนมัติ"
                onConfirm={() => navigate(`/history/${contact?.post_id}`)}
                confirmText="ตกลง"
            />
        </div>
    );
}

export default ConfirmBuyer;
