import { useEffect } from "react";
import styles from "./Home.module.css";
import { useNavigate } from "react-router-dom";
import profileLogo from "../../assets/icon/profile.svg";
import { useUser } from "../../context/UserContext";
import { useSell } from "../../context/SellContext";
import { useTrash } from "../../context/TrashContext";

import BottomNav from "../../components/BottomNav";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import AlertPopup from "../../components/AlertPopup";
import { useState } from "react";

function Home() {
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();
  const { discardEdit } = useSell();
  const { discardEdit: discardTrashEdit } = useTrash();

  const [showExpiredAlert, setShowExpiredAlert] = useState(false);

  // Refresh user data when page loads and discard any edit mode
  useEffect(() => {
    refreshUser();
    discardEdit(); // Clear sell edit mode data
    discardTrashEdit(); // Clear trash edit mode data

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
            <div className={styles.serviceCard} onClick={() => navigate("/trash")}>
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

        {/* Recycle Service Section */}
        <div className={styles.servicesSection}>
          <h2 className={styles.sectionTitle}>Recycle Service</h2>
          <div className={styles.servicesGrid}>
            <div className={styles.serviceCard} onClick={async () => {
              const token = getToken();
              if (!token) {
                navigate("/esg/subscription");
                return;
              }
              try {
                const status = await api.checkEsgSubscriptionStatus(token);
                if (status.hasActiveSubscription) {
                  navigate("/esg/trash");
                } else {
                  if (status.wasExpired) {
                    setShowExpiredAlert(true);
                  } else {
                    navigate("/esg/subscription");
                  }
                }
              } catch (error) {
                console.error("Failed to check subscription status", error);
                navigate("/esg/subscription");
              }
            }}>
              <div
                className={styles.serviceIconWrapper}
                style={{ backgroundColor: "rgba(34, 197, 94, 0.15)" }}
              >
                <span style={{ fontSize: "2rem", lineHeight: 1, color: "#22c55e" }}>&#x267B;&#xFE0E;</span>
              </div>
              <h3 className={styles.serviceTitle}>ESG Waste</h3>
              <p className={styles.serviceSubtitle}>ทิ้งขยะรีไซเคิล</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />

      <AlertPopup
        isOpen={showExpiredAlert}
        title="Subscription Expired"
        message="สัญญา ESG ของคุณหมดอายุแล้ว รายการที่จ้างไว้จะถูกยกเลิกทั้งหมด"
        onClose={() => {
          setShowExpiredAlert(false);
          navigate("/esg/subscription");
        }}
      />
    </div>
  );
}

export default Home;
