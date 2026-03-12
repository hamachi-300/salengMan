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
    type?: string;
    waiting_status?: string;
}

function ContactList() {
    const navigate = useNavigate();
    const location = useLocation();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<'all' | 'trash_posts' | 'old_item_posts'>('all');
    const [trashFilter, setTrashFilter] = useState<'unarrive' | 'arrive'>('unarrive');

    useEffect(() => {
        const state = location.state as { filter?: string } | null;
        if (state?.filter === 'trash_posts') {
            setFilterType('trash_posts');
            setTrashFilter('unarrive');
            setSelectedContactId(null);
        }
        fetchContacts();
    }, [location]);

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
                    (c.post_status.toLowerCase() === 'pending' || c.post_status.toLowerCase() === 'waiting') &&
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

    const isArriveMode = filterType === 'trash_posts' && trashFilter === 'arrive';

    const handleExploreMap = () => {
        if (isArriveMode) {
            // In arrive mode, no selection needed — pick first arrived contact
            const arrivedContacts = contacts.filter(isMatchFilter);
            const targetId = selectedContactId || arrivedContacts[0]?.id;
            if (targetId) {
                navigate(`/trash-bin-map/${targetId}`, {
                    state: { filter: 'trash_posts' }
                });
            }
            return;
        }
        if (selectedContactId) {
            const selectedContact = contacts.find(c => c.id === selectedContactId);
            const isTrash = selectedContact?.type === 'trash_posts' || selectedContact?.type === 'anytime';
            navigate(isTrash ? `/jobs/explore-trash/${selectedContactId}` : `/jobs/explore/${selectedContactId}`, {
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

    const isMatchFilter = (c: Contact) => {
        if (filterType === 'all') return true;
        if (filterType === 'old_item_posts' && c.type === 'old_item_posts') return true;
        if (filterType === 'trash_posts' && (c.type === 'trash_posts' || c.type === 'anytime')) {
            if (trashFilter === 'unarrive' && c.waiting_status !== 'arrived') return true;
            if (trashFilter === 'arrive' && c.waiting_status === 'arrived') return true;
        }
        return false;
    };

    return (
        <div className={styles["page-container"]}>
            <PageHeader title="Contact List" backTo="/home" />

            <div className={styles["content"]}>
                <div className={styles["header-row"]}>
                    <span className={styles["header-title"]}>CONTACTS ({contacts.filter(isMatchFilter).length})</span>
                </div>

                <div className={styles["filter-tabs"]}>
                    <button
                        className={`${styles["filter-tab"]} ${filterType === 'all' ? styles.active : ''}`}
                        onClick={() => { setFilterType('all'); setSelectedContactId(null); }}
                    >
                        All
                    </button>
                    <button
                        className={`${styles["filter-tab"]} ${filterType === 'trash_posts' ? styles.active : ''}`}
                        onClick={() => { setFilterType('trash_posts'); setSelectedContactId(null); }}
                    >
                        Trash
                    </button>
                    <button
                        className={`${styles["filter-tab"]} ${filterType === 'old_item_posts' ? styles.active : ''}`}
                        onClick={() => { setFilterType('old_item_posts'); setSelectedContactId(null); }}
                    >
                        Old Item
                    </button>
                </div>

                {filterType === 'trash_posts' && (
                    <div className={styles["sub-filter-tabs"]}>
                        <button
                            className={`${styles["sub-filter-tab"]} ${trashFilter === 'unarrive' ? styles.subActive : ''}`}
                            onClick={() => { setTrashFilter('unarrive'); setSelectedContactId(null); }}
                        >
                            Unarrive
                        </button>
                        <button
                            className={`${styles["sub-filter-tab"]} ${trashFilter === 'arrive' ? styles.subActive : ''}`}
                            onClick={() => { setTrashFilter('arrive'); setSelectedContactId(null); }}
                        >
                            Arrive
                        </button>
                    </div>
                )}

                {loading ? (
                    <p className={styles.loading}>Loading contacts...</p>
                ) : contacts.filter(c => filterType === 'all' || c.type === filterType || (filterType === 'trash_posts' && c.type === 'anytime')).length === 0 ? (
                    <p className={styles["empty-state"]}>No active contacts found.</p>
                ) : (
                    <div className={styles["posts-list"]}>
                        {contacts.filter(isMatchFilter).map((contact) => (
                            <div
                                key={contact.id}
                                className={`${styles["post-card"]} ${selectedContactId === contact.id ? styles.selected : ''}`}
                                onClick={() => !isArriveMode && handleSelect(contact.id)}
                            >
                                {/* Selection radio on the left — hidden in arrive mode */}
                                {!isArriveMode && (
                                    <div className={styles["selection-wrapper"]}>
                                        <div className={`${styles.radio} ${selectedContactId === contact.id ? styles.radioChecked : ''}`}>
                                            {selectedContactId === contact.id && <div className={styles.radioInner} />}
                                        </div>
                                    </div>
                                )}

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
                                            {(contact.type === 'trash_posts' || contact.type === 'anytime') ? (
                                                <span className={`${styles["type-tag"]} ${styles["type-trash"]}`}>
                                                    Trash
                                                </span>
                                            ) : (
                                                <span className={`${styles["type-tag"]} ${styles["type-old-item"]}`}>
                                                    Old Item
                                                </span>
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
                title={filterType === 'trash_posts' && trashFilter === 'arrive' ? "Find Trash Bin" : "Explore Map"}
                onClick={handleExploreMap}
                disabled={!isArriveMode && !selectedContactId}
                showArrow={false}
                icon={
                    filterType === 'trash_posts' && trashFilter === 'arrive' ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                            <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
                        </svg>
                    )
                }
            />
        </div>
    );
}

export default ContactList;
