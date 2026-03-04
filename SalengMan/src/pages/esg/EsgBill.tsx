import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./EsgBill.module.css";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";
import { api } from "../../config/api";
import { getToken } from "../../services/auth";
import AlertPopup from "../../components/AlertPopup";
import SuccessPopup from "../../components/SuccessPopup";

function EsgBill() {
    const navigate = useNavigate();
    const location = useLocation();
    const token = getToken();

    const [loading, setLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; isError?: boolean }>({
        isOpen: false,
        title: "",
        message: "",
        isError: false,
    });
    const [showSuccess, setShowSuccess] = useState(false);

    // Data passed from previous flow steps
    const subscriptionPackage = location.state?.subscriptionPackage || "standard";
    const selectedAddress = location.state?.address;
    const selectedDates = location.state?.dates || [];

    // Base package data logic
    const isEnterprise = subscriptionPackage === "enterprise";
    const packageName = isEnterprise ? "Enterprise" : "Standard";
    const maxWeight = isEnterprise ? 200 : 50;
    const monthlyLimit = isEnterprise ? 8 : 4;
    const yearlySubscriptionCost = isEnterprise ? 2000 : 500;

    // Calculations
    const taxRate = 0.07;
    const taxAmount = yearlySubscriptionCost * taxRate;
    const totalAmount = yearlySubscriptionCost + taxAmount;

    const handleFooterClick = async () => {
        if (!token) {
            setAlertConfig({ isOpen: true, title: "Error", message: "ชำระเงินไม่สำเร็จ: กรุณาเข้าสู่ระบบก่อน", isError: true });
            return;
        }

        setLoading(true);

        const pickup_days_json = selectedDates.map((date: number) => ({
            date: date,
            have_driver: false,
            driver: []
        }));

        const payload = {
            address_id: selectedAddress?.id,
            package_name: subscriptionPackage,
            pickup_days: pickup_days_json,
            max_weight: maxWeight,
            time_per_month: monthlyLimit,
            cost: yearlySubscriptionCost,
            total_cost: totalAmount
        };

        try {
            await api.esgSubscribe(token, payload);
            setShowSuccess(true);
        } catch (error: any) {
            setAlertConfig({
                isOpen: true,
                title: "Failed",
                message: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
                isError: true
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <PageHeader
                title="Package Detail"
                onBack={() => navigate('/esg/select-date', { state: { subscriptionPackage, address: selectedAddress, dates: selectedDates } })}
            />

            <div className={styles.content}>
                <p className={styles.sectionSubtitle}>รายละเอียดการชำระเงิน</p>
                <div className={styles.billCard}>
                    {/* Package Info Section */}
                    <div className={styles.infoSection}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Package Name :</span>
                            <span className={styles.infoValue}>{packageName}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>รองรับการทิ้งขยะสูงสุด :</span>
                            <span className={styles.infoValue}>{maxWeight} kg ต่อครั้ง</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>เดือนนึงสามารถเรียกใช้ได้ :</span>
                            <span className={styles.infoValue}>{monthlyLimit} ครั้ง</span>
                        </div>
                    </div>

                    <div className={styles.divider}></div>

                    {/* Pricing Section */}
                    <div className={styles.pricingSection}>
                        <div className={styles.pricingRow}>
                            <span className={styles.pricingLabel}>yearly subscription</span>
                            <span className={styles.pricingValue}>{yearlySubscriptionCost} ฿</span>
                        </div>
                        <div className={styles.pricingRow}>
                            <span className={styles.pricingLabel}>ภาษี (7%)</span>
                            <span className={styles.pricingValue}>{taxAmount} ฿</span>
                        </div>
                        <div className={`${styles.pricingRow} ${styles.totalRow}`}>
                            <span className={styles.pricingLabel}>รวม</span>
                            <span className={styles.pricingValue}>{totalAmount} ฿</span>
                        </div>
                    </div>
                </div>
            </div>

            <PageFooter
                title={loading ? "กำลังดำเนินการ..." : "ชำระเงิน"}
                onClick={handleFooterClick}
                disabled={loading}
                variant="orange"
            />

            <AlertPopup
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />

            <SuccessPopup
                isOpen={showSuccess}
                title="Success"
                message="ชำระเงินสำเร็จและการสมัครของ ESG เสร็จสมบูรณ์แล้ว"
                confirmText="ไปที่หน้าจัดการขยะ"
                onConfirm={() => {
                    setShowSuccess(false);
                    navigate('/esg/trash');
                }}
            />
        </div>
    );
}

export default EsgBill;
