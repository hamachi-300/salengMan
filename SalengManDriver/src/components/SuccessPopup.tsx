import styles from './SuccessPopup.module.css';

interface SuccessPopupProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    confirmText = "OK"
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.iconWrapper}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <h3>{title}</h3>
                <p>{message}</p>
                <button className={styles.confirmButton} onClick={onConfirm}>
                    {confirmText}
                </button>
            </div>
        </div>
    );
};

export default SuccessPopup;
