import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import styles from "./SellerProfile.module.css";
import { api } from "../../../config/api";
import { getToken } from "../../../services/auth";
import PageHeader from "../../../components/PageHeader";
import profileLogo from "../../../assets/icon/profile.svg";

interface Seller {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    avatar_url?: string;
    created_at: string;
}

function SellerProfile() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const [seller, setSeller] = useState<Seller | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchSellerProfile();
    }, [id]);

    const fetchSellerProfile = async () => {
        const token = getToken();
        if (!token) {
            navigate("/signin");
            return;
        }

        if (!id) {
            setError("No seller ID provided");
            setLoading(false);
            return;
        }

        try {
            const data = await api.getPublicProfile(token, id);

            // Override with state data if available (e.g. phone from post)
            const state = location.state as { sellerValues?: { phone?: string } };
            if (state?.sellerValues?.phone) {
                data.phone = state.sellerValues.phone;
            }

            setSeller(data as any); // Type assertion if needed based on API response
        } catch (err) {
            console.error("Failed to fetch seller profile:", err);
            setError("Failed to load seller profile");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className={styles.loadingState}>Loading...</div>;
    }

    if (error || !seller) {
        return (
            <div className={styles.pageContainer}>
                <PageHeader title="Seller Profile" onBack={() => navigate(-1)} />
                <div className={styles.errorState}>{error || "Seller not found"}</div>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <PageHeader title="Seller Profile" onBack={() => navigate(-1)} />

            <div className={styles.profileHeader}>
                <div className={styles.avatarWrapper}>
                    <img
                        src={seller.avatar_url || profileLogo}
                        alt={seller.full_name}
                        className={styles.avatar}
                    />
                    <div className={styles.verifiedBadge}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.sectionTitle}>SELLER INFORMATION</div>

                <div className={styles.infoCard}>
                    <div className={styles.cardLeft}>
                        <div className={styles.iconWrapper}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </div>
                        <div className={styles.infoContent}>
                            <span className={styles.label}>Name</span>
                            <span className={styles.value}>{seller.full_name}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.infoCard}>
                    <div className={styles.cardLeft}>
                        <div className={styles.iconWrapper}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                            </svg>
                        </div>
                        <div className={styles.infoContent}>
                            <span className={styles.label}>Phone Number</span>
                            <span className={styles.value}>{seller.phone || "-"}</span>
                        </div>
                    </div>
                    <button className={styles.copyButton}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                        </svg>
                    </button>
                </div>

                <div className={styles.infoCard}>
                    <div className={styles.cardLeft}>
                        <div className={styles.iconWrapper}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                            </svg>
                        </div>
                        <div className={styles.infoContent}>
                            <span className={styles.label}>Email</span>
                            <span className={styles.value}>{seller.email}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.infoCard}>
                    <div className={styles.cardLeft}>
                        <div className={styles.iconWrapper}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                            </svg>
                        </div>
                        <div className={styles.infoContent}>
                            <span className={styles.label}>Member Since</span>
                            <span className={styles.value}>{new Date(seller.created_at).toLocaleDateString('en-GB')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SellerProfile;
