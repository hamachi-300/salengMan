import styles from './ConfirmPopup.module.css';

interface ConfirmPopupProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string; // Optional custom color for confirm button
}

const ConfirmPopup: React.FC<ConfirmPopupProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    isLoading = false,
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmColor
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={isLoading ? undefined : onCancel}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <h3>{title}</h3>
                <p>{message}</p>
                <div className={styles.modalActions}>
                    <button
                        className={styles.cancelButton}
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={styles.confirmButton}
                        onClick={onConfirm}
                        disabled={isLoading}
                        style={confirmColor ? { backgroundColor: confirmColor } : undefined}
                    >
                        {isLoading ? "Processing..." : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmPopup;
