import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../sell/ConfirmPost.module.css";
import { useTrash } from "../../context/TrashContext";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";

function ConfirmTrashPost() {
    const navigate = useNavigate();
    const { trashData, resetTrashData } = useTrash();
    const [loading, setLoading] = useState(false);
    const [userBalance, setUserBalance] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showBalanceModal, setShowBalanceModal] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchBalance();
    }, []);

    const fetchBalance = async () => {
        const token = getToken();
        if (!token) {
            navigate('/signin');
            return;
        }
        try {
            const data = await api.getMe(token);
            // Backend UserResponse has 'coin' field (looking at api.ts)
            // Wait, let's check api.ts again for getMe response structure
            // interface UserResponse { id, email, full_name, phone, role, avatar_url, gender, default_address }
            // The snippet I see for index.js shows 'coin' in SELECT
            const profile: any = data;
            setUserBalance(profile.coin || 0);
        } catch (err) {
            console.error("Error fetching balance:", err);
        }
    };

    const handleSubmit = async () => {
        const token = getToken();
        if (!token) {
            navigate('/signin');
            return;
        }

        if (userBalance !== null && userBalance < trashData.coins) {
            setShowBalanceModal(true);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Data structure to match Backend's /trash-posts expectations
            const postData = {
                mode: trashData.mode,      // 'anytime' or 'fixtime'
                images: trashData.images,  // Array of base64 strings
                bag_count: trashData.bagCount,
                coins: trashData.coins,
                remarks: trashData.remarks,
                address: trashData.address
            };

            await api.createTrashPost(token, postData);
            setSuccess(true);
            resetTrashData();

            setTimeout(() => {
                navigate('/history');
            }, 2000);
        } catch (err: any) {
            console.error("Error creating trash post:", err);
            setError(err.message || "Failed to create post. Please try again.");
        } finally {
            setLoading(false);
        }
    };


    if (success) {
        return (
            <div className={styles['loading-overlay']}>
                <div className={styles['success-modal']}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                    <h2 className={styles['success-title']}>Success!</h2>
                    <p className={styles['success-message']}>Your trash disposal request has been posted.</p>
                    <button className={styles['btn-home']} onClick={() => navigate('/history')}>View History</button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles['page']}>
            <PageHeader title="Confirm Disposal" backTo="/trash/select-address" />

            {loading && (
                <div className={styles['loading-overlay']}>
                    <div className={styles['spinner']}></div>
                    <p>Submitting your request...</p>
                </div>
            )}

            {/* Error Modal */}
            {error && (
                <div className={styles['loading-overlay']} onClick={() => setError(null)}>
                    <div className={styles['success-modal']} onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
                        <h2 className={styles['success-title']}>Error</h2>
                        <p className={styles['success-message']}>{error}</p>
                        <button className={styles['btn-home']} style={{ backgroundColor: '#ff4d4d' }} onClick={() => setError(null)}>Close</button>
                    </div>
                </div>
            )}

            {/* Insufficient Balance Modal */}
            {showBalanceModal && (
                <div className={styles['loading-overlay']}>
                    <div className={styles['success-modal']}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                        <h2 className={styles['success-title']}>Insufficient Balance</h2>
                        <p className={styles['success-message']}>
                            You need 🪙 {trashData.coins} for this post,<br />
                            but you currently have 🪙 {userBalance}.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                            <button
                                className={styles['btn-home']}
                                style={{ backgroundColor: '#ccc', color: '#333' }}
                                onClick={() => setShowBalanceModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles['btn-home']}
                                onClick={() => navigate('/coin', { state: { returnTo: '/trash/confirm' } })}
                            >
                                Top Up Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles['content']}>
                <div className={styles['section-header']}>
                    <h2 className={styles['section-title']}>Review Details</h2>
                </div>

                {/* Balance Card */}
                <div className={styles['card']} style={{ backgroundColor: '#FFF9C4', border: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold' }}>Your Balance</span>
                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#F57C00' }}>
                            🪙 {userBalance !== null ? userBalance : '...'}
                        </span>
                    </div>
                    {userBalance !== null && userBalance < trashData.coins && (
                        <p style={{ color: 'red', fontSize: '12px', marginTop: '8px' }}>
                            * Insufficient balance. Please top up to continue.
                        </p>
                    )}
                </div>

                {/* Photos Card */}
                <div className={styles['card']}>
                    <div className={styles['card-title']}>Trash Photos</div>
                    <div className={styles['image-grid']}>
                        {trashData.images.map((img, idx) => (
                            <img key={idx} src={img} alt="trash" className={styles['image-item']} />
                        ))}
                    </div>
                </div>

                {/* Details Card */}
                <div className={styles['card']}>
                    <div className={styles['card-title']}>Disposal Summary</div>
                    <div className={styles['detail-row']}>
                        <div className={styles['detail-content']}>
                            <span className={styles['detail-label']}>Mode</span>
                            <span className={styles['detail-value']} style={{ textTransform: 'capitalize' }}>{trashData.mode}</span>
                        </div>
                    </div>
                    <div className={styles['detail-row']} style={{ marginTop: '12px' }}>
                        <div className={styles['detail-content']}>
                            <span className={styles['detail-label']}>Number of Bags</span>
                            <span className={styles['detail-value']}>{trashData.bagCount} Bags</span>
                        </div>
                    </div>
                    <div className={styles['detail-row']} style={{ marginTop: '12px' }}>
                        <div className={styles['detail-content']}>
                            <span className={styles['detail-label']}>Offered Incentive</span>
                            <span className={styles['detail-value']}>🪙 {trashData.coins} Coins</span>
                        </div>
                    </div>
                </div>

                {/* Location Card */}
                <div className={styles['card']}>
                    <div className={styles['card-title']}>Pickup Location</div>
                    {trashData.address && (
                        <div className={styles['detail-row']}>
                            <div className={styles['detail-content']}>
                                <span className={styles['detail-value']}>{trashData.address.label}</span>
                                <span className={styles['detail-value-small']}>{trashData.address.address}</span>
                            </div>
                        </div>
                    )}
                </div>

                {trashData.remarks && (
                    <div className={styles['card']}>
                        <div className={styles['card-title']}>Remarks</div>
                        <p className={styles['remarks-text']}>{trashData.remarks}</p>
                    </div>
                )}
            </div>

            <PageFooter
                title={userBalance !== null && userBalance < trashData.coins ? "Top Up Now" : "Confirm & Post"}
                onClick={() => {
                    if (userBalance !== null && userBalance < trashData.coins) {
                        navigate('/coin', { state: { returnTo: '/trash/confirm' } });
                    } else {
                        handleSubmit();
                    }
                }}
                disabled={loading}
            />
        </div>
    );
}

export default ConfirmTrashPost;
