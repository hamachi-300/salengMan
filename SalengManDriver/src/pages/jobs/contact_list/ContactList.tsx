import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./ContactList.module.css";
import { api } from "../../../config/api";
import { getToken } from "../../../services/auth";
import PageHeader from "../../../components/PageHeader";
import PageFooter from "../../../components/PageFooter";

interface Contact {
    id: string;
    post_id: number;
    seller_id: string;
    seller_name?: string;
    categories: string[];
    remarks: string;
    images?: string[];
    created_at: string;
    post_status: string;
    status: string;
}

function ContactList() {
    const navigate = useNavigate();
    const location = useLocation();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        const token = getToken();
        if (!token) {
            navigate("/signin");
            return;
        }

        try {
            const data = await api.getContacts(token);
            // Filter for active contacts (not completed or cancelled)
            let activeContacts = data.filter((c: any) =>
                c.post_status.toLowerCase() !== 'completed' && c.post_status.toLowerCase() !== 'cancelled'
            );

            // Filter if "pending" is requested via navigation state
            const state = location.state as { filter?: string } | null;
            if (state?.filter === 'pending') {
                activeContacts = activeContacts.filter((c: any) =>
                    c.post_status.toLowerCase() === 'pending' &&
                    c.status.toLowerCase() !== 'wait_complete' &&
                    c.status.toLowerCase() !== 'wait complete'
                );
            }

            setContacts(activeContacts);
        } catch (error) {
            console.error("Failed to fetch contacts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (id: string) => {
        setSelectedContactId(id);
    };

    const handleExploreMap = () => {
        if (selectedContactId) {
            navigate(`/jobs/explore/${selectedContactId}`, {
                state: { filter: location.state?.filter }
            });
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday =
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();

        const isYesterday =
            date.getDate() === now.getDate() - 1 &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();

        const timeStr = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });

        if (isToday) return `Today, ${timeStr}`;
        if (isYesterday) return `Yesterday, ${timeStr}`;

        return `${date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        })}, ${timeStr}`;
    };

    return (
        <div className={styles["page-container"]}>
            <PageHeader title="Contact List" backTo="/home" />

            <div className={styles["content"]}>
                <div className={styles["header-row"]}>
                    <span className={styles["header-title"]}>CONTACTS ({contacts.length})</span>
                </div>

                {loading ? (
                    <p className={styles.loading}>Loading contacts...</p>
                ) : contacts.length === 0 ? (
                    <p className={styles["empty-state"]}>No active contacts found.</p>
                ) : (
                    <div className={styles["posts-list"]}>
                        {contacts.map((contact) => (
                            <div
                                key={contact.id}
                                className={`${styles["post-card"]} ${selectedContactId === contact.id ? styles.selected : ''}`}
                                onClick={() => handleSelect(contact.id)}
                            >
                                {/* Selection radio on the left */}
                                <div className={styles["selection-wrapper"]}>
                                    <div className={`${styles.radio} ${selectedContactId === contact.id ? styles.radioChecked : ''}`}>
                                        {selectedContactId === contact.id && <div className={styles.radioInner} />}
                                    </div>
                                </div>

                                <div className={styles["image-container"]}>
                                    {contact.images && contact.images.length > 0 ? (
                                        <img
                                            src={contact.images[0]}
                                            alt="Post"
                                            className={styles["post-image"]}
                                        />
                                    ) : (
                                        <div className={styles["no-image"]}>
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className={styles["card-content"]}>
                                    <div className={styles["card-header"]}>
                                        <h3 className={styles["post-title"]}>
                                            {contact.seller_name || 'Unknown'}
                                        </h3>
                                        <div className={styles["header-tags"]}>
                                            {contact.categories && contact.categories.filter(cat => !cat.includes('อื่น')).length > 0 && (
                                                <>
                                                    <span className={styles["category-tag"]}>
                                                        {contact.categories.filter(cat => !cat.includes('อื่น'))[0].length > 8
                                                            ? contact.categories.filter(cat => !cat.includes('อื่น'))[0].slice(0, 8) + '...'
                                                            : contact.categories.filter(cat => !cat.includes('อื่น'))[0]}
                                                    </span>
                                                    {contact.categories.filter(cat => !cat.includes('อื่น')).length > 1 && (
                                                        <span className={styles["category-count"]}>
                                                            +{contact.categories.filter(cat => !cat.includes('อื่น')).length - 1}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles["post-time"]}>
                                        {formatDate(contact.created_at)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <PageFooter
                title="Explore Map"
                onClick={handleExploreMap}
                disabled={!selectedContactId}
                showArrow={false}
                icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                        <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
                    </svg>
                }
            />
        </div>
    );
}

export default ContactList;
