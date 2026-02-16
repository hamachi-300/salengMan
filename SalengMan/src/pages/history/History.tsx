
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./History.module.css";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import BottomNav from "../../components/BottomNav";
import PageHeader from "../../components/PageHeader";

interface Post {
  id: number;
  categories: string[];
  remarks: string;
  created_at: string;
  status: string;
  images?: string[];
  post_type?: 'old_item' | 'trash_disposal';
}

function History() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const token = getToken();
    if (!token) {
      navigate("/signin");
      return;
    }

    try {
      const data = await api.getPosts(token);
      setPosts(data);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Determine if today or yesterday
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

  const getPostTypeLabel = (postType?: string) => {
    return postType === 'trash_disposal' ? 'ทิ้งขยะ' : 'ขายของเก่า';
  };

  const tabs = ["All", "Pending", "Waiting", "Completed", "Cancelled"];

  const filteredPosts = posts.filter((post) => {
    if (activeTab === "All") return true;
    return post.status.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <div className={styles["page-container"]}>
      <PageHeader title="History" backTo="/home" />

      {/* Filters */}
      <div className={styles["filters-scroll"]}>
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`${styles["filter-chip"]} ${activeTab === tab ? styles.active : ""
              }`}
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
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              className={styles["post-card"]}
              onClick={() => navigate(`/history/${post.id}`)}
            >
              <div className={styles["image-container"]}>
                {post.images && post.images.length > 0 ? (
                  <img
                    src={post.images[0]}
                    alt="Post"
                    className={styles["post-image"]}
                  />
                ) : (
                  <div className={styles["no-image"]}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className={styles["card-content"]}>
                <div className={styles["card-header"]}>
                  <h3 className={styles["post-title"]}>
                    {getPostTypeLabel(post.post_type)}
                  </h3>
                  <span
                    className={`${styles["status-badge"]} ${getStatusClass(post.status)}`}
                  >
                    {post.status}
                  </span>
                </div>
                <div className={styles["post-time"]}>
                  {formatDate(post.created_at)}
                </div>
                <div className={styles["tags-container"]}>
                  {post.categories.slice(0, 3).map((cat, index) => (
                    <span key={index} className={styles["category-tag"]}>
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className={styles["empty-state"]}>No posts found.</p>
        )}
      </div>

      <BottomNav />
    </div >
  );
}

export default History;
