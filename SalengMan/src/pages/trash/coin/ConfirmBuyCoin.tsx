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
    const returnTo = location.state?.returnTo as string | undefined;

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
            if (returnTo) {
                // navigate back to the originating page (e.g. confirm post)
                navigate(returnTo, { replace: true });
                return;
            }
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
                    <svg className={styles['success-icon']} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
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
                            if (returnTo) navigate(returnTo, { replace: true });
                            else navigate('/account');
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
                        <svg className={styles['success-icon']} style={{ color: '#ff4d4d' }} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
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
