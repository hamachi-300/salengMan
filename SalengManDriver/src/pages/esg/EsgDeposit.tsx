import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EsgDeposit.module.css';
import PageHeader from '../../components/PageHeader';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';
import AlertPopup from '../../components/AlertPopup';
import ConfirmPopup from '../../components/ConfirmPopup';

const EsgDeposit: React.FC = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        try {
            const token = getToken();
            if (!token) return;
            const data = await api.getEsgDriverProfile(token);
            setProfile(data);
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleDeposit = async () => {
        setSubmitting(true);
        try {
            const token = getToken();
            if (!token) return;
            await api.depositEsgCoins(token);
            setShowSuccess(true);
        } catch (err: any) {
            setError(err.message || 'การฝากเหรียญล้มเหลว');
        } finally {
            setSubmitting(false);
            setShowConfirm(false);
        }
    };

    if (loading) return (
        <div className={styles.container}>
            <PageHeader title="ถอนเหรียญสะสม" onBack={() => navigate('/esg/driver')} />
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
            </div>
        </div>
    );

    const coinValue = parseFloat(profile?.coin || 0);
    const canDeposit = coinValue >= 100;

    return (
        <div className={styles.container}>
            <PageHeader title="ถอนเหรียญสะสม" onBack={() => navigate('/esg/driver')} />
            <div className={styles.content}>
                <div className={styles.coinDisplay}>
                    <div className={styles.coinIcon}>฿</div>
                    <span className={styles.coinAmount}>{coinValue.toLocaleString()}</span>
                    <span className={styles.coinLabel}>Coins ทั้งหมดของคุณ</span>
                </div>

                <div className={styles.depositCard}>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>ยอดที่ถอนได้</span>
                        <span className={styles.infoValue}>{coinValue.toLocaleString()} Coins</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>ค่าธรรมเนียม</span>
                        <span className={styles.infoValue}>0 Coins</span>
                    </div>
                    <div className={styles.divider} />
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>ยอดเงินที่จะได้รับ</span>
                        <span className={styles.infoValue} style={{ color: '#22c55e', fontSize: '1.2rem' }}>
                            ฿{(coinValue).toLocaleString()}
                        </span>
                    </div>
                </div>

                <div style={{ marginTop: 'auto', width: '100%' }}>
                    <button
                        className={styles.depositButton}
                        disabled={!canDeposit || submitting}
                        onClick={() => setShowConfirm(true)}
                    >
                        {submitting ? 'กำลังดำเนินการ...' : 'ยืนยันการถอนเหรียญ'}
                    </button>
                    {!canDeposit && (
                        <p className={styles.hintText}>
                            ต้องมีอย่างน้อย 100 Coins เพื่อถอนเงิน
                        </p>
                    )}
                </div>
            </div>

            <ConfirmPopup
                isOpen={showConfirm}
                title="ยืนยันการถอนเหรียญ"
                message={`คุณต้องการถอน ${coinValue} Coins เป็นเงิน ฿${coinValue / 10} ใช่หรือไม่?`}
                onConfirm={handleDeposit}
                onCancel={() => setShowConfirm(false)}
            />

            <AlertPopup
                isOpen={showSuccess}
                title="ดำเนินการสำเร็จ"
                message="ระบบกำลังดำเนินการโอนเงินเข้าบัญชีของคุณ (Mock)"
                onClose={() => {
                    setShowSuccess(false);
                    navigate('/esg/driver');
                }}
            />

            <AlertPopup
                isOpen={!!error}
                title="เกิดข้อผิดพลาด"
                message={error || ''}
                onClose={() => setError(null)}
            />
        </div>
    );
};

export default EsgDeposit;
