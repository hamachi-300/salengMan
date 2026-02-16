import { useEffect } from "react";
import styles from "./Home.module.css";
import { useNavigate } from "react-router-dom";
import profileLogo from "../../assets/icon/profile.svg";
import { useUser } from "../../context/UserContext";
import BottomNav from "../../components/BottomNav";

function Home() {
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();

  // Refresh user data when page loads
  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <div className={styles.home}>
      <div className={styles.homeContent}>
        {/* Header */}
        <div className={styles.homeHeader}>
          <div className={styles.welcomeText}>
            <h1 className={styles.welcomeName}>Home</h1>
            <p className={styles.welcomeLabel}>Ready to drive today?</p>
          </div>
          <div className={styles.profileWrapper} onClick={() => navigate("/account")}>
            <div className={styles.profileAvatar}>
              <img
                src={user?.avatar_url || profileLogo}
                alt="Profile"
                className={styles.logo}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== profileLogo) {
                    target.src = profileLogo;
                  }
                }}
              />
            </div>
            <div className={styles.onlineIndicator}></div>
          </div>
        </div>

        {/* Services Section */}
        <div className={styles.servicesSection}>
          <h2 className={styles.sectionTitle}>Services</h2>
          <div className={styles.servicesGrid}>
            <div className={styles.serviceCard} onClick={() => navigate("/buy-old-item")}>
              <div className={styles.serviceIconWrapper}>
                {/* Recycle icon */}
                <svg className={styles.serviceIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                </svg>
              </div>
              <h3 className={styles.serviceTitle}>Buy Old Item</h3>
              <p className={styles.serviceSubtitle}>Buy Old Item</p>
            </div>
            <div className={styles.serviceCard} onClick={() => navigate("/dispose-trash")}>
              <div className={styles.serviceIconWrapper}>
                {/* Trash/Waste disposal icon */}
               <svg className={styles.serviceIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                </svg>
              </div>
              <h3 className={styles.serviceTitle}>Dispose Trash</h3>
              <p className={styles.serviceSubtitle}>Dispose Trash</p>
            </div>
          </div>
        </div>

        {/* Explore Section */}
        <div className={styles.exploreSection}>
          <h2 className={styles.sectionTitle}>Explore</h2>
          <div className={styles.exploreCard} onClick={() => navigate("/start-job")}>
            <div className={styles.gridPattern}></div>
            <div className={styles.exploreContent}>
              <div className={styles.exploreIconWrapper}>
                {/* Location pin icon */}
                <svg className={styles.exploreIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" />
                </svg>
              </div>
              <h3 className={styles.exploreTitle}>Start Job</h3>
              <p className={styles.exploreSubtitle}>Start Finding Jobs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default Home;
