import { useRef, useState, useEffect } from "react";
import styles from "./Account.module.css";
import profileLogo from "../../assets/icon/profile.svg";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../services/auth";
import { api } from "../../config/api";
import { useUser } from "../../context/UserContext";
import BottomNav from "../../components/BottomNav";
import AlertPopup from "../../components/AlertPopup";

function Account() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, loading, refreshUser, updateUserLocal } = useUser();
  const [uploading, setUploading] = useState(false);
  const [defaultAddress, setDefaultAddress] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Refresh user data and fetch default address every time page loads
  useEffect(() => {
    refreshUser();
    fetchDefaultAddress();
  }, []);

  const fetchDefaultAddress = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const addresses = await api.getAddresses(token);
      const defaultAddr = addresses.find(addr => addr.is_default);
      if (defaultAddr) {
        setDefaultAddress(defaultAddr.address);
      } else {
        setDefaultAddress(null);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const token = getToken();

    if (!file || !token) return;

    setUploading(true);
    try {
      const { url } = await api.uploadFile(token, file);
      // Update user locally (no need to refetch from API)
      updateUserLocal({ avatar_url: url });
      setAlertMessage("Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      setAlertMessage(`Failed to upload image: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  const onEditClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Map gender to Thai text
  const getGenderText = (gender: string | undefined) => {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 'เพศชาย';
      case 'female':
        return 'เพศหญิง';
      case 'other':
        return 'อื่นๆ';
      default:
        return 'ไม่ระบุ';
    }
  };

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    navigate("/signin");
    return null;
  }

  return (
    <div className={styles.home}>
      <div className={styles.homeContent}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Account</h1>
          <div className={styles.settingsIcon} onClick={() => navigate("/settings")}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
            </svg>
          </div>
        </div>

        {/* Profile Section */}
        <div className={styles.profileSection}>
          <div className={styles.avatarWrapper}>
            <div className={styles.profileAvatar}>
              <img
                src={user.avatar_url || profileLogo}
                alt="Profile"
                className={styles.profileImage}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== profileLogo) {
                    target.src = profileLogo;
                  }
                }}
              />
            </div>
            <div className={styles.editIcon} onClick={onEditClick}>
              {uploading ? (
                <span style={{ fontSize: '10px' }}>...</span>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              )}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
            </div>
          </div>
          <h2 className={styles.profileName}>{user.full_name || "Saleng Man"}</h2>
          <span className={styles.profileStatus}>Driver</span>
        </div>

        {/* Info Cards */}
        {/* Username */}
        <div className={styles.infoCard}>
          <div className={styles.cardLeft}>
            <div className={styles.cardIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>USERNAME</span>
              <span className={styles.cardValue}>{user.full_name}</span>
            </div>
          </div>
        </div>

        {/* Address - entire card is clickable */}
        <div className={`${styles.infoCard} ${styles.clickable}`} onClick={() => navigate("/add-address")}>
          <div className={styles.cardLeft}>
            <div className={styles.cardIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>ADDRESS</span>
              {defaultAddress ? (
                <span className={`${styles.cardValue} ${styles.multiline}`}>{defaultAddress}</span>
              ) : (
                <span className={styles.cardValue} style={{ color: '#888', fontStyle: 'italic' }}>No address set</span>
              )}
            </div>
          </div>
          <div className={styles.cardEdit}>
            {defaultAddress ? (
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            )}
          </div>
        </div>

        {/* Email */}
        <div className={styles.infoCard}>
          <div className={styles.cardLeft}>
            <div className={styles.cardIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>EMAIL</span>
              <span className={styles.cardValue}>{user.email}</span>
            </div>
          </div>
        </div>

        {/* Gender */}
        <div className={styles.infoCard}>
          <div className={styles.cardLeft}>
            <div className={styles.cardIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>GENDER</span>
              <span className={`${styles.cardValue} ${styles.thaiText}`}>{getGenderText(user.gender)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <BottomNav />

      <AlertPopup
        isOpen={alertMessage !== null}
        title={alertMessage?.includes('Failed') ? 'Error' : 'Notice'}
        message={alertMessage || ""}
        onClose={() => setAlertMessage(null)}
      />
    </div>
  );
}

export default Account;
