
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./BottomNav.module.css";

function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    return (
        <nav className={styles.bottomNav}>
            <div
                className={`${styles.navItem} ${isActive("/home") ? styles.active : ""}`}
                onClick={() => navigate("/home")}
            >
                <svg className={styles.navIcon} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                <span className={styles.navLabel}>Home</span>
            </div>

            <div
                className={`${styles.navItem} ${isActive("/history") ? styles.active : ""}`}
                onClick={() => navigate("/history")}
            >
                <svg className={styles.navIcon} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 14h-2v-4H9V9h4V5h2v4h4v4h-4v4z" />
                </svg>
                <span className={styles.navLabel}>History</span>
            </div>

            <div
                className={`${styles.navItem} ${isActive("/notify") ? styles.active : ""}`}
                onClick={() => navigate("/notify")}
            >
                <svg className={styles.navIcon} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                </svg>
                <span className={styles.navLabel}>Notify</span>
            </div>

            <div
                className={`${styles.navItem} ${isActive("/account") ? styles.active : ""}`}
                onClick={() => navigate("/account")}
            >
                <svg className={styles.navIcon} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span className={styles.navLabel}>Account</span>
            </div>
        </nav>
    );
}

export default BottomNav;
