import React, { useState } from 'react';
import styles from './RequestCancelPopup.module.css';

interface RequestCancelPopupProps {
    isOpen: boolean;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const RequestCancelPopup: React.FC<RequestCancelPopupProps> = ({
    isOpen,
    onConfirm,
    onCancel,
    isLoading = false
}) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (reason.trim()) {
            onConfirm(reason);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={isLoading ? undefined : onCancel}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <h3>Cancel Contact</h3>
                <p>
                    Are you sure you want to cancel this contact? This action cannot be undone and will remove the contact from your history.
                </p>
                <textarea
                    className={styles.textArea}
                    placeholder="Enter reason for cancellation..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={isLoading}
                />
                <div className={styles.modalActions}>
                    <button
                        className={styles.confirmButton}
                        onClick={handleConfirm}
                        disabled={isLoading || !reason.trim()}
                    >
                        {isLoading ? "Processing..." : "Yes, Cancel"}
                    </button>
                    <button
                        className={styles.cancelButton}
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        No, Keep
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RequestCancelPopup;
