import styles from "./Notify.module.css";
import BottomNav from "../../components/BottomNav";
import PageHeader from "../../components/PageHeader";

function Notify() {
  // const navigate = useNavigate();

  return (
    <div className={styles.pageContainer}>
      <PageHeader title="Notifications" backTo="/home" />
      <div className={styles.content}>
        <p className={styles.placeholderText}>No new notifications</p>
      </div>
      <BottomNav />
    </div>
  );
}

export default Notify;
