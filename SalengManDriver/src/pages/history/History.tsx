import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./History.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import BottomNav from "../../components/BottomNav";
import PageHeader from "../../components/PageHeader";

interface BaseContact {
  id: string;
  post_id: number;
  seller_id: string;
  buyer_id: string;
  chat_id: string;
  post_status: string;
  created_at: string;
  images?: string[];
  remarks?: string;
  seller_name?: string;
  seller_phone?: string;
  address_snapshot?: any;
}

interface OldItemContact extends BaseContact {
  type: 'old_item_posts';
  categories?: string[];
}

interface TrashContact extends BaseContact {
  type: 'trash_posts';
  trash_bag_amount?: number;
  coins_selected?: number;
}

type Contact = OldItemContact | TrashContact;


function History() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [typeFilter, setTypeFilter] = useState<'old_item_posts' | 'trash_posts'>('old_item_posts');

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
      setContacts(data);
      console.log("Contacts:", data);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return styles["status-pending"];
      case "waiting":
        return styles["status-waiting"];
      case "completed":
        return styles["status-completed"];
      case "cancelled":
        return styles["status-cancelled"];
      default:
        return styles["status-pending"];
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

  const tabs = ["All", "Waiting", "Pending", "Completed", "Cancelled"];

  const filteredContacts = contacts.filter((contact) => {
    if (contact.type !== typeFilter) return false;
    if (activeTab === "All") return true;
    return contact.post_status?.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <div className={styles["page-container"]}>
      <PageHeader title="History" backTo="/home" />

      {/* Type Toggle */}
      <div className={styles["filters-scroll"]} style={{ borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
        <button
          className={`${styles["filter-chip"]} ${typeFilter === 'old_item_posts' ? styles.active : ''}`}
          onClick={() => { setTypeFilter('old_item_posts'); setActiveTab('All'); }}
        >
          🛒 Old Item
        </button>
        <button
          className={`${styles["filter-chip"]} ${typeFilter === 'trash_posts' ? styles.active : ''}`}
          onClick={() => { setTypeFilter('trash_posts'); setActiveTab('All'); }}
        >
          🗑️ Trash
        </button>
      </div>

      {/* Status Filters */}
      <div className={styles["filters-scroll"]}>
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`${styles["filter-chip"]} ${activeTab === tab ? styles.active : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className={styles["posts-list"]}>
        {loading ? (
          <p className={styles.loading}>Loading history...</p>
        ) : filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className={styles["post-card"]}
              onClick={() => navigate(`/contact/${contact.id}`)}
            >
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
                    {typeFilter === 'trash_posts' ? '🗑️ Trash Pickup' : '🛒 Old Item'}
                  </h3>
                  <span className={`${styles["status-badge"]} ${getStatusClass(contact.post_status ?? '')}`}>
                    {contact.post_status}
                  </span>
                </div>
                <div className={styles["post-time"]}>
                  {formatDate(contact.created_at)}
                </div>
                <div className={styles["tags-container"]}>
                  {typeFilter === 'trash_posts' ? (
                    <>
                      {contact.trash_bag_amount && (
                        <span className={styles["category-tag"]}>📦 {contact.trash_bag_amount} bags</span>
                      )}
                      {contact.coins_selected !== undefined && (
                        <span className={styles["category-tag"]}>🪙 {contact.coins_selected} coins</span>
                      )}
                    </>
                  ) : (
                    <>
                      {contact.categories
                        ?.filter(cat => !cat.includes('อื่น'))
                        .slice(0, 2)
                        .map((cat, index) => (
                          <span key={index} className={styles["category-tag"]}>
                            {cat.length > 10 ? cat.slice(0, 10) + '...' : cat}
                          </span>
                        ))}
                      {contact.categories && contact.categories.filter(cat => !cat.includes('อื่น')).length > 2 && (
                        <span className={styles["category-tag"]}>
                          +{contact.categories.filter(cat => !cat.includes('อื่น')).length - 2}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className={styles["empty-state"]}>No {typeFilter === 'trash_posts' ? 'trash' : 'old item'} contacts found.</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

export default History;
