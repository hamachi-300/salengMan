import { useState, useEffect } from "react";
import styles from "./Confirm.module.css";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../services/auth";
import { api } from "../../config/api";

interface SellData {
    images: string[];
    categories: string[];
    remarks: string;
    address: any;
    pickupTime: {
        start: string;
        end: string;
        display: string;
    };
    pickupDate: string;
    pickupDateDisplay: string;
}

function Confirm() {
    const navigate = useNavigate();
    const [data, setData] = useState<SellData | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Load data from localStorage
        const savedData = localStorage.getItem('sellItemData');
        if (savedData) {
            setData(JSON.parse(savedData));
        } else {
            navigate('/sell');
        }
    }, [navigate]);

    const handleSubmit = async () => {
        if (!data) return;

        setLoading(true);
        const token = getToken();

        if (!token) {
            alert("Please login first");
            navigate('/login');
            return;
        }

        try {
            await api.createPost(token, {
                images: data.images,
                categories: data.categories,
                remarks: data.remarks,
                address: data.address,
                pickupTime: {
                    date: data.pickupDate,
                    start: data.pickupTime.start,
                    end: data.pickupTime.end
                }
            });

            // Clear storage
            localStorage.removeItem('sellItemData');
            setSuccess(true);

        } catch (error: any) {
            console.error("Error creating post:", error);
            alert(error.message || "Failed to create post");
            setLoading(false);
        }
    };

    if (!data) return null;

    if (success) {
        return (
            <div className={styles['loading-overlay']}>
                <div className={styles['success-modal']}>
                    <svg className={styles['success-icon']} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    <h2 className={styles['success-title']}>Success!</h2>
                    <p className={styles['success-message']}>Your item has been posted successfully. We will find a driver for you soon.</p>
                    <button className={styles['btn-home']} onClick={() => navigate('/home')}>Return to Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles['page']}>
            {loading && (
                <div className={styles['loading-overlay']}>
                    <div className={styles['spinner']}></div>
                    <p>Submitting your post...</p>
                </div>
            )}

            {/* Header */}
            <div className={styles['header']}>
                <button className={styles['back-button']} onClick={() => navigate('/sell/select-time')}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                </button>
                <h1 className={styles['title']}>Confirm Details</h1>
            </div>

            <div className={styles['content']}>
                {/* Images */}
                <div className={styles['card']}>
                    <div className={styles['card-title']}>
                        <span>Item Photos</span>
                        <span className={styles['edit-link']} onClick={() => navigate('/sell')}>Edit</span>
                    </div>
                    <div className={styles['image-grid']}>
                        {data.images.map((img, idx) => (
                            <img key={idx} src={img} alt={`Item ${idx}`} className={styles['image-item']} />
                        ))}
                    </div>
                </div>

                {/* Details */}
                <div className={styles['card']}>
                    <div className={styles['card-title']}>
                        <span>Item Details</span>
                        <span className={styles['edit-link']} onClick={() => navigate('/sell')}>Edit</span>
                    </div>

                    <div className={styles['detail-row']}>
                        <div className={styles['detail-content']}>
                            <span className={styles['detail-label']}>Categories</span>
                            <div className={styles['tags-wrapper']}>
                                {data.categories.map(cat => (
                                    <span key={cat} className={styles['category-chip']}>{cat}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {data.remarks && (
                        <div className={styles['detail-row']} style={{ marginTop: '12px' }}>
                            <div className={styles['detail-content']}>
                                <span className={styles['detail-label']}>Remarks</span>
                                <p className={styles['remarks-text']}>{data.remarks}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Location & Time */}
                <div className={styles['card']}>
                    <div className={styles['card-title']}>
                        <span>Pickup Information</span>
                    </div>

                    <div className={styles['detail-row']}>
                        <svg className={styles['detail-icon']} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        <div className={styles['detail-content']}>
                            <span className={styles['detail-label']}>Pickup Location</span>
                            <span className={styles['edit-link']} style={{ float: 'right', fontSize: '12px' }} onClick={() => navigate('/sell/select-address')}>Change</span>
                            <span className={styles['detail-value']}>{data.address?.label}</span>
                            <span className={styles['detail-value']} style={{ fontSize: '12px' }}>{data.address?.address}</span>
                            <span className={styles['detail-value']}>{data.address?.phone}</span>
                        </div>
                    </div>

                    <div className={styles['detail-row']} style={{ marginTop: '16px' }}>
                        <svg className={styles['detail-icon']} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                        </svg>
                        <div className={styles['detail-content']}>
                            <span className={styles['detail-label']}>Pickup Time</span>
                            <span className={styles['edit-link']} style={{ float: 'right', fontSize: '12px' }} onClick={() => navigate('/sell/select-time')}>Change</span>
                            <span className={styles['detail-value']}>{data.pickupDateDisplay}</span>
                            <span className={styles['detail-value']}>{data.pickupTime?.display}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className={styles['footer']}>
                <button
                    className={styles['btn-confirm']}
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    Confirm Post
                </button>
            </div>
        </div>
    );
}

export default Confirm;
