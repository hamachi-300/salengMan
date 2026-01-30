import { useState, useEffect, useRef } from "react";
import styles from "./Account.module.css";
import profileLogo from "../../assets/icon/profile.svg";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, signOut } from "firebase/auth";

interface UserData {
  username: string;
  email: string;
  gender: string;
  address?: string;
  photoURL?: string;
}

function Account() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          } else {
            // Fallback if doc doesn't exist, use auth profile
            setUserData({
              username: currentUser.displayName || "User",
              email: currentUser.email || "",
              gender: "Not specified",
              photoURL: currentUser.photoURL || undefined
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        navigate("/signin");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/signin");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setUploading(true);
    console.log("Starting upload...");
    try {
      const storagePath = `profile_pictures/${auth.currentUser.uid}`;
      console.log("Upload path:", storagePath);

      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file);
      console.log("Upload completed. Bytes transferred:", snapshot.metadata.size);

      const downloadURL = await getDownloadURL(storageRef);
      console.log("Download URL generated:", downloadURL);

      // Update Firestore
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        photoURL: downloadURL
      });
      console.log("Firestore updated with new photoURL");

      // Update local state
      setUserData(prev => prev ? { ...prev, photoURL: downloadURL } : null);
      alert("Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(`Failed to upload image: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  const onEditClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
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
                src={userData?.photoURL || profileLogo}
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
          <h2 className={styles.profileName}>{userData?.username || "Saleng Man"}</h2>
          <span className={styles.profileStatus}>Green Member</span>
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
              <span className={styles.cardValue}>{userData?.username}</span>
            </div>
          </div>
          {/* <div className={styles.cardEdit}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </div> */}
        </div>

        {/* Address */}
        <div className={styles.infoCard}>
          <div className={styles.cardLeft}>
            <div className={styles.cardIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>ADDRESS</span>
              {userData?.address ? (
                <span className={`${styles.cardValue} ${styles.multiline}`}>{userData.address}</span>
              ) : (
                <span className={styles.cardValue} style={{ color: '#888', fontStyle: 'italic' }}>No address set</span>
              )}
            </div>
          </div>
          <div className={styles.cardEdit} onClick={() => navigate("/add-address")}>
            {userData?.address ? (
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg> // Plus icon
            )}
          </div>
        </div>

        {/* Phone/Email */}
        <div className={styles.infoCard}>
          <div className={styles.cardLeft}>
            <div className={styles.cardIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>EMAIL</span>
              <span className={styles.cardValue}>{userData?.email}</span>
            </div>
          </div>
        </div>

        {/* Gender */}
        <div className={styles.infoCard}>
          <div className={styles.cardLeft}>
            <div className={styles.cardIcon}>
              {/* Gender Icon based on value usually, but using generic user for now */}
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>GENDER</span>
              <span className={styles.cardValue}>{userData?.gender}</span>
            </div>
          </div>
        </div>


        <button className={styles.logoutButton} onClick={handleLogout}>
          <svg style={{ width: '24px', height: '24px' }} viewBox="0 0 24 24" fill="currentColor"><path d="M9 21h9c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v1H6V4c0-1.66 1.34-3 3-3h9c1.66 0 3 1.34 3 3v16c0 1.66-1.34 3-3 3H9c-1.66 0-3-1.34-3-3v-1h2v1c0 .55.45 1 1 1zm-4-8.99L9 12l-4 .01V9l-5 4 5 4v-3l4-.01-4 .01V12.01z" /></svg>
          Log Out
        </button>

      </div>

      {/* Bottom Navigation */}
      <nav className={styles.bottomNav}>
        <div className={styles.navItem} onClick={() => navigate("/home")}>
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
        <div className={`${styles.navItem} ${styles.active}`}>
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <span className={styles.navLabel}>Account</span>
        </div>
      </nav>
    </div>
  );
}

export default Account;
