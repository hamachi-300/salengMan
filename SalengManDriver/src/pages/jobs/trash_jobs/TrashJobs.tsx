import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./TrashJobs.module.css";
import { api } from "../../../config/api";
import { getToken } from "../../../services/auth";
import PageHeader from "../../../components/PageHeader";
import ConfirmPopup from "../../../components/ConfirmPopup";

interface Contact {
    id: string;
    type: string;
    post_id: number;
    seller_id: string;
    seller_name?: string;
    status: string;
    created_at: string;
    images?: string[];
    remarks?: string;
    address_snapshot?: string;
    trash_type?: string;
    trash_bag_amount?: number;
}

function TrashJobs() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<"on-way" | "collected">("on-way");
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

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
            setLoading(true);
            const data = await api.getContacts(token);
            // Filter for trash jobs only
            const trashContacts = data.filter((c: any) => c.type === 'trash_posts');
            setContacts(trashContacts);
        } catch (error) {
            console.error("Failed to fetch contacts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleArrived = (contact: Contact) => {
        setSelectedContact(contact);
        setShowConfirm(true);
    };

    const confirmArrived = async () => {
        if (!selectedContact) return;
        const token = getToken();
        if (!token) return;

        try {
            await api.updateContactStatus(token, selectedContact.id, 'arrived');
            setShowConfirm(false);
            fetchContacts();
        } catch (error) {
            console.error("Failed to update status:", error);
            alert("Failed to update status. Please try again.");
        }
    };

    const handleViewMap = (contact: Contact) => {
        if (contact.address_snapshot) {
            try {
                const address = JSON.parse(contact.address_snapshot);
                if (address.lat && address.lng) {
                    window.open(`https://www.google.com/maps?q=${address.lat},${address.lng}`, '_blank');
                } else {
                    alert("Coordinates not found for this job.");
                }
            } catch (e) {
                console.error("Failed to parse address:", e);
            }
        }
    };

    const getHoursSinceAccepted = (dateString: string) => {
        const acceptedDate = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - acceptedDate.getTime();
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        return diffInHours;
    };

    const filteredContacts = contacts.filter(c => {
        if (activeTab === "on-way") {
            return c.status !== 'completed' && c.status !== 'cancelled';
        } else {
            return c.status === 'completed';
        }
    });

    return (
        <div className={styles.pageContainer}>
            <PageHeader title="Trash Jobs" backTo="/home" />

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === "on-way" ? styles.activeTab : ""}`}
                    onClick={() => setActiveTab("on-way")}
                >
                    On-way
                </button>
                <button
                    className={`${styles.tab} ${activeTab === "collected" ? styles.activeTab : ""}`}
                    onClick={() => setActiveTab("collected")}
                >
                    Collected
                </button>
            </div>

            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>Loading...</div>
                ) : filteredContacts.length === 0 ? (
                    <div className={styles.emptyState}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
                        </svg>
                        <p>No jobs found</p>
                    </div>
                ) : (
                    <div className={styles.jobsList}>
                        {filteredContacts.map((contact) => (
                            <div key={contact.id} className={styles.jobCard}>
                                <div className={styles.jobImageContainer}>
                                    {contact.images && contact.images.length > 0 ? (
                                        <img src={contact.images[0]} alt="Trash" className={styles.jobImage} />
                                    ) : (
                                        <div className={styles.placeholderImage}>No Image</div>
                                    )}
                                    {activeTab === "on-way" && (
                                        <div className={styles.timeBadge}>
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                                                <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                            </svg>
                                            <span>{getHoursSinceAccepted(contact.created_at)}h</span>
                                        </div>
                                    )}
                                </div>

                                <div className={styles.jobDetails}>
                                    <div className={styles.jobHeader}>
                                        <h3 className={styles.sellerName}>{contact.seller_name || "Customer"}</h3>
                                        <span className={`${styles.statusBadge} ${styles[contact.status]}`}>
                                            {contact.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className={styles.jobInfo}>
                                        <p className={styles.remarks}>{contact.remarks || "No remarks"}</p>
                                        <p className={styles.trashInfo}>
                                            {contact.trash_bag_amount} Bags
                                        </p>
                                    </div>

                                    {activeTab === "on-way" && (
                                        <div className={styles.actions}>
                                            <button
                                                className={styles.mapButton}
                                                onClick={() => handleViewMap(contact)}
                                            >
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                                </svg>
                                                View Map
                                            </button>
                                            <button
                                                className={styles.arrivedButton}
                                                onClick={() => handleArrived(contact)}
                                                disabled={contact.status === 'arrived'}
                                            >
                                                {contact.status === 'arrived' ? 'Arrived' : 'Arrived'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmPopup
                isOpen={showConfirm}
                title="Confirm Arrival"
                message="Are you sure you have arrived at the location?"
                onConfirm={confirmArrived}
                onCancel={() => setShowConfirm(false)}
                confirmText="Confirm"
                cancelText="Cancel"
            />
        </div>
    );
}

export default TrashJobs;
