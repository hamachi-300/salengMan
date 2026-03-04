import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './EsgSubscriptorList.module.css';
import PageHeader from '../../components/PageHeader';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';
import profileLogo from '../../assets/icon/profile.svg';
import SuccessPopup from '../../components/SuccessPopup';
import ConfirmPopup from '../../components/ConfirmPopup';

const EsgSubscriptorList: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const filterDate = location.state?.filterDate;

    const [subscriptors, setSubscriptors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showWarning, setShowWarning] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingContract, setPendingContract] = useState<{ sup_id: string, date: number } | null>(null);

    useEffect(() => {
        fetchSubscriptors();
    }, [filterDate]);

    const fetchSubscriptors = async () => {
        setLoading(true);
        try {
            const token = getToken();
            if (!token) return;
            const data = await api.getAvailableEsgSubscriptions(token, filterDate);
            setSubscriptors(data);
        } catch (error) {
            console.error('Failed to fetch subscriptors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSignContract = async (sup_id: string, date: number) => {
        setPendingContract({ sup_id, date });
        setShowConfirm(true);
    };

    const executeSignContract = async () => {
        if (!pendingContract) return;
        const { sup_id, date } = pendingContract;

        try {
            const token = getToken();
            if (!token) return;
            const result = await api.signEsgContract(token, sup_id, date);

            if (result.warning) {
                setShowWarning(result.warning);
            } else {
                setShowSuccess(true);
            }
            fetchSubscriptors(); // Refresh
        } catch (error: any) {
            alert(error.message || 'Failed to sign contract');
        } finally {
            setShowConfirm(false);
            setPendingContract(null);
        }
    };

    return (
        <div className={styles.container}>
            <PageHeader
                title={filterDate ? `วันที่ ${filterDate} (ESG ผู้จอง)` : "ผู้จอง ESG ทั้งหมด"}
                onBack={() => navigate('/esg/search_sub')}
            />

            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>กำลังโหลด...</div>
                ) : subscriptors.length === 0 ? (
                    <div className={styles.empty}>ไม่พบผู้จองในวันที่เลือก</div>
                ) : (
                    <div className={styles.list}>
                        {subscriptors.map((sub) => (
                            <div key={sub.sup_id} className={styles.subCard}>
                                <div className={styles.subInfo} onClick={() => setSelectedUser(sub)}>
                                    <img src={sub.avatar_url || profileLogo} className={styles.avatar} alt="Avatar" />
                                    <div className={styles.details}>
                                        <h3 className={styles.name}>{sub.full_name}</h3>
                                        <p className={styles.address}>{sub.sub_district}, {sub.district}</p>
                                        <div className={styles.tags}>
                                            <span className={styles.tag}>{sub.package_name}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className={styles.contractButton}
                                    onClick={() => handleSignContract(sub.sup_id, filterDate || sub.pickup_days[0]?.date)}
                                >
                                    ทำสัญญา
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Profile Detail Overlay */}
            {selectedUser && (
                <div className={styles.overlay} onClick={() => setSelectedUser(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <img src={selectedUser.avatar_url || profileLogo} className={styles.largeAvatar} alt="Avatar" />
                            <h2 className={styles.modalName}>{selectedUser.full_name}</h2>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.infoRow}>
                                <span className={styles.label}>เบอร์โทร:</span>
                                <span className={styles.value}>{selectedUser.phone}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.label}>ที่อยู่:</span>
                                <span className={styles.value}>
                                    {selectedUser.house_no} {selectedUser.moo} {selectedUser.soi} {selectedUser.road} {selectedUser.sub_district} {selectedUser.district} {selectedUser.province}
                                </span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.label}>แพ็กเกจ:</span>
                                <span className={styles.value}>{selectedUser.package_name}</span>
                            </div>
                        </div>
                        <button
                            className={styles.modalContractButton}
                            onClick={() => {
                                handleSignContract(selectedUser.sup_id, filterDate || selectedUser.pickup_days[0]?.date);
                                setSelectedUser(null);
                            }}
                        >
                            ทำสัญญาเข้ารับขยะ
                        </button>
                        <button className={styles.closeButton} onClick={() => setSelectedUser(null)}>ปิด</button>
                    </div>
                </div>
            )}

            <ConfirmPopup
                isOpen={showConfirm}
                title="ยืนยันการทำสัญญา"
                message="คุณต้องการทำสัญญารับขยะกับผู้ใช้งานท่านนี้ใช่หรือไม่?"
                onConfirm={executeSignContract}
                onCancel={() => setShowConfirm(false)}
            />

            <SuccessPopup
                isOpen={showSuccess}
                title="ทำสัญญาสำเร็จ"
                message="ระบบบันทึกสัญญาเรียบร้อยแล้ว"
                onConfirm={() => setShowSuccess(false)}
            />

            {/* Warning Popup (Mock using ConfirmPopup for simplicity if needed, or separate) */}
            <ConfirmPopup
                isOpen={!!showWarning}
                title="แจ้งเตือนจำนวนงาน"
                message={`${showWarning} คุณยังต้องการรับงานต่อหรือไม่?`}
                onConfirm={() => {
                    setShowWarning(null);
                    setShowSuccess(true);
                }}
                onCancel={() => setShowWarning(null)}
                confirmText="รับงานต่อ"
                cancelText="ยกเลิก"
            />
        </div>
    );
};

export default EsgSubscriptorList;
