import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./History.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import BottomNav from "../../components/BottomNav";
import PageHeader from "../../components/PageHeader";

interface Contact {
  id: string;
  post_id: number;
  seller_id: string;
  buyer_id: string;
  chat_id: string;
  post_status: string;
  created_at: string;
  categories: string[];
  remarks: string;
  images?: string[];
  seller_name?: string;
  seller_phone?: string;
  address_snapshot?: any;
}

function History() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");

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

  const getPostTypeLabel = (categories: string[]) => {
    if (categories && categories.includes('trash') || categories?.some(c => c.toLowerCase().includes('ขยะ'))) {
      return 'รับทิ้งขยะ';
    }
    return 'รับซื้อของเก่า';
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
    if (activeTab === "All") return true;
    return contact.post_status.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <div className={styles["page-container"]}>
      <PageHeader title="History" backTo="/home" />

      {/* Filters */}
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
                    {getPostTypeLabel(contact.categories)}
                  </h3>
                  <span className={`${styles["status-badge"]} ${getStatusClass(contact.post_status)}`}>
                    {contact.post_status}
                  </span>
                </div>
                <div className={styles["post-time"]}>
                  {formatDate(contact.created_at)}
                </div>
                <div className={styles["tags-container"]}>
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
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className={styles["empty-state"]}>No contacts found.</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

export default History;
