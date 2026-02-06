import { useEffect } from "react";
import styles from "./Home.module.css";
import { useNavigate } from "react-router-dom";
import profileLogo from "../../assets/icon/profile.svg";
import { useUser } from "../../context/UserContext";

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
            <p className={styles.welcomeLabel}>Welcome back,</p>
            <h1 className={styles.welcomeName}>{user?.full_name || "Saleng Man"}</h1>
          </div>
          <div className={styles.profileAvatar} onClick={() => navigate("/account")}>
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
        </div>

        {/* Banner Card */}
        <div className={styles.bannerCard}>
          <div className={styles.bannerContent}>
            <h2 className={styles.bannerTitle}>Green World</h2>
            <p className={styles.bannerText}>
              มาเปลี่ยนขยะที่ว่าเปลื้องพื้นที่อยู่ที่บ้านมาเป็นเงินกันเถอะ
            </p>
          </div>
          <div className={styles.bannerDecoration}></div>
        </div>

        {/* Services Section */}
        <div className={styles.servicesSection}>
          <h2 className={styles.sectionTitle}>Services</h2>
          <div className={styles.servicesGrid}>
            <div className={styles.serviceCard} onClick={() => navigate("/sell")}>
              <div className={styles.serviceIconWrapper}>
                <svg className={styles.serviceIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                </svg>
              </div>
              <h3 className={styles.serviceTitle}>Sell Old Items</h3>
              <p className={styles.serviceSubtitle}>ขายของเก่า</p>
            </div>
            <div className={styles.serviceCard} onClick={() => navigate("/dispose")}>
              <div className={styles.serviceIconWrapper}>
                <svg className={styles.serviceIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                </svg>
              </div>
              <h3 className={styles.serviceTitle}>Dispose Trash</h3>
              <p className={styles.serviceSubtitle}>ทิ้งขยะ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className={styles.bottomNav}>
        <div className={`${styles.navItem} ${styles.active}`}>
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className={styles.navLabel}>Home</span>
        </div>
        <div className={styles.navItem} onClick={() => navigate("/history")}>
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 14h-2v-4H9V9h4V5h2v4h4v4h-4v4z" />
          </svg>
          <span className={styles.navLabel}>History</span>
        </div>
        <div className={styles.navItem} onClick={() => navigate("/notify")}>
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
          <span className={styles.navLabel}>Notify</span>
        </div>
        <div className={styles.navItem} onClick={() => navigate("/account")}>
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <span className={styles.navLabel}>Account</span>
        </div>
      </nav>
    </div>
  );
}

export default Home;
