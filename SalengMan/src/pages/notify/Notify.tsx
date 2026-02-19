import { useState, useEffect } from "react";
import styles from "./Notify.module.css";
import BottomNav from "../../components/BottomNav";
import PageHeader from "../../components/PageHeader";
import { api, Notification } from "../../config/api";
import { getToken } from "../../services/auth";
import { useNavigate } from "react-router-dom";

type GroupedNotifications = {
  [key: string]: Notification[];
};

function Notify() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const token = getToken();
    if (!token) {
      navigate("/signin");
      return;
    }

    try {
      const data = await api.getNotifications(token);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString("en-GB", { day: 'numeric', month: 'short' });
  };

  const groupNotifications = (notifs: Notification[]): GroupedNotifications => {
    const groups: GroupedNotifications = {};
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    notifs.forEach(n => {
      const date = new Date(n.timestamp).toDateString();
      let groupName = "Earlier";

      if (date === today) groupName = "Today";
      else if (date === yesterdayStr) groupName = "Yesterday";
      else {
        groupName = new Date(n.timestamp).toLocaleDateString("en-US", { month: 'long', day: 'numeric' }).toUpperCase();
      }

      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(n);
    });

    return groups;
  };

  const getIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('cancel')) {
      return (
        <div className={`${styles.iconWrapper} ${styles.iconCancelled}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
      );
    }
    if (lowerType.includes('confirm') || lowerType.includes('success') || lowerType.includes('complete')) {
      return (
        <div className={`${styles.iconWrapper} ${styles.iconSuccess}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      );
    }
    if (lowerType.includes('price') || lowerType.includes('info')) {
      return (
        <div className={`${styles.iconWrapper} ${styles.iconInfo}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
      );
    }
    if (lowerType.includes('bonus')) {
      return (
        <div className={`${styles.iconWrapper} ${styles.iconBonus}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line>
          </svg>
        </div>
      );
    }
    // Default
    return (
      <div className={`${styles.iconWrapper} ${styles.iconDefault}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
    );
  };

  const grouped = groupNotifications(notifications);
  const groupOrder = Object.keys(grouped).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Yesterday") return -1;
    if (b === "Yesterday") return 1;
    return 0;
  });

  return (
    <div className={styles.pageContainer}>
      <PageHeader title="Notification" backTo="/home" />

      <div className={styles.content}>
        {loading ? (
          <div className={styles.emptyState}>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <p className={styles.placeholderText}>No new notifications</p>
          </div>
        ) : (
          groupOrder.map(groupName => (
            <div key={groupName} className={styles.section}>
              <h2 className={styles.sectionHeader}>{groupName}</h2>
              <div className={styles.notificationList}>
                {grouped[groupName].map(n => (
                  <div key={n.notify_id} className={styles.notificationCard}>
                    {getIcon(n.type)}
                    <div className={styles.notificationInfo}>
                      <div className={styles.cardHeader}>
                        <span className={styles.title}>{n.notify_header}</span>
                        <span className={styles.timestamp}>{getRelativeTime(n.timestamp)}</span>
                      </div>
                      <p className={styles.description}>{n.notify_content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default Notify;
