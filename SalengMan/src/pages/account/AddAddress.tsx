import { useState, useEffect } from "react";
import styles from "./AddAddress.module.css";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../services/auth";
import { api } from "../../config/api";
import { useUser } from "../../context/UserContext";

interface Address {
  id: number;
  label: string;
  address: string;
  phone?: string;
  is_default: boolean;
  icon: 'home' | 'office' | 'other';
}

function AddAddress() {
  const navigate = useNavigate();
  const { } = useUser();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.getAddresses(token);
      setAddresses(data);
    } catch (error) {
      console.error("Error fetching addresses:", error);
    } finally {
      setLoading(false);
    }
  };



  const getIcon = (icon: string) => {
    switch (icon) {
      case 'home':
        return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>;
      case 'office':
        return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" /></svg>;
      default:
        return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>;
    }
  };

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate("/account")}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          <h1 className={styles.title}>Edit Address</h1>
        </div>

        {/* Section Title */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Select Location</h2>
          <p className={styles.sectionSubtitle}>จัดการที่อยู่ของคุณ</p>
        </div>

        {/* Address List */}
        <div className={styles.addressList}>
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={styles.addressCard}
              onClick={() => navigate(`/address/${addr.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.addressIcon}>
                {getIcon(addr.icon)}
              </div>
              <div className={styles.addressInfo}>
                <div className={styles.addressHeader}>
                  <span className={styles.addressLabel}>{addr.label}</span>
                  {addr.is_default && <span className={styles.defaultBadge}>DEFAULT</span>}
                </div>
                <p className={styles.addressText}>{addr.address}</p>
                {addr.phone && <p className={styles.addressPhone}>{addr.phone}</p>}
              </div>
            </div>
          ))}

          {/* Add New Address Button */}
          <div className={styles.addNewButton} onClick={() => navigate("/new-address")}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
            </svg>
            <span>Add New Address</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddAddress;
