import { useState } from "react";
import styles from "./ConfirmPost.module.css";
import { useNavigate } from "react-router-dom";
import { useSell } from "../../context/SellContext";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";

function ConfirmPost() {
  const navigate = useNavigate();
  const { sellData, resetSellData } = useSell();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [createdPostId, setCreatedPostId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditing = sellData.editingPostId !== null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleSubmit = async () => {
    const token = getToken();
    if (!token) {
      navigate('/signin');
      return;
    }

    if (!sellData.images.length || !sellData.categories.length || !sellData.address || !sellData.pickupTime) {
      setError('Missing required data. Please complete all steps.');
      // navigate('/sell'); // Don't navigate away immediately so user can see error
      return;
    }

    setLoading(true);
    setError(null); // Clear previous errors
    try {
      // Create a promise that rejects after 20 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 20000);
      });

      const postData = {
        images: sellData.images,
        categories: sellData.categories,
        remarks: sellData.remarks,
        address: {
          id: sellData.address.id,
          label: sellData.address.label,
          address: sellData.address.address,
          phone: sellData.address.phone,
          lat: sellData.address.lat,
          lng: sellData.address.lng
        },
        pickupTime: {
          date: sellData.pickupTime.date,
          startTime: sellData.pickupTime.startTime,
          endTime: sellData.pickupTime.endTime
        }
      };

      // Race the API call against the timeout
      const response: any = await Promise.race([
        isEditing
          ? api.updatePost(token, sellData.editingPostId!, postData)
          : api.createPost(token, postData),
        timeoutPromise
      ]);

      const postId = isEditing ? sellData.editingPostId : response?.id;
      resetSellData();
      if (postId) {
        setCreatedPostId(postId);
      }
      setSuccess(true);
    } catch (error: any) {
      console.error(isEditing ? 'Error updating post:' : 'Error creating post:', error);
      setError(error.message || `Failed to ${isEditing ? 'update' : 'create'} post. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Redirect if no data and not successful (and no error to show)
  if (!sellData.images.length && !success && !error) {
    navigate('/sell');
    return null;
  }

  // Success screen
  if (success) {
    return (
      <div className={styles['loading-overlay']}>
        <div className={styles['success-modal']}>
          <svg className={styles['success-icon']} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <h2 className={styles['success-title']}>Success!</h2>
          <p className={styles['success-message']}>
            {isEditing
              ? 'Your post has been updated successfully.'
              : 'Your item has been posted successfully. We will find a driver for you soon.'}
          </p>
          <button
            className={styles['btn-home']}
            onClick={() => navigate(createdPostId ? `/history/${createdPostId}` : '/history')}
          >
            View Order Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['page']}>
      {/* Loading Overlay */}
      {loading && (
        <div className={styles['loading-overlay']}>
          <div className={styles['spinner']}></div>
          <p>{isEditing ? 'Updating your post...' : 'Submitting your post...'}</p>
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className={styles['loading-overlay']} onClick={() => setError(null)}>
          <div className={styles['success-modal']} onClick={(e) => e.stopPropagation()}>
            <svg className={styles['success-icon']} style={{ color: '#ff4d4d' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <h2 className={styles['success-title']}>Error</h2>
            <p className={styles['success-message']}>{error}</p>
            <button className={styles['btn-home']} style={{ backgroundColor: '#ff4d4d' }} onClick={() => setError(null)}>Close</button>
          </div>
        </div>
      )}

      <PageHeader title={isEditing ? "Edit Post" : "Post Item"} backTo={isEditing ? `/history/${sellData.editingPostId}` : "/sell/select-time"} />

      <div className={styles['content']}>
        <div className={styles['section-header']}>
          <h2 className={styles['section-title']}>{isEditing ? 'Edit Details' : 'Confirm Details'}</h2>
        </div>
        {/* Images Card */}
        <div className={styles['card']}>
          <div className={styles['card-title']}>
            <span>Item Photos</span>
            <span className={styles['edit-link']} onClick={() => navigate('/sell')}>Edit</span>
          </div>
          <div className={styles['image-grid']}>
            {sellData.images.map((img, idx) => (
              <img key={idx} src={img} alt={`Item ${idx}`} className={styles['image-item']} />
            ))}
          </div>
        </div>

        {/* Details Card */}
        <div className={styles['card']}>
          <div className={styles['card-title']}>
            <span>Item Details</span>
            <span className={styles['edit-link']} onClick={() => navigate('/sell')}>Edit</span>
          </div>

          <div className={styles['detail-row']}>
            <div className={styles['detail-content']}>
              <span className={styles['detail-label']}>Categories</span>
              <div className={styles['tags-wrapper']}>
                {sellData.categories.map(cat => (
                  <span key={cat} className={styles['category-chip']}>{cat}</span>
                ))}
              </div>
            </div>
          </div>

          {sellData.remarks && (
            <div className={styles['detail-row']} style={{ marginTop: '12px' }}>
              <div className={styles['detail-content']}>
                <span className={styles['detail-label']}>Remarks</span>
                <p className={styles['remarks-text']}>{sellData.remarks}</p>
              </div>
            </div>
          )}
        </div>

        {/* Pickup Information Card */}
        <div className={styles['card']}>
          <div className={styles['card-title']}>
            <span>Pickup Information</span>
          </div>

          {/* Location Row */}
          <div className={styles['detail-row']}>
            <svg className={styles['detail-icon']} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <div className={styles['detail-content']}>
              <div className={styles['detail-header']}>
                <span className={styles['detail-label']}>Pickup Location</span>
                <span className={styles['change-link']} onClick={() => navigate('/sell/select-address')}>Change</span>
              </div>
              {sellData.address && (
                <>
                  <span className={styles['detail-value']}>{sellData.address.label}</span>
                  <span className={styles['detail-value-small']}>{sellData.address.address}</span>
                  {sellData.address.phone && (
                    <span className={styles['detail-value']}>{sellData.address.phone}</span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Time Row */}
          <div className={styles['detail-row']} style={{ marginTop: '16px' }}>
            <svg className={styles['detail-icon']} viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
            <div className={styles['detail-content']}>
              <div className={styles['detail-header']}>
                <span className={styles['detail-label']}>Pickup Time</span>
                <span className={styles['change-link']} onClick={() => navigate('/sell/select-time')}>Change</span>
              </div>
              {sellData.pickupTime && (
                <>
                  <span className={styles['detail-value']}>{formatDate(sellData.pickupTime.date)}</span>
                  <span className={styles['detail-value']}>{sellData.pickupTime.startTime} - {sellData.pickupTime.endTime}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <PageFooter
        title={isEditing ? "Save Changes" : "Confirm Post"}
        onClick={handleSubmit}
        disabled={loading}
      />
    </div>
  );
}

export default ConfirmPost;
