import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./PostBuyerList.module.css";
import PageHeader from "../../components/PageHeader";
import profileLogo from "../../assets/icon/profile.svg";
import { api, Contact } from "../../config/api";
import { getToken } from "../../services/auth";

function PostBuyerList() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchContacts();
    }, [id]);

    const fetchContacts = async () => {
        const token = getToken();
        if (!token) {
            navigate("/signin");
            return;
        }

        try {
            const data = await api.getContacts(token);
            // Filter contacts for this specific post
            const filtered = data.filter(c => c.post_id === Number(id));
            setContacts(filtered);
        } catch (err: any) {
            console.error("Failed to load contacts:", err);
            setError("Failed to load interested buyers");
        } finally {
            setLoading(false);
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const now = new Date();
        const past = new Date(dateString);
        const diffInMs = now.getTime() - past.getTime();
        const diffInSeconds = Math.floor(diffInMs / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMinutes < 1) return "Just now";
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays === 1) return "Yesterday";
        return `${diffInDays}d ago`;
    };

    if (error) {
        return (
            <div className={styles['page']}>
                <PageHeader title="Interested Buyers" backTo={`/history/${id}`} />
                <div className={styles['error-container']}>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles['page']}>
                <PageHeader title="Interested Buyers" backTo={`/history/${id}`} />
                <div className={styles['loading-container']}>
                    <div className={styles['spinner']}></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles['page']}>
            <PageHeader title="Interested Buyers" backTo={`/history/${id}`} />

            <div className={styles['content']}>
                <h2 className={styles['section-title']}>
                    PENDING REQUESTS ({contacts.length})
                </h2>

                <div className={styles['buyer-list']}>
                    {contacts.length > 0 ? (
                        contacts.map((contact) => (
                            <div
                                key={contact.id}
                                className={styles['buyer-card']}
                                onClick={() => navigate(`/history/buyer/${contact.id}`)}
                            >
                                <div className={styles['avatar-container']}>
                                    <img
                                        src={contact.buyer_avatar || profileLogo}
                                        alt={contact.buyer_name}
                                        className={styles['avatar']}
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            if (target.src !== profileLogo) {
                                                target.src = profileLogo;
                                            }
                                        }}
                                    />
                                    <div className={styles['online-indicator']} />
                                </div>
                                <div className={styles['buyer-info']}>
                                    <h3 className={styles['buyer-name']}>{contact.buyer_name}</h3>
                                    <span className={styles['time-ago']}>{formatTimeAgo(contact.created_at)}</span>
                                </div>
                                <svg className={styles['chevron-icon']} viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                                </svg>
                            </div>
                        ))
                    ) : (
                        <p className={styles['empty-state']}>No interested buyers yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PostBuyerList;
