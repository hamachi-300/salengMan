import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EsgRegister.module.css';
import PageHeader from '../../components/PageHeader';
import PageFooter from '../../components/PageFooter';
import SuccessPopup from '../../components/SuccessPopup';
import { api } from '../../config/api';
import { getToken } from '../../services/auth';

const EsgRegister: React.FC = () => {
    const navigate = useNavigate();
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleRegister = async () => {
        if (!accepted) return;
        setLoading(true);
        try {
            const token = getToken();
            if (!token) {
                navigate('/signin');
                return;
            }

            await api.registerEsgDriver(token);
            setShowSuccess(true);
        } catch (error) {
            console.error('Registration failed:', error);
            alert('Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <PageHeader title="สมัคร ESG Driver" onBack={() => navigate('/home')} />
            <div className={styles.content}>
                <div className={styles.agreementCard}>
                    <h2 className={styles.agreementTitle}>ข้อตกลงการเข้าร่วมโครงการ Recycle Trash (ESG Driver)</h2>
                    <div className={styles.agreementText}>
                        <p>1. ข้าพเจ้ายินยอมที่จะเข้ารับขยะรีไซเคิลตามวันและเวลาที่ได้ทำสัญญากับบริษัท/ผู้ใช้งานไว้เป็นระยะเวลา 1 ปี</p>
                        <p>2. ข้าพเจ้าตกลงจะคัดแยกและนำขยะไปจัดการ ณ จุดทิ้งที่ได้รับรองมาตรฐาน (Verified Drop-off Points) เท่านั้น</p>
                        <p>3. ข้าพเจ้ายินยอมให้ระบบบันทึกพิกัด GPS และรูปถ่ายหลักฐานการจัดการขยะเพื่อความโปร่งใสในรายงาน ESG</p>
                        <p>4. กรณีไม่สามารถเข้างานได้ ข้าพเจ้าจะแจ้งล่วงหน้าผ่านระบบไม่น้อยกว่า 24 ชั่วโมง</p>
                    </div>
                    <div className={styles.acceptRow}>
                        <input
                            type="checkbox"
                            id="accept"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                            className={styles.checkbox}
                        />
                        <label htmlFor="accept">ยอมรับข้อตกลงและเงื่อนไข</label>
                    </div>
                </div>
            </div>
            <PageFooter
                title={loading ? "กำลังบันทึก..." : "ยืนยันการสมัคร"}
                onClick={handleRegister}
                disabled={!accepted || loading}
                variant="orange"
            />
            <SuccessPopup
                isOpen={showSuccess}
                title="สมัครสำเร็จ"
                message="คุณได้เป็น ESG Driver เรียบร้อยแล้ว"
                onConfirm={() => {
                    setShowSuccess(false);
                    navigate('/esg/driver');
                }}
            />
        </div>
    );
};

export default EsgRegister;
