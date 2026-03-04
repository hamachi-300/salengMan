import { useEffect, useState } from "react";
import styles from "./Home.module.css";
import { useNavigate } from "react-router-dom";
import profileLogo from "../../assets/icon/profile.svg";
import { useUser } from "../../context/UserContext";
import BottomNav from "../../components/BottomNav";
import ConfirmPopup from "../../components/ConfirmPopup";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";

function Home() {
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);

  // Refresh user data when page loads
  useEffect(() => {
    refreshUser();
  }, []);

  const handleBuyOldItemClick = async () => {
    const token = getToken();
    if (!token) {
      navigate('/signin');
      return;
    }

    try {
      const addresses = await api.getAddresses(token);
      if (!addresses || addresses.length === 0) {
        setShowAddressPrompt(true);
      } else {
        navigate("/buy-old-item");
      }
    } catch (error) {
      console.error("Failed to check addresses:", error);
      setShowAddressPrompt(true);
    }
  };

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
            <div className={styles.serviceCard} onClick={handleBuyOldItemClick}>
              <div className={styles.serviceIconWrapper}>
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
                <svg className={styles.serviceIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                </svg>
              </div>
              <h3 className={styles.serviceTitle}>Dispose Trash</h3>
              <p className={styles.serviceSubtitle}>Dispose Trash</p>
            </div>
          </div>
          <div className={styles.wideServiceCard} onClick={() => navigate("/jobs/contacts", { state: { filter: "pending" } })}>
            <div className={styles.wideServiceIconWrapper}>
              <svg className={styles.serviceIcon} viewBox="0 0 24 24" fill="currentColor" style={{ color: 'white' }}>
                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" />
              </svg>
            </div>
            <h3 className={styles.serviceTitle} style={{ fontSize: '1.5rem' }}>Start Job</h3>
            <p className={styles.serviceSubtitle} style={{ fontSize: '0.95rem' }}>Start Finding Jobs</p>
          </div>
        </div>

        {/* Recycle Services Section */}
        <div className={styles.servicesSection}>
          <h2 className={styles.sectionTitle}>Recycle Services</h2>
          <div className={styles.servicesGrid}>
            <div className={styles.serviceCard} onClick={() => { }}>
              <div className={styles.serviceIconWrapper} style={{ backgroundColor: "rgba(34, 197, 94, 0.15)" }}>
                <span style={{ fontSize: "2rem", lineHeight: 1, color: "#22c55e" }}>&#x267B;&#xFE0E;</span>
              </div>
              <h3 className={styles.serviceTitle}>ESG Driver</h3>
              <p className={styles.serviceSubtitle}>รับงานขยะรีไซเคิล</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />

      <ConfirmPopup
        isOpen={showAddressPrompt}
        title="Address Required"
        message="You must add a delivery address before you can buy items. Would you like to add one now?"
        onConfirm={() => {
          setShowAddressPrompt(false);
          navigate('/add-address');
        }}
        onCancel={() => setShowAddressPrompt(false)}
        confirmText="Add Address"
        cancelText="Cancel"
        confirmColor="#4CAF50"
      />
    </div>
  );
}

export default Home;
