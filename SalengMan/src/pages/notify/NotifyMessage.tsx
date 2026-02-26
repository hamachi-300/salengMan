import { useLocation, useNavigate } from "react-router-dom";
import styles from "./NotifyMessage.module.css";
import PageHeader from "../../components/PageHeader";
import BottomNav from "../../components/BottomNav";

function NotifyMessage() {
    const location = useLocation();
    const navigate = useNavigate();
    const notification = location.state?.notification;

    if (!notification) {
        navigate("/notify");
        return null;
    }

    return (
        <div className={styles.pageContainer}>
            <PageHeader title="Message Detail" backTo="/notify" />

            <div className={styles.content}>
                <div className={styles.messageCard}>
                    <div className={styles.subjectSection}>
                        <div className={styles.iconWrapper}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h1 className={styles.messageTitle}>{notification.notify_header}</h1>
                    </div>

                    <div className={styles.bodySection}>
                        <p className={styles.messageBody}>
                            {notification.notify_content}
                        </p>
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}

export default NotifyMessage;
