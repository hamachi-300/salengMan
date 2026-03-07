import styles from './AlertPopup.module.css';

interface AlertPopupProps {
    isOpen: boolean;
    title?: string;
    message: string | React.ReactNode;
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
                <h3 className={title === "Error" ? styles.errorTitle : undefined}>{title}</h3>
                <div className={styles.messageContainer}>{message}</div>
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
