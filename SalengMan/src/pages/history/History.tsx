import styles from "../sell/Sell.module.css";
import { useNavigate } from "react-router-dom";

function History() {
  const navigate = useNavigate();

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate("/home")}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h1 className={styles.pageTitle}>History</h1>
      </div>
      <div className={styles.pageContent}>
        <p className={styles.placeholderText}>Coming soon...</p>
      </div>
    </div>
  );
}

export default History;
