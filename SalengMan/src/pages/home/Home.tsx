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
    console.log(user?.avatar_url);
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
      <BottomNav />
    </div>
  );
}

export default Home;
