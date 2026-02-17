import { useNavigate } from "react-router-dom";
import styles from "../sell/Sell.module.css";

function PostTrash() {
    const navigate = useNavigate();

    return (
        <div className={styles.postItemContainer}>
            <div className={styles.postHeader}>
                <button className={styles.backButton} onClick={() => navigate("/home")}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                </button>
                <h1 className={styles.headerTitle}>Post Trash</h1>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--color-text)' }}>
                <p className={styles.placeholderText}>Coming soon...</p>
            </div>
        </div>
    );
}

export default PostTrash;
