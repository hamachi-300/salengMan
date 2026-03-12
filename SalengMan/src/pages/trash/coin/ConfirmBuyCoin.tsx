import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ConfirmBuyCoin.module.css';
import PageHeader from '../../../components/PageHeader';
import PageFooter from '../../../components/PageFooter';
import { API_URL } from '../../../config/api';
import { useUser } from '../../../context/UserContext';
import ConfirmPopup from '../../../components/ConfirmPopup';

interface Package {
    id: string;
    name: string;
    coins: number;
    price: number;
    period?: string;
    currency?: string;
}

export default function ConfirmBuyCoin() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showLoginPopup, setShowLoginPopup] = useState(false);

    const pkg = location.state?.package as Package | undefined;

    useEffect(() => {
        if (!pkg) {
            navigate('/coin');
        }
    }, [pkg, navigate]);

    if (!pkg) return null;

    const handleConfirmPurchase = async () => {
        if (!user) {
            setShowLoginPopup(true);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setShowLoginPopup(true);
                return;
            }

            const response = await fetch(`${API_URL}/coins/buy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount: pkg.coins })
            });

            if (!response.ok) {
                throw new Error('Purchase failed');
            }

            // Success
            setShowSuccess(true);
        } catch (err: any) {
            console.error('Purchase error:', err);
            setError(err.message || 'Failed to purchase coins. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLoginRequired = () => {
        setShowLoginPopup(false);
        navigate('/signin');
    };

    if (showSuccess) {
        return (
            <div className={styles['loading-overlay']}>
                <div className={styles['success-modal']}>
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                      <svg viewBox="0 0 72 72" width="72" height="72">
                        <circle cx="36" cy="36" r="36" fill="#4CAF50" />
                        <path d="M20 38 L30 48 L52 24" stroke="white" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <h2 className={styles['success-title']}>Success!</h2>
                    <p className={styles['success-message']}>
                        {pkg.coins} coins have been credited to your account.
                    </p>
                    <button
                        className={styles['btn-home']}
                        onClick={() => {
                            navigate('/coin/history');
                        }}
                    >
                        View Purchase History
                    </button>
                    <button
                        className={styles['btn-secondary']}
                        onClick={() => {
                            navigate('/account');
                        }}
                    >
                        Return
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Loading Overlay */}
            {loading && (
                <div className={styles['loading-overlay']}>
                    <div className={styles.spinner}></div>
                    <p>Processing purchase...</p>
                </div>
            )}

            {/* Error Modal */}
            {error && (
                <div className={styles['loading-overlay']} onClick={() => setError(null)}>
                    <div className={styles['success-modal']} onClick={(e) => e.stopPropagation()}>
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                          <svg viewBox="0 0 72 72" width="72" height="72">
                            <circle cx="36" cy="36" r="36" fill="#D32F2F" />
                            <path d="M24 24 L48 48 M48 24 L24 48" stroke="white" strokeWidth="7" strokeLinecap="round" />
                          </svg>
                        </div>
                        <h2 className={styles['success-title']}>Error</h2>
                        <p className={styles['success-message']}>{error}</p>
                        <button className={styles['btn-home']} style={{ backgroundColor: '#ff4d4d' }} onClick={() => setError(null)}>Close</button>
                    </div>
                </div>
            )}

            <PageHeader title="Confirm Purchase" backTo="/coin" />

            <div className={styles.content}>
                <div className={styles['section-header']}>
                    <h2 className={styles['section-title']}>Review Order</h2>
                </div>

                {/* Package Details Card */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                        <span>Package Details</span>
                    </div>

                    <div className={styles['detail-row']}>
                        <div className={styles['detail-content']}>
                            <span className={styles['detail-label']}>Package Name</span>
                            <span className={styles['detail-value']}>{pkg.name}</span>
                        </div>
                    </div>

                    <div className={styles['detail-row']}>
                        <div className={styles['detail-content']}>
                            <span className={styles['detail-label']}>Coins to Receive</span>
                            <span className={styles['detail-value-highlight']}>{pkg.coins} Coins</span>
                        </div>
                    </div>

                    <div className={styles['detail-row']}>
                        <div className={styles['detail-content']}>
                            <span className={styles['detail-label']}>Price</span>
                            <span className={styles['detail-value']}>{pkg.price} {pkg.currency}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Method Card (Placeholder) */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                        <span>Payment Method</span>
                    </div>
                    <div className={styles['detail-row']}>
                        <div className={styles['detail-content']}>
                            <span className={styles['detail-label']}>Method</span>
                            <span className={styles['detail-value']}>PromptPay / Credit Card</span>
                            <span style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                                (Mock payment for demo)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <PageFooter
                title={`Pay ${pkg.price} ${pkg.currency}`}
                onClick={handleConfirmPurchase}
                disabled={loading}
            />

            <ConfirmPopup
                isOpen={showLoginPopup}
                title="Login Required"
                message="You need to log in to purchase coins. Please sign in to continue."
                onConfirm={handleLoginRequired}
                onCancel={() => setShowLoginPopup(false)}
                confirmText="Login"
                cancelText="Cancel"
                confirmColor="#4CAF50"
            />
        </div>
    );
}
