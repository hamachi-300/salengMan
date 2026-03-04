import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./SelectEsgDate.module.css";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";

function SelectEsgDate() {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedDates, setSelectedDates] = useState<number[]>([]);

    const subscriptionPackage = location.state?.subscriptionPackage;
    const selectedAddress = location.state?.address;

    // Determine max selections based on package type
    const maxSelections = subscriptionPackage === 'enterprise' ? 8 : 4;

    const handleDateClick = (day: number) => {
        if (selectedDates.includes(day)) {
            // Deselect
            setSelectedDates(selectedDates.filter(d => d !== day));
        } else {
            // Select (if under limit)
            if (selectedDates.length < maxSelections) {
                setSelectedDates([...selectedDates, day]);
            }
        }
    };

    const handleFooterClick = () => {
        // Log to console for now, future point for payment flow
        console.log("Submitting ESG Subscription Data:", {
            package: subscriptionPackage,
            address: selectedAddress,
            dates: selectedDates
        });

        // Navigate to payment or success later
        // navigate('/esg/payment'); 
    };

    // Render 1-28 for dates of the month (exactly 4 weeks)
    const daysInMonth = Array.from({ length: 28 }, (_, i) => i + 1);

    return (
        <div className={styles.container}>
            <PageHeader
                title="Select ESG Dates"
                onBack={() => navigate('/esg/select-address', { state: { subscriptionPackage, address: selectedAddress } })}
            />

            <div className={styles.content}>
                <div className={styles.headerSection}>
                    <p className={styles.subtitle}>เลือกวันที่ต้องการเข้ารับขยะ</p>
                </div>

                <div className={styles.calendarGrid}>
                    {daysInMonth.map(day => (
                        <div
                            key={day}
                            className={`${styles.dateCell} ${selectedDates.includes(day) ? styles.selected : ''} ${!selectedDates.includes(day) && selectedDates.length >= maxSelections ? styles.disabled : ''}`}
                            onClick={() => {
                                if (!(!selectedDates.includes(day) && selectedDates.length >= maxSelections)) {
                                    handleDateClick(day);
                                }
                            }}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                <div className={styles.footerSection}>
                    <p className={styles.limitText}>
                        คุณเลือกได้สูงสุด: <span className={styles.highlight}>{maxSelections} วัน</span>
                        <br />
                        (เลือกแล้ว {selectedDates.length} วัน)
                    </p>
                </div>
            </div>

            <PageFooter
                title="ไปหน้าชำระเงิน"
                onClick={handleFooterClick}
                disabled={selectedDates.length === 0}
                variant="orange"
            />
        </div>
    );
}

export default SelectEsgDate;
