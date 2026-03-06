import { useState } from 'react';
import styles from './ReviewPopup.module.css';

interface ReviewPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (score: number) => void;
    isLoading?: boolean;
    title?: string;
    message?: string;
}

function ReviewPopup({
    isOpen,
    onClose,
    onSubmit,
    isLoading = false,
    title = "Rate this User",
    message = "Please rate your experience with this transaction."
}: ReviewPopupProps) {
    const [hoverScore, setHoverScore] = useState(0);
    const [selectedScore, setSelectedScore] = useState(0);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (selectedScore > 0) {
            onSubmit(selectedScore);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.message}>{message}</p>

                <div className={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                            key={star}
                            className={`${styles.star} ${(hoverScore || selectedScore) >= star ? styles.active : ''}`}
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            onMouseEnter={() => setHoverScore(star)}
                            onMouseLeave={() => setHoverScore(0)}
                            onClick={() => setSelectedScore(star)}
                        >
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                    ))}
                </div>

                <div className={styles.scoreText}>
                    {selectedScore > 0 ? `${selectedScore} out of 5 stars` : 'Select a rating'}
                </div>

                <div className={styles.buttonGroup}>
                    <button
                        className={styles.cancelBtn}
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={isLoading || selectedScore === 0}
                    >
                        {isLoading ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ReviewPopup;
