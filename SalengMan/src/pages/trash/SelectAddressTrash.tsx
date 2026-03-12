import { useState, useEffect } from "react";
import styles from "./SelectAddressTrash.module.css";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../services/auth";
import { api, Address } from "../../config/api";
import { useTrash } from "../../context/TrashContext";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";
import AlertPopup from "../../components/AlertPopup";

function SelectAddressTrash() {
  const navigate = useNavigate();
  const { trashData, setAddress, resetTrashData } = useTrash();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(trashData.address?.id || null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = trashData.editingPostId !== null;

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
      // Auto-select default address
      const defaultAddr = data.find((addr: Address) => addr.is_default);
      if (defaultAddr) {
        setSelectedId(defaultAddr.id);
      }
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

  const handleConfirmPost = async () => {
    if (!selectedId) {
      setAlertMessage('Please select an address');
      return;
    }

    const selectedAddress = addresses.find(addr => addr.id === selectedId);
    if (!selectedAddress) return;

    // Save address to context
    setAddress(selectedAddress);

    const token = getToken();
    if (!token) {
      navigate('/signin');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const postData = {
        images: trashData.images,
        categories: trashData.categories,
        remarks: trashData.remarks,
        address: {
          id: selectedAddress.id,
          label: selectedAddress.label,
          address: selectedAddress.address,
          phone: selectedAddress.phone,
          lat: selectedAddress.lat,
          lng: selectedAddress.lng
        },
        // Fill default time since we skipped that step
        pickupTime: {
          date: new Date().toISOString().split('T')[0],
          startTime: "09:00",
          endTime: "18:00"
        },
        coins: trashData.coins,
        bags: trashData.bags
      };

      await Promise.race([
        isEditing
          ? (api as any).updateTrashPost(token, trashData.editingPostId!, postData)
          : (api as any).createTrashPost(token, postData),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000))
      ]);

      resetTrashData();
      setSuccess(true);
    } catch (err: any) {
      console.error('Error submitting trash post:', err);
      setError(err.message || 'Failed to submit trash post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles['loading-screen']}>Loading...</div>;
  }

  return (
    <div className={styles['page']}>
      <PageHeader title={isEditing ? "Edit Trash Post" : "Post Trash"} backTo="/trash" />

      <div className={styles['content']}>
        {/* Section Title */}
        <div className={styles['section-header']}>
          <h2 className={styles['section-title']}>Select Location</h2>
          <p className={styles['section-subtitle']}>Where should we pick up your trash?</p>
        </div>

        {/* Address List */}
        <div className={styles['address-list']}>
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`${styles['address-card']} ${selectedId === addr.id ? styles['selected'] : ''}`}
              onClick={() => setSelectedId(addr.id)}
            >
              <div className={styles['address-icon']}>
                {getIcon(addr.icon)}
              </div>
              <div className={styles['address-info']}>
                <div className={styles['address-header']}>
                  <span className={styles['address-label']}>{addr.label}</span>
                  {addr.is_default && <span className={styles['default-badge']}>Default</span>}
                </div>
                <p className={styles['address-text']}>{addr.address}</p>
                {addr.phone && <p className={styles['address-phone']}>{addr.phone}</p>}
              </div>
              <div className={styles['radio-container']}>
                <div className={`${styles['radio']} ${selectedId === addr.id ? styles['radio-selected'] : ''}`}>
                  {selectedId === addr.id && (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add New Address Button */}
          <div className={styles['add-new-button']} onClick={() => navigate("/new-address", { state: { from: '/trash/select-address' } })}>
            <span className={styles['plus-icon']}>+</span>
            <span>Add New Address</span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <PageFooter
        title={isEditing ? "Save Changes" : "Confirm Post"}
        onClick={handleConfirmPost}
        disabled={!selectedId || submitting}
      />

      {submitting && (
        <div className={styles['loading-overlay']}>
          <div className={styles['spinner']}></div>
          <p>{isEditing ? 'Updating...' : 'Submitting...'}</p>
        </div>
      )}

      {success && (
        <div className={styles['loading-overlay']}>
          <div className={styles['success-modal']}>
            <div className={styles['success-icon-container']}>
              <svg className={styles['success-icon']} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <h2 className={styles['success-title']}>Success!</h2>
            <p className={styles['success-message']}>
              {isEditing
                ? 'Your trash post has been updated successfully.'
                : 'Your trash has been posted successfully.'}
            </p>
            <button
              className={styles['btn-ok']}
              onClick={() => navigate('/home')}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {error && (
        <AlertPopup
          isOpen={true}
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <AlertPopup
        isOpen={alertMessage !== null}
        message={alertMessage || ""}
        onClose={() => setAlertMessage(null)}
      />
    </div>
  );
}

export default SelectAddressTrash;
