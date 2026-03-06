import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./History.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import BottomNav from "../../components/BottomNav";
import PageHeader from "../../components/PageHeader";
import { useUser } from "../../context/UserContext";

interface Contact {
  id: string;
  type: string;
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
  waiting_status?: 'wait' | 'accepted'; // trash only
}

function History() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [typeFilter, setTypeFilter] = useState<'old_item_posts' | 'trash_posts'>('old_item_posts');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const { initialLocation } = useUser();

  useEffect(() => {
    fetchContacts();
  }, []);

  // Tick every minute to update elapsed times
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-expire accepted trash jobs that have exceeded 5 hours
  useEffect(() => {
    const expired = contacts.filter(c =>
      c.type === 'trash_posts' &&
      c.post_status?.toLowerCase() !== 'cancelled' &&
      c.waiting_status === 'accepted' &&
      getElapsedHours(c.created_at) >= 5
    );
    if (expired.length === 0) return;

    const token = getToken();
    if (!token) return;

    Promise.all(expired.map(c => api.expireContact(token, c.id)))
      .then(() => fetchContacts())
      .catch(console.error);
  }, [currentTime, contacts]);

  const fetchContacts = async () => {
    const token = getToken();
    if (!token) {
      navigate("/signin");
      return;
    }

    try {
      const data = await api.getContacts(token);
      // Map 'anytime' to 'trash_posts' for frontend consistency
      const mappedData = data.map((contact: any) => ({
        ...contact,
        type: contact.type === 'anytime' ? 'trash_posts' : contact.type
      }));
      setContacts(mappedData);
      console.log("Contacts:", mappedData);
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
      case "recieved":
        return styles["status-recieved"];
      case "completed":
        return styles["status-completed"];
      case "cancelled":
        return styles["status-cancelled"];
      default:
        return styles["status-pending"];
    }
  };

  const getPostTypeLabel = (contact: Contact) => {
    return contact.type === 'trash_posts' ? '🗑️ รับทิ้งขยะ' : '🛒 รับซื้อของเก่า';
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

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  };

  const getElapsedHours = (createdAt: string) =>
    (currentTime - new Date(createdAt).getTime()) / 1000 / 3600;

  const formatElapsed = (createdAt: string) => {
    const h = Math.floor(getElapsedHours(createdAt));
    const m = Math.round((getElapsedHours(createdAt) - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const handleConfirmArrival = async (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation(); // Prevent card click navigation

    if (!initialLocation) {
      alert("Unable to get your current location. Please ensure GPS is enabled.");
      return;
    }

    const postLat = contact.address_snapshot?.lat;
    const postLng = contact.address_snapshot?.lng;

    if (!postLat || !postLng) {
      alert("Pickup location not found for this post.");
      return;
    }

    const distance = calculateDistance(
      initialLocation.lat,
      initialLocation.lng,
      postLat,
      postLng
    );

    console.log(`Driver distance to pickup: ${distance.toFixed(2)}m`);

    if (distance > 500) {
      alert(`You are too far from the pickup location (${distance.toFixed(0)}m). You must be within 500m to confirm arrival.`);
      return;
    }

    const token = getToken();
    if (!token) return;

    try {
      await api.updateContactStatus(token, contact.id, 'recieved');
      alert("Success! You have arrived at the location.");
      fetchContacts(); // Refresh list to update tab/status
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to confirm arrival. Please try again.");
    }
  };
  /* */
  const tabs = typeFilter === 'trash_posts'
    ? ["All", "Accepted", "Recieved", "Completed", "Cancelled"]
    : ["All", "Waiting", "Pending", "Completed", "Cancelled"];

  const filteredContacts = contacts.filter((contact) => {
    if (contact.type !== typeFilter) return false;

    if (activeTab === "All") {
      const s = contact.post_status?.toLowerCase();
      return s === 'pending' || s === 'waiting' || s === 'accepted' || s === 'recieved' || s === 'completed' || s === 'cancelled';
    }

    // Trash 'Accepted' = post_status:'waiting' AND waiting_status:'accepted'
    if (activeTab === "Accepted") {
      return contact.post_status?.toLowerCase() === 'waiting' && contact.waiting_status === 'accepted';
    }
    return contact.post_status?.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <div className={styles["page-container"]}>
      <PageHeader title="History" backTo="/home" />

      {/* Type Toggle */}
      <div className={styles["type-toggle-container"]}>
        <button
          className={`${styles["type-toggle-btn"]} ${typeFilter === 'old_item_posts' ? styles.active : ''}`}
          onClick={() => { setTypeFilter('old_item_posts'); setActiveTab('All'); }}
        >
          🛒 ขายของเก่า
        </button>
        <button
          className={`${styles["type-toggle-btn"]} ${typeFilter === 'trash_posts' ? styles.active : ''}`}
          onClick={() => { setTypeFilter('trash_posts'); setActiveTab('All'); }}
        >
          🗑️ ทิ้งขยะ
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
                    {getPostTypeLabel(contact)}
                  </h3>
                  <span className={`${styles["status-badge"]} ${getStatusClass(contact.post_status)}`}>
                    {contact.post_status}
                  </span>
                </div>
                <div className={styles["post-time"]}>
                  {formatDate(contact.created_at)}
                </div>
                <div className={styles["tags-container"]}>
                  {typeFilter === 'trash_posts' ? (
                    // Trash: show remarks as tag
                    contact.remarks ? (
                      <span className={styles["category-tag"]}>
                        {contact.remarks.length > 20 ? contact.remarks.slice(0, 20) + '...' : contact.remarks}
                      </span>
                    ) : (
                      <span className={styles["category-tag"]}>ไม่มีหมายเหตุ</span>
                    )
                  ) : (
                    // Old item: show categories
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

                {/* Find Trash Bin button for recieved trash jobs */}
                {typeFilter === 'trash_posts' &&
                  contact.post_status?.toLowerCase() === 'recieved' && (
                    <div className={styles["arrival-btn-container"]}>
                      <button
                        className={styles["confirm-arrival-btn"]}
                        onClick={(e) => { e.stopPropagation(); navigate(`/trash-bin-map/${contact.id}`); }}
                      >
                        🗑️ Find Trash Bin
                      </button>
                    </div>
                  )}

                {/* Distance + Confirm Arrival for Trash Posts in Accepted Tab */}
                {typeFilter === 'trash_posts' &&
                  contact.post_status?.toLowerCase() === 'waiting' &&
                  contact.waiting_status === 'accepted' && (
                    <div className={styles["arrival-btn-container"]}>
                      <div className={styles["arrival-info"]}>
                        <span className={`${styles["elapsed-label"]} ${getElapsedHours(contact.created_at) >= 4 ? styles["elapsed-warning"] : ''}`}>
                          🕐 {formatElapsed(contact.created_at)} / 5h
                        </span>
                        {initialLocation && contact.address_snapshot?.lat && contact.address_snapshot?.lng && (
                          <span className={styles["distance-label"]}>
                            📍 {(calculateDistance(
                              initialLocation.lat,
                              initialLocation.lng,
                              parseFloat(contact.address_snapshot.lat),
                              parseFloat(contact.address_snapshot.lng)
                            ) / 1000).toFixed(2)} km away
                          </span>
                        )}
                      </div>
                      <button
                        className={styles["confirm-arrival-btn"]}
                        onClick={(e) => handleConfirmArrival(e, contact)}
                      >
                        📍 Confirm Arrival
                      </button>
                    </div>
                  )}
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
