import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logOut, getToken } from "../../services/auth";
import { api } from "../../config/api";
import ConfirmPopup from "../../components/ConfirmPopup";
import AlertPopup from "../../components/AlertPopup";
import styles from "./Settings.module.css";

function Settings() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await logOut();
      navigate("/signin");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    const token = getToken();

    if (!token) {
      navigate("/signin");
      return;
    }

    try {
      await api.deleteAccount(token);
      await logOut();
      navigate("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      setAlertMessage("Failed to delete account. Please try again.");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className={styles.settings}>
      {/* Confirmation Modal */}
      <ConfirmPopup
        isOpen={showConfirm}
        title="Delete Account?"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีของคุณ? การกระทำนี้ไม่สามารถย้อนกลับได้"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowConfirm(false)}
        isLoading={loading}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <AlertPopup
        isOpen={alertMessage !== null}
        title={alertMessage?.includes('Failed') ? 'Error' : 'Notice'}
        message={alertMessage || ""}
        onClose={() => setAlertMessage(null)}
      />

      <div className={styles.settingsContent}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.backButton} onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </div>
          <h1 className={styles.title}>Settings</h1>
          <div className={styles.placeholder}></div>
        </div>

        {/* Help & Support Button */}
        <button className={styles.helpButton} onClick={() => navigate("/help-support")}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
          </svg>
          Help & Support
        </button>

        {/* Test Notification Button */}
        <button
          className={styles.testNotifyButton}
          onClick={async () => {
            const { sendNotification } = await import('@tauri-apps/plugin-notification');
            sendNotification({
              title: "SalengMan Test",
              body: "ระบบแจ้งเตือนทำงานได้ปกติ! (Notification system is working!)"
            });
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
          Test Notification
        </button>

        {/* Logout Button */}
        <button className={styles.logoutButton} onClick={handleLogout} style={{ zIndex: 10, position: 'relative' }}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
          </svg>
          Log Out
        </button>

        {/* Delete Account Button */}
        <button className={styles.deleteAccountButton} onClick={() => setShowConfirm(true)}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
          Delete Account
        </button>

      </div>
    </div>
  );
}

export default Settings;
