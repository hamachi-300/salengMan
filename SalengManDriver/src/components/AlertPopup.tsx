import styles from './AlertPopup.module.css';

interface AlertPopupProps {
    isOpen: boolean;
    title?: string;
    message: string;
    onClose: () => void;
    buttonText?: string;
    buttonColor?: string;
}

const AlertPopup: React.FC<AlertPopupProps> = ({
    isOpen,
    title = "Notice",
    message,
    onClose,
    buttonText = "OK",
    buttonColor
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    {title === "Error" ? (
                        <svg viewBox="0 0 72 72" width="72" height="72">
                            <circle cx="36" cy="36" r="36" fill="#D32F2F" />
                            <path d="M24 24 L48 48 M48 24 L24 48" stroke="white" strokeWidth="7" strokeLinecap="round" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 72 72" width="72" height="72">
                            <circle cx="36" cy="36" r="36" fill="#4CAF50" />
                            <path d="M20 38 L30 48 L52 24" stroke="white" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
                <h3 className={title === "Error" ? styles.errorTitle : undefined}>{title}</h3>
                <p>{message}</p>
                <div className={styles.modalActions}>
                    <button
                        className={styles.okButton}
                        onClick={onClose}
                        style={buttonColor ? { backgroundColor: buttonColor } : undefined}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertPopup;
