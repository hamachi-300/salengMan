import { useNavigate } from "react-router-dom";
import styles from "./SelectTrashMode.module.css";
import { useTrash } from "../../context/TrashContext";
import PageHeader from "../../components/PageHeader";

function SelectTrashMode() {
    const navigate = useNavigate();
    const { setMode } = useTrash();

    const handleSelectMode = (mode: 'anytime' | 'fixtime') => {
        setMode(mode);
        if (mode === 'anytime') {
            navigate('/trash/details');
        } else {
            // Fix time flow not fully specified yet, but we'll navigate to details for now
            navigate('/trash/details');
        }
    };

    return (
        <div className={styles.page}>
            <PageHeader title="Select Mode" backTo="/home" />

            <div className={styles.content}>
                <h2 className={styles.title}>Choose Disposing Mode</h2>

                {/* Anytime Card */}
                <div className={styles.card} onClick={() => handleSelectMode('anytime')}>
                    <div className={styles.cardInner}>
                        <div className={`${styles.icon} ${styles.iconAny}`}>🕒</div>
                        <div>
                            <div className={styles.cardTitle}>Anytime</div>
                            <div className={styles.cardDesc}>Dispose anytime — a driver will pick up when available.</div>
                        </div>
                    </div>
                </div>

                {/* Fix Time Card */}
                <div className={styles.card} onClick={() => handleSelectMode('fixtime')}>
                    <div className={styles.cardInner}>
                        <div className={`${styles.icon} ${styles.iconFix}`}>📅</div>
                        <div>
                            <div className={styles.cardTitle}>Schedule Pickup</div>
                            <div className={styles.cardDesc}>Choose a preferred date and time for pickup.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SelectTrashMode;
