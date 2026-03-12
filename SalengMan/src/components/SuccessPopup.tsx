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
                    <svg viewBox="0 0 72 72" width="72" height="72">
                        <circle cx="36" cy="36" r="36" fill="#4CAF50" />
                        <path d="M20 38 L30 48 L52 24" stroke="white" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
