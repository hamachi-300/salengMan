import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Subscription.module.css";
import PageHeader from "../../components/PageHeader";
import PageFooter from "../../components/PageFooter";

type PackageType = "standard" | "enterprise" | null;

function Subscription() {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedPackage, setSelectedPackage] = useState<PackageType>(location.state?.subscriptionPackage || null);

    const handleSelectPackage = (pkg: PackageType) => {
        setSelectedPackage(pkg);
    };

    const handleFooterClick = () => {
        if (!selectedPackage) return;

        // Pass the selected package as state to the next page
        navigate("/esg/select-address", { state: { subscriptionPackage: selectedPackage } });
    };

    return (
        <div className={styles.container}>
            <PageHeader title="ESG Subscription" />

            <div className={styles.content}>
                <p className={styles.selectionSubtitle}>เลือก package ที่คุณต้องการสมัคร</p>
                {/* Standard Package */}
                <div
                    className={`${styles.packageCard} ${selectedPackage === "standard" ? styles.selected : ""}`}
                    onClick={() => handleSelectPackage("standard")}
                >
                    <div className={styles.cardContent}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.title}>Standard</h2>
                        </div>
                        <div className={styles.cardBody}>
                            <p className={styles.detailText}>ราคา 500 / ปี</p>
                            <p className={styles.detailText}>ปริมาณ 50 kg / ครั้ง</p>
                            <p className={styles.detailText}>4 ครั้ง ต่อ เดือน</p>
                        </div>
                    </div>
                    <div className={styles.radioWrapper}>
                        <div className={styles.radioCircle}>
                            <div className={styles.radioInner}></div>
                        </div>
                    </div>
                </div>

                {/* Enterprise Package */}
                <div
                    className={`${styles.packageCard} ${selectedPackage === "enterprise" ? styles.selected : ""}`}
                    onClick={() => handleSelectPackage("enterprise")}
                >
                    <div className={styles.cardContent}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.title}>Enterprise</h2>
                        </div>
                        <div className={styles.cardBody}>
                            <p className={styles.detailText}>ราคา 2000 / ปี</p>
                            <p className={styles.detailText}>ปริมาณ 200 kg / ครั้ง</p>
                            <p className={styles.detailText}>8 ครั้ง ต่อ เดือน</p>
                        </div>
                    </div>
                    <div className={styles.radioWrapper}>
                        <div className={styles.radioCircle}>
                            <div className={styles.radioInner}></div>
                        </div>
                    </div>
                </div>
            </div>

            <PageFooter
                title="เลือกที่อยู่"
                onClick={handleFooterClick}
                disabled={selectedPackage === null}
                variant="orange"
            />
        </div>
    );
}

export default Subscription;
